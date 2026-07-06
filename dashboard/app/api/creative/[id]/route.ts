import { NextResponse } from "next/server";
import { getAdById } from "@/lib/services/creative.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing creative ID" }, { status: 400 });
  }

  const creative = await getAdById(id);
  if (!creative) {
    return NextResponse.json({ error: "Creative not found" }, { status: 404 });
  }

  return NextResponse.json(creative);
}
