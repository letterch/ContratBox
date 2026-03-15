import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME ?? "contratbox-documents"
const explicitEndpoint = process.env.R2_ENDPOINT?.trim()

function normalizeEndpoint(value: string): string {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
}

const s3 =
  (explicitEndpoint || accountId) && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: explicitEndpoint
          ? normalizeEndpoint(explicitEndpoint)
          : `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
    : null

export function isStorageConfigured() {
  return !!s3
}

export async function uploadDocument(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; bucket: string }> {
  if (!s3) throw new Error("Stockage R2 non configuré")
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return { key, bucket: bucketName }
}

export async function getDocumentStream(key: string) {
  if (!s3) throw new Error("Stockage R2 non configuré")
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key })
  )
  return res.Body
}

export async function deleteDocument(key: string): Promise<void> {
  if (!s3) throw new Error("Stockage R2 non configuré")
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
}

/** Génère une clé unique pour un fichier (userId/contractId/filename) */
export function documentKey(userId: string, contractId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const timestamp = Date.now()
  return `${userId}/${contractId}/${timestamp}-${safe}`
}
