import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME ?? "contratbox-documents"
const explicitEndpoint = process.env.R2_ENDPOINT?.trim()

function normalizeEndpoint(value: string): string {
  const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized
}

const fallbackEndpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined
const candidateEndpoints = Array.from(
  new Set([explicitEndpoint ? normalizeEndpoint(explicitEndpoint) : undefined, fallbackEndpoint].filter(Boolean))
) as string[]

function createS3Client(endpoint: string) {
  return new S3Client({
    region: "auto",
    endpoint,
    // Cloudflare R2 is more reliable with path-style addressing.
    forcePathStyle: true,
    maxAttempts: 2,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  })
}

const s3Clients =
  candidateEndpoints.length > 0 && accessKeyId && secretAccessKey
    ? candidateEndpoints.map((endpoint) => ({ endpoint, client: createS3Client(endpoint) }))
    : []

export function isStorageConfigured() {
  return s3Clients.length > 0
}

export async function uploadDocument(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; bucket: string }> {
  if (s3Clients.length === 0) throw new Error("Stockage R2 non configuré")
  let lastError: unknown = null
  for (const { client } of s3Clients) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        )
        return { key, bucket: bucketName }
      } catch (err) {
        lastError = err
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload R2 échoué")
}

export async function getDocumentStream(key: string) {
  if (s3Clients.length === 0) throw new Error("Stockage R2 non configuré")
  let lastError: unknown = null
  for (const { client } of s3Clients) {
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key })
      )
      return res.Body
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Lecture R2 échouée")
}

export async function deleteDocument(key: string): Promise<void> {
  if (s3Clients.length === 0) throw new Error("Stockage R2 non configuré")
  let lastError: unknown = null
  for (const { client } of s3Clients) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
      return
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Suppression R2 échouée")
}

/** Génère une clé unique pour un fichier (userId/contractId/filename) */
export function documentKey(userId: string, contractId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const timestamp = Date.now()
  return `${userId}/${contractId}/${timestamp}-${safe}`
}

export function getStorageDebugConfig() {
  return {
    endpoint: candidateEndpoints[0] ?? "undefined",
    endpointsTried: candidateEndpoints,
    bucket: bucketName,
    configured: s3Clients.length > 0,
  }
}
