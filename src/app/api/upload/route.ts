import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToCloudStorage } from "@/lib/cloudStorage";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Allowed File Extensions: .pdf, .doc, .docx
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = [".pdf", ".doc", ".docx"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension '${ext}'. Only .pdf, .doc, and .docx documents are allowed.` },
        { status: 400 }
      );
    }

    const uploadResult = await uploadToCloudStorage(file, {
      folder: "syllabus",
      allowedExtensions: allowedExts,
      maxSizeBytes: 10 * 1024 * 1024,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: file.name,
    });
  } catch (error: any) {
    console.error("[POST /api/upload Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
