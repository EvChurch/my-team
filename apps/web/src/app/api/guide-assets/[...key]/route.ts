import { NextResponse } from "next/server";
import { createPresignedGuideAssetReadUrl } from "@mt/api/storage";

type Props = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  if (!key.startsWith("guides/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await createPresignedGuideAssetReadUrl(key);
  return NextResponse.redirect(url);
}
