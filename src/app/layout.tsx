import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rewind | screenpipe",
  description: "Search, time-track, and chat with your screen history",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
