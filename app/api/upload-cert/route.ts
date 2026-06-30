import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const certId = form.get("certId") as string | null;

  if (!file || !certId) {
    return NextResponse.json({ error: "file and certId are required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "pdf";
  const blob = await put(`certs/${certId}.${ext}`, file, {
    access: "private",
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ url: blob.url });
}
