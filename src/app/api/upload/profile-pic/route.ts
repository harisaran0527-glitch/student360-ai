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
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return apiError("No profile photo file provided.", 400);
    }

    if (file.size === 0) {
      return apiError("Uploaded file is empty.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("Profile photo file size exceeds maximum allowable limit of 2 MB.", 400);
    }

    const rawExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return apiError("Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP images only.", 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError(`Invalid MIME type '${file.type}'. Allowed types: JPG, PNG, WEBP.`, 400);
    }

    // Process the upload via cloudStorage.ts helper
    const uploadResult = await uploadToCloudStorage(file, {
      folder: "avatars",
      allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
      maxSizeBytes: MAX_FILE_SIZE,
    });

    logApiPerf("POST /api/upload/profile-pic", startTime);

    return apiSuccess(
      {
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        uploadedAt: new Date().toISOString(),
      },
      "Profile photo uploaded successfully.",
      200
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to process profile photo upload", 500);
  }
}
