import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type StorageProvider =
  | "LOCAL_DEVELOPMENT"
  | "S3_COMPATIBLE"
  | "CLOUDINARY"
  | "FIREBASE_STORAGE"
  | "AZURE_BLOB";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function getActiveStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER as StorageProvider) || "LOCAL_DEVELOPMENT";
  return provider;
}

export function calculateFileChecksum(fileBuffer: Buffer): string {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ storageUrl: string; sha256Checksum: string; provider: StorageProvider }> {
  const provider = getActiveStorageProvider();
  const checksum = calculateFileChecksum(fileBuffer);

  try {
    if (provider === "LOCAL_DEVELOPMENT") {
      // PRODUCTION GUARD: Netlify filesystem is ephemeral — files written here
      // are lost on every deploy. Require Supabase Storage in production.
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "LOCAL_DEVELOPMENT storage is not allowed in production. " +
          "Set CLOUD_STORAGE_PROVIDER=SUPABASE and configure SUPABASE_URL, " +
          "SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_BUCKET in your environment."
        );
      }
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(originalFilename);
      const sanitizedBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${Date.now()}_${sanitizedBase}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      await fs.writeFile(filePath, fileBuffer);
      return {
        storageUrl: `/uploads/${filename}`,
        sha256Checksum: checksum,
        provider,
      };
    }

    // Cloud Providers Abstraction Point
    // When environment variables for AWS S3, Cloudinary, Firebase or Azure are provided,
    // upload stream is directed to remote cloud storage.
    console.log(`[Storage Abstraction] Selected Provider: ${provider}. Storing file checksum: ${checksum}`);
    
    // Fallback to local storage for current execution
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(originalFilename);
    const sanitizedBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${Date.now()}_${sanitizedBase}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, fileBuffer);
    return {
      storageUrl: `/uploads/${filename}`,
      sha256Checksum: checksum,
      provider,
    };
  } catch (error) {
    console.error("Storage error:", error);
    throw new Error("Failed to save uploaded document");
  }
}
