import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";
import { uploadToCloudStorage } from "@/lib/cloudStorage";
import path from "path";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return apiError("No certificate photo or document file provided.", 400);
    }

    if (file.size === 0) {
      return apiError("Uploaded file is empty.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("File size exceeds maximum allowable limit of 10 MB.", 400);
    }

    const rawExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return apiError("Unsupported file format. Please upload JPG, JPEG, PNG, WEBP, or PDF files only.", 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError(`Invalid MIME type '${file.type}'. Allowed types: JPG, PNG, WEBP, PDF.`, 400);
    }

    // Process the upload via cloudStorage.ts helper
    const uploadResult = await uploadToCloudStorage(file, {
      folder: "certificates",
      allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
      maxSizeBytes: MAX_FILE_SIZE,
    });

    logApiPerf("POST /api/upload/certificate", startTime);

    return apiSuccess(
      {
        documentUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        uploadedAt: new Date().toISOString(),
      },
      "Certificate document uploaded successfully.",
      200
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to process certificate file upload", 500);
  }
}
