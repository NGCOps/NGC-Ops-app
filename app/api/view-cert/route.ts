import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.includes("blob.vercel-storage.com")) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!res.ok) return new NextResponse("Not found", { status: 404 });

  const contentType = res.headers.get("Content-Type") || "application/octet-stream";
  const blob = await res.blob();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
