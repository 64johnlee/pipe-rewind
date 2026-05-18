"use client";

import { useState } from "react";
import { Search, Clock, MessageSquare, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { TimelineEntry, AppUsage, TimeBlock } from "@/lib/rewind";

const CATEGORY_COLORS: Record<string, string> = {
  coding: "bg-indigo-500",
  browser: "bg-amber-500",
  meetings: "bg-purple-500",
  communication: "bg-green-500",
  design: "bg-pink-500",
  docs: "bg-blue-500",
  entertainment: "bg-red-500",
  other: "bg-gray-500",
};

type Tab = "timeline" | "tracking" | "ask";

export default function Home() {
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  const [tab, setTab] = useState<Tab>("timeline");
  const [startTime, setStartTime] = useState(eightHoursAgo.toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(now.toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timeline state
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TimelineEntry[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Tracking state
  const [trackingData, setTrackingData] = useState<{
    byApp: AppUsage[];
    byHour: TimeBlock[];
    totalMinutes: number;
  } | null>(null);

  // Ask state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  async function loadTimeline() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          mode: "timeline",
        }),
      });
      const data = await res.json() as { entries?: TimelineEntry[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setEntries(data.entries ?? []);
      setSearchResults(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadTracking() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          mode: "tracking",
        }),
      });
      const data = await res.json() as typeof trackingData & { error?: string };
      if (!res.ok) throw new Error(data.error);
      setTrackingData(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      const data = await res.json() as { results?: TimelineEntry[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.results ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setSearching(false);
    }
  }

  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      const data = await res.json() as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      setAnswer(data.answer ?? "");
    } catch (e) {
      setError(String(e));
    } finally {
      setAsking(false);
    }
  }

  function handleLoad() {
    if (tab === "timeline") loadTimeline();
    else if (tab === "tracking") loadTracking();
  }

  const displayEntries = searchResults ?? entries;
  const maxMinutes = trackingData ? Math.max(...trackingData.byApp.map((a) => a.minutes), 1) : 1;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Rewind</h1>
            <p className="text-gray-400 text-sm">Search, track, and chat with your screen history</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
          {([
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "tracking", label: "Time Tracking", icon: Clock },
            { id: "ask", label: "Ask AI", icon: MessageSquare },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Time range */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            </div>
          </div>
          {tab !== "ask" && (
            <button onClick={handleLoad} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Loading…</> : <><RotateCcw className="w-4 h-4" />Load {tab === "tracking" ? "Tracking Data" : "Timeline"}</>}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex gap-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
          </div>
        )}

        {/* Timeline tab */}
        {tab === "timeline" && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search your screen history…"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500" />
              <button onClick={search} disabled={searching || !searchQuery.trim()}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-2.5 rounded-xl text-sm transition-colors">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
              {searchResults && (
                <button onClick={() => setSearchResults(null)}
                  className="text-xs text-gray-400 hover:text-white px-3 py-2.5 bg-gray-800 rounded-xl transition-colors">
                  Clear
                </button>
              )}
            </div>

            {searchResults && (
              <p className="text-xs text-gray-500">{searchResults.length} results for "{searchQuery}"</p>
            )}

            {displayEntries.length > 0 ? (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {displayEntries.map((entry, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-500 w-16">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-orange-400 truncate">{entry.appName}</span>
                        {entry.windowName && <span className="text-xs text-gray-600 truncate">— {entry.windowName}</span>}
                        {entry.type === "audio" && <span className="text-xs text-purple-400">🎙️</span>}
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500 text-sm">
                Load the timeline to see your screen history
              </div>
            )}
          </div>
        )}

        {/* Time tracking tab */}
        {tab === "tracking" && trackingData && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Total active time</p>
              <p className="text-2xl font-bold text-white">{Math.floor(trackingData.totalMinutes / 60)}h {trackingData.totalMinutes % 60}m</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-300 mb-3">App breakdown</p>
              <div className="space-y-3">
                {trackingData.byApp.slice(0, 10).map((app, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{app.appName}</span>
                      <span className="text-gray-500">{app.minutes}m</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${CATEGORY_COLORS[app.category] ?? "bg-gray-500"}`}
                        style={{ width: `${(app.minutes / maxMinutes) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1 text-xs text-gray-400">
                    <div className={`w-2 h-2 rounded-sm ${color}`} />{cat}
                  </div>
                ))}
              </div>
            </div>

            {trackingData.byHour.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Hourly activity</p>
                <div className="flex items-end gap-1 h-20">
                  {Array.from({ length: 24 }, (_, h) => {
                    const block = trackingData.byHour.find((b) => b.hour === h);
                    const maxH = Math.max(...trackingData.byHour.map((b) => b.totalMinutes), 1);
                    const height = block ? (block.totalMinutes / maxH) * 100 : 0;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-orange-600 rounded-sm transition-all"
                          style={{ height: `${height}%`, minHeight: height > 0 ? 2 : 0 }} />
                        {h % 4 === 0 && <span className="text-[9px] text-gray-600">{h}h</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ask AI tab */}
        {tab === "ask" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-400">Ask anything about what you were doing in the selected time range.</p>
              <div className="flex flex-col gap-2">
                {[
                  "What was I working on this morning?",
                  "Did I have any meetings today?",
                  "How much time did I spend on coding?",
                  "What websites did I visit?",
                ].map((q) => (
                  <button key={q} onClick={() => setQuestion(q)}
                    className="text-left text-xs text-gray-400 hover:text-orange-400 transition-colors">
                    → {q}
                  </button>
                ))}
              </div>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                rows={3} placeholder="Ask about your screen history…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500" />
              <button onClick={ask} disabled={asking || !question.trim()}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {asking ? <><Loader2 className="w-4 h-4 animate-spin" />Thinking…</> : <><MessageSquare className="w-4 h-4" />Ask</>}
              </button>
            </div>

            {answer && (
              <div className="bg-gray-900 border border-orange-900/50 rounded-xl p-4">
                <p className="text-xs text-orange-400 mb-2 font-medium">AI Answer</p>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">
          Snapshots every 30 min · Rewind.ai-inspired · All data stays local
        </p>
      </div>
    </main>
  );
}
