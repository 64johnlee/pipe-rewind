import { NextResponse } from "next/server";
import { askAboutHistory } from "@/lib/rewind";

export async function POST(request: Request) {
  try {
    const { question, startTime, endTime } = await request.json() as {
      question: string;
      startTime: string;
      endTime: string;
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    const answer = await askAboutHistory(question, startTime, endTime);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
