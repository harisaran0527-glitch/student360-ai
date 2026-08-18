import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToCloudStorage } from "@/lib/cloudStorage";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Allowed File Extensions & MIME Validation
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, PNG, JPG, and WEBP documents are allowed." },
        { status: 400 }
      );
    }

    // Process the upload via cloudStorage.ts helper (using "syllabus" folder)
    const uploadResult = await uploadToCloudStorage(file, {
      folder: "syllabus",
      maxSizeBytes: 10 * 1024 * 1024,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.fileName,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
