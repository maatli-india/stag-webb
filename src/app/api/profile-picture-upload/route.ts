import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-dev.stag.org.in/stag/v1").replace(/\/$/, "");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadUrlResponse = {
  uploadUrl?: string;
  url?: string;
  presignedUrl?: string;
  fileId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = String(formData.get("userId") || "");

    if (!(file instanceof File) || !userId) {
      return NextResponse.json({ message: "A profile picture and user ID are required." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Choose a JPG, PNG, or WebP image." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Profile pictures must be smaller than 10 MB." }, { status: 400 });
    }

    const uploadUrlResponse = await fetch(`${API_BASE_URL}/file/upload-url?fileType=profile_pic&fileContentType=${encodeURIComponent(file.type)}&userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const uploadMeta = await readJson<UploadUrlResponse>(uploadUrlResponse);
    if (!uploadUrlResponse.ok) {
      return NextResponse.json({ message: getMessage(uploadMeta, "Could not prepare the profile picture upload.") }, { status: uploadUrlResponse.status });
    }

    const uploadUrl = uploadMeta.uploadUrl || uploadMeta.url || uploadMeta.presignedUrl;
    if (!uploadUrl || !uploadMeta.fileId) {
      return NextResponse.json({ message: "The upload service returned an incomplete response." }, { status: 502 });
    }

    const s3Response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!s3Response.ok) {
      return NextResponse.json({ message: "The image could not be uploaded to storage." }, { status: 502 });
    }

    return NextResponse.json({ fileId: uploadMeta.fileId });
  } catch {
    return NextResponse.json({ message: "We could not upload your profile picture. Please try again." }, { status: 500 });
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return {} as T;
  }
}

function getMessage(value: unknown, fallback: string) {
  const payload = value as { message?: string; error?: string };
  return payload?.message || payload?.error || fallback;
}
