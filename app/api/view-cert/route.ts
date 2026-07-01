import { head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.includes("blob.vercel-storage.com")) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const blob = await head(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return NextResponse.redirect(blob.downloadUrl);
  } catch (e) {
    console.error("Blob view error:", e);
    return new NextResponse("Not found", { status: 404 });
  }
}
