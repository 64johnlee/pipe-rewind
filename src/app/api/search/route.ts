import { NextResponse } from "next/server";
import { searchHistory } from "@/lib/rewind";

export async function POST(request: Request) {
  try {
    const { query, startTime, endTime } = await request.json() as {
      query: string;
      startTime: string;
      endTime: string;
    };
    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    const results = await searchHistory(query, startTime, endTime);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
