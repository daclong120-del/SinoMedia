import { NextResponse } from "next/server";
import { getAdvertiserById } from "@/lib/services/creative.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing advertiser ID" }, { status: 400 });
  }

  const result = await getAdvertiserById(id);
  if (!result) {
    return NextResponse.json({ error: "Advertiser not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
