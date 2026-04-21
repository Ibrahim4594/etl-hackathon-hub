// TODO: Add rate limiting (@upstash/ratelimit) — currently unprotected
import { serverAuth } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { apiError } from "@/lib/api-error";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed: PNG, JPEG, WebP, GIF, PDF, DOCX, PPTX, XLSX, ZIP`,
        },
        { status: 400 }
      );
    }

    // Validate size (images 2MB, documents 10MB)
    const isImage = IMAGE_TYPES.includes(file.type);
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    const maxLabel = isImage ? "2MB" : "10MB";
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${maxLabel}`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename with subfolder by kind
    const ext = file.name.split(".").pop() || "bin";
    const kind = isImage ? "images" : "documents";
    const uniqueName = `${kind}/${crypto.randomBytes(8).toString("hex")}-${Date.now()}.${ext}`;

    // Upload to Vercel Blob (persistent, CDN-backed storage)
    const blob = await put(uniqueName, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return apiError(error, "Failed to upload file");
  }
}
