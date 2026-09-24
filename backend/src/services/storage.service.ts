import fs from 'fs';
import path from 'path';

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

export const useBlobStorage = !!process.env.BLOB_READ_WRITE_TOKEN;

export function ensureLocalUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export const localUploadDir = uploadDir;

/**
 * Moves a temp-staged file (multer writes to os.tmpdir() so this works
 * identically on Vercel's writable /tmp and locally) into permanent storage.
 * In production (BLOB_READ_WRITE_TOKEN set) that's Vercel Blob; locally it's
 * backend/uploads/, preserving the exact pre-migration behavior.
 */
export async function persistFile(
  tmpFilePath: string,
  storageFilename: string,
  mimetype: string
): Promise<{ filePath: string; publicUrl: string }> {
  if (useBlobStorage) {
    const { put } = await import('@vercel/blob');
    const buffer = fs.readFileSync(tmpFilePath);
    const blob = await put(storageFilename, buffer, {
      access: 'public',
      contentType: mimetype,
    });
    fs.unlink(tmpFilePath, () => {});
    return { filePath: blob.url, publicUrl: blob.url };
  }

  if (process.env.VERCEL) {
    // Deployed without BLOB_READ_WRITE_TOKEN configured yet — the local-disk
    // fallback below would crash trying to write to a read-only filesystem.
    // Fail this one request clearly rather than let the underlying ENOENT
    // propagate as an opaque 500.
    throw new Error(
      'File storage is not configured for this deployment yet (BLOB_READ_WRITE_TOKEN missing). Screenshot upload is unavailable until Vercel Blob is connected.'
    );
  }

  ensureLocalUploadDir();
  const destination = path.join(uploadDir, storageFilename);
  fs.copyFileSync(tmpFilePath, destination);
  fs.unlink(tmpFilePath, () => {});
  return { filePath: storageFilename, publicUrl: `/uploads/${storageFilename}` };
}

/** Resolves a stored Screenshot.filePath (either a full Blob URL or a local filename) to a servable URL. */
export function getPublicUrl(filePath: string): string {
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `/uploads/${filePath}`;
}
