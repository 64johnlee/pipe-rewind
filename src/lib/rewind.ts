import { pipe } from "@screenpipe/js";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export type TimelineEntry = {
  timestamp: string;
  appName: string;
  windowName: string;
  text: string;
  type: "screen" | "audio";
  speaker?: string;
};

export type AppUsage = {
  appName: string;
  minutes: number;
  windowNames: string[];
  category: string;
};

export type TimeBlock = {
  hour: number;
  apps: AppUsage[];
  totalMinutes: number;
};

// Category map for common apps
const APP_CATEGORIES: Record<string, string> = {
  code: "coding", vscode: "coding", cursor: "coding", vim: "coding",
  terminal: "coding", iterm: "coding", "windows terminal": "coding",
  chrome: "browser", firefox: "browser", safari: "browser", edge: "browser",
  zoom: "meetings", teams: "meetings", meet: "meetings", slack: "communication",
  discord: "communication", telegram: "communication", whatsapp: "communication",
  figma: "design", sketch: "design", photoshop: "design",
  word: "docs", excel: "docs", notion: "docs", obsidian: "docs",
  youtube: "entertainment", spotify: "entertainment", netflix: "entertainment",
};

function categorizeApp(appName: string): string {
  const lower = appName.toLowerCase();
  for (const [key, category] of Object.entries(APP_CATEGORIES)) {
    if (lower.includes(key)) return category;
  }
  return "other";
}

// Fetch timeline entries for a given period
export async function fetchTimeline(
  startTime: string,
  endTime: string,
  limit = 200
): Promise<TimelineEntry[]> {
  const [screenData, audioData] = await Promise.all([
    pipe.queryScreenpipe({ startTime, endTime, limit, contentType: "ocr" }),
    pipe.queryScreenpipe({ startTime, endTime, limit: 100, contentType: "audio" }),
  ]);

  const entries: TimelineEntry[] = [];

  for (const item of screenData?.data ?? []) {
    if (item.type !== "OCR") continue;
    if (!item.content.text?.trim()) continue;
    entries.push({
      timestamp: item.content.timestamp,
      appName: item.content.appName ?? "Unknown",
      windowName: item.content.windowName ?? "",
      text: item.content.text.trim(),
      type: "screen",
    });
  }

  for (const item of audioData?.data ?? []) {
    if (item.type !== "Audio") continue;
    if (!item.content.transcription?.trim()) continue;
    entries.push({
      timestamp: item.content.timestamp,
      appName: item.content.appName ?? "Microphone",
      windowName: "",
      text: item.content.transcription.trim(),
      type: "audio",
      speaker: item.content.speaker ?? undefined,
    });
  }

  // Sort by timestamp
  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Calculate time tracking data from timeline entries
export async function calculateTimeTracking(
  startTime: string,
  endTime: string
): Promise<{ byApp: AppUsage[]; byHour: TimeBlock[]; totalMinutes: number }> {
  const screenData = await pipe.queryScreenpipe({
    startTime,
    endTime,
    limit: 500,
    contentType: "ocr",
  });

  const appMinutes = new Map<string, { minutes: number; windows: Set<string> }>();
  const hourBlocks = new Map<number, Map<string, number>>();

  for (const item of screenData?.data ?? []) {
    if (item.type !== "OCR") continue;
    const appName = item.content.appName ?? "Unknown";
    const windowName = item.content.windowName ?? "";
    const hour = new Date(item.content.timestamp).getHours();

    // Each OCR entry ≈ ~1 minute of activity (screenpipe captures every ~60s)
    if (!appMinutes.has(appName)) {
      appMinutes.set(appName, { minutes: 0, windows: new Set() });
    }
    const entry = appMinutes.get(appName)!;
    entry.minutes += 1;
    if (windowName) entry.windows.add(windowName);

    // Hour tracking
    if (!hourBlocks.has(hour)) hourBlocks.set(hour, new Map());
    const hourMap = hourBlocks.get(hour)!;
    hourMap.set(appName, (hourMap.get(appName) ?? 0) + 1);
  }

  const byApp: AppUsage[] = Array.from(appMinutes.entries())
    .map(([appName, data]) => ({
      appName,
      minutes: data.minutes,
      windowNames: Array.from(data.windows).slice(0, 5),
      category: categorizeApp(appName),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const byHour: TimeBlock[] = Array.from(hourBlocks.entries())
    .map(([hour, apps]) => ({
      hour,
      apps: Array.from(apps.entries()).map(([appName, minutes]) => ({
        appName,
        minutes,
        windowNames: [],
        category: categorizeApp(appName),
      })),
      totalMinutes: Array.from(apps.values()).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.hour - b.hour);

  const totalMinutes = byApp.reduce((sum, a) => sum + a.minutes, 0);

  return { byApp, byHour, totalMinutes };
}

// Keyword search across screen history
export async function searchHistory(
  query: string,
  startTime: string,
  endTime: string
): Promise<TimelineEntry[]> {
  const data = await pipe.queryScreenpipe({
    startTime,
    endTime,
    limit: 200,
    contentType: "ocr",
    q: query,
  });

  return (data?.data ?? [])
    .filter((item): item is typeof item & { type: "OCR" } => item.type === "OCR")
    .filter((item) => item.content.text?.trim())
    .map((item) => ({
      timestamp: item.content.timestamp,
      appName: item.content.appName ?? "Unknown",
      windowName: item.content.windowName ?? "",
      text: item.content.text!.trim(),
      type: "screen" as const,
    }));
}

// AI chat over screen history
export async function askAboutHistory(
  question: string,
  startTime: string,
  endTime: string
): Promise<string> {
  const entries = await fetchTimeline(startTime, endTime, 150);

  if (entries.length === 0) {
    return "No screen activity found for this time period. Make sure screenpipe is running.";
  }

  const context = entries
    .map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.type === "audio" ? "🎙️" : "💻"} ${e.appName}${e.windowName ? ` — ${e.windowName}` : ""}: ${e.text.slice(0, 200)}`)
    .join("\n")
    .slice(0, 10000);

  const settings = await pipe.settings.getAll();
  const aiModel = settings?.aiModel ?? "gpt-4o-mini";
  const openaiKey = settings?.openaiApiKey ?? process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error("No OpenAI API key. Please add it in screenpipe settings.");
  }

  const openai = createOpenAI({ apiKey: openaiKey });

  const { text } = await generateText({
    model: openai(aiModel),
    prompt: `You are a helpful AI assistant with access to the user's screen history. Answer their question based on what they've been doing on their computer.

Time period: ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}

Screen & audio history:
${context}

User question: ${question}

Answer concisely and specifically based on the screen history. If you can't find relevant information, say so.`,
  });

  return text.trim();
}
