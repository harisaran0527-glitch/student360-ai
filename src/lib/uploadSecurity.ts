import crypto from "crypto";
import path from "path";

const DISALLOWED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".js",
  ".vbs",
  ".jar",
  ".py",
  ".pl",
  ".cgi",
  ".scr",
  ".dll",
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  storageFilename?: string;
  fileExtension?: string;
}

export function validateUploadFile(
  originalFilename: string,
  mimeType: string,
  sizeBytes: number,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10 MB
): FileValidationResult {
  if (!originalFilename || typeof originalFilename !== "string") {
    return { valid: false, error: "Invalid filename provided" };
  }

  // 1. File Size Check
  if (sizeBytes > maxSizeBytes) {
    return { valid: false, error: `File size exceeds maximum limit of ${maxSizeBytes / (1024 * 1024)}MB` };
  }

  // 2. Path Traversal Defense
  const baseName = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(baseName).toLowerCase();

  // 3. Disallowed Extension Check
  if (DISALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Executable or unsafe file extension (${ext}) is blocked` };
  }

  // 4. Allowed MIME Type Check
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: `File type (${mimeType}) is not permitted` };
  }

  // 5. Generate Random Storage Name
  const randomId = crypto.randomUUID();
  const storageFilename = `${randomId}${ext}`;

  return {
    valid: true,
    sanitizedFilename: baseName,
    storageFilename,
    fileExtension: ext,
  };
}
