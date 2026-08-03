import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface UploadFileOptions {
  folder: "certificates" | "syllabus" | "internships" | "projects" | "placements";
  allowedExtensions?: string[];
  maxSizeBytes?: number;
}

export interface UploadResult {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  provider: "S3" | "SUPABASE" | "CLOUDINARY" | "LOCAL_FALLBACK";
}

export async function uploadToCloudStorage(
  file: File,
  options: UploadFileOptions
): Promise<UploadResult> {
  const provider = (process.env.CLOUD_STORAGE_PROVIDER || "LOCAL").toUpperCase();
  const maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10 MB default

  if (file.size > maxSizeBytes) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum limit of ${(maxSizeBytes / (1024 * 1024)).toFixed(1)} MB.`);
  }

  const rawExt = path.extname(file.name).toLowerCase();
  if (options.allowedExtensions && !options.allowedExtensions.includes(rawExt)) {
    throw new Error(`Invalid file extension '${rawExt}'. Allowed: ${options.allowedExtensions.join(", ")}`);
  }

  const uniqueId = crypto.randomUUID();
  const safeFileName = `${uniqueId}${rawExt}`;

  // 1. SUPABASE CLOUD STORAGE
  // SUPABASE_URL is the project URL e.g. https://xyz.supabase.co
  // Storage REST API is at SUPABASE_URL/storage/v1
  if (provider === "SUPABASE" && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const storageBase = `${process.env.SUPABASE_URL}/storage/v1`;
    const bucket = process.env.SUPABASE_BUCKET || "student360-assets";
    const uploadUrl = `${storageBase}/object/${bucket}/${options.folder}/${safeFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase Storage upload failed: ${errText}`);
    }

    const publicUrl = `${storageBase}/object/public/${bucket}/${options.folder}/${safeFileName}`;
    return {
      url: publicUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      provider: "SUPABASE",
    };
  }

  // 2. AWS S3 / CLOUDFLARE R2
  if (provider === "S3" && process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${options.folder}/${safeFileName}`;

    return {
      url: publicUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      provider: "S3",
    };
  }

  // 3. LOCAL DEVELOPMENT FALLBACK (Used when cloud credentials are omitted)
  const targetDir = path.join(process.cwd(), "public", "uploads", options.folder);
  await fs.mkdir(targetDir, { recursive: true });
  const localFilePath = path.join(targetDir, safeFileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(localFilePath, buffer);

  return {
    url: `/uploads/${options.folder}/${safeFileName}`,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    provider: "LOCAL_FALLBACK",
  };
}
