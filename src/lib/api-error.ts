import { NextResponse } from "next/server";

export function apiError(err: unknown, fallback: string, status = 500) {
  console.error(fallback, err);
  return NextResponse.json({ error: fallback }, { status });
}
