// TODO: Add rate limiting (@upstash/ratelimit) — currently unprotected
import { serverAuth } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
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

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const uniqueName = `${crypto.randomBytes(8).toString("hex")}-${Date.now()}.${ext}`;

    // TODO: migrate to Azure Blob Storage
    const uploadsDir = path.join("/tmp", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, uniqueName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${uniqueName}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return apiError(error, "Failed to upload file");
  }
}
