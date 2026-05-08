import { NextResponse } from "next/server"
import { findUserByInboundEmail } from "@/lib/services/inbound-email"
import { prisma } from "@/lib/db"
import { uploadDocument, billObjectKey } from "@/lib/services/storage"
import { extractTextFromFile } from "@/lib/services/ocr"
import { extractBillData } from "@/lib/services/bill-extraction"
import { createBill } from "@/lib/services/bills"
import { getAccessContextForUser, accessCanAddBill, accessCanUseModule } from "@/lib/services/access-context"
import { syncBillRemindersForHousehold } from "@/lib/services/reminder-sync"
import type { Prisma } from "@prisma/client"

/**
 * Webhook de réception d'email — STUB générique.
 *
 * Activation future : configurer un fournisseur d'email entrant (Resend Inbound, Postmark Inbound,
 * SendGrid Inbound Parse) qui POSTe vers cette route. Le contrat de payload supporté ici est
 * volontairement simple :
 *
 *   {
 *     "to": "factures+<token>@bills.contratbox.ch",
 *     "from": "no-reply@swisscom.ch",
 *     "subject": "Votre facture mars",
 *     "attachments": [
 *       { "filename": "invoice.pdf", "contentType": "application/pdf", "contentBase64": "..." }
 *     ]
 *   }
 *
 * Sécurité : un secret partagé est exigé via en-tête `x-inbound-secret` (env INBOUND_EMAIL_SECRET).
 *
 * En l'absence de configuration, retourne 503 — sans planter.
 */

type InboundPayload = {
  to?: string
  from?: string
  subject?: string
  attachments?: Array<{ filename: string; contentType?: string; contentBase64: string }>
}

export async function POST(req: Request) {
  const expected = process.env.INBOUND_EMAIL_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: "INBOUND_EMAIL_SECRET non configuré — webhook désactivé." },
      { status: 503 }
    )
  }
  const got = req.headers.get("x-inbound-secret")
  if (got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: InboundPayload
  try {
    body = (await req.json()) as InboundPayload
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const to = body.to?.trim()
  if (!to) return NextResponse.json({ error: "Champ 'to' manquant" }, { status: 400 })
  const user = await findUserByInboundEmail(to)
  if (!user) {
    return NextResponse.json({ error: "Adresse inconnue" }, { status: 404 })
  }
  const access = await getAccessContextForUser(user.id, null)
  if (!access || !access.household) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 404 })
  }
  if (!accessCanUseModule(access, "module_bills") || !accessCanAddBill(access)) {
    return NextResponse.json(
      { error: "Quota factures atteint", code: "bill_quota_exceeded" },
      { status: 402 }
    )
  }

  const attachments = (body.attachments ?? []).filter((a) => a.contentBase64 && a.filename)
  if (attachments.length === 0) {
    return NextResponse.json({ error: "Aucune pièce jointe exploitable" }, { status: 400 })
  }

  let createdCount = 0
  for (const a of attachments) {
    const buffer = Buffer.from(a.contentBase64, "base64")
    if (buffer.length === 0) continue
    const mimeType = a.contentType || "application/pdf"

    const { text: extractedText, meta: textExtractionMeta } = await extractTextFromFile(buffer, mimeType)
    const extraction = await extractBillData(extractedText || "")

    const r2Key = billObjectKey(user.id, a.filename)
    try {
      await uploadDocument(r2Key, buffer, mimeType)
    } catch (err) {
      console.error("[inbound-email] upload R2 fail", err)
      continue
    }

    const issue = extraction.issueDate ? new Date(extraction.issueDate) : null
    const due = extraction.dueDate ? new Date(extraction.dueDate) : null
    const fallbackTitle = body.subject?.slice(0, 120) || extraction.provider || a.filename

    const bill = await createBill({
      householdId: access.household.id,
      userId: user.id,
      title: fallbackTitle,
      provider: extraction.provider ?? body.from ?? null,
      category: extraction.category ?? null,
      invoiceNumber: extraction.invoiceNumber ?? null,
      reference: extraction.reference ?? null,
      amount: extraction.amount ?? 0,
      currency: extraction.currency ?? "CHF",
      issueDate: issue && !Number.isNaN(issue.getTime()) ? issue : null,
      dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
      recurrence: (extraction.recurrence as never) ?? "one_off",
      source: "email",
      extractedText: extractedText || null,
      extractionConfidence: extraction.confidenceScore ?? null,
      rawExtraction: JSON.parse(JSON.stringify(extraction)) as Prisma.InputJsonValue,
      textExtractionMeta: textExtractionMeta
        ? (JSON.parse(JSON.stringify(textExtractionMeta)) as Prisma.InputJsonValue)
        : undefined,
    })

    await prisma.billDocument.create({
      data: {
        billId: bill.id,
        name: a.filename,
        mimeType,
        sizeBytes: buffer.length,
        r2Key,
        extractedText: extractedText || null,
        textExtractionMeta: textExtractionMeta
          ? (JSON.parse(JSON.stringify(textExtractionMeta)) as Prisma.InputJsonValue)
          : undefined,
      },
    })
    createdCount++
  }

  if (createdCount > 0) {
    await syncBillRemindersForHousehold(access.household.id).catch(() => null)
  }

  return NextResponse.json({ ok: true, createdBills: createdCount })
}
