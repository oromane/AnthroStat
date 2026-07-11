/**
 * AnthroStat — root layout
 * Author:  Oromane <https://github.com/oromane>
 * Repo:    https://github.com/oromane/AnthroStat
 * License: MIT
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "AnthroStat",
  title: "AnthroStat",
  description: "A minimalist desktop widget to monitor Claude web session usage limits.",
  authors: [{ name: "Oromane", url: "https://github.com/oromane" }],
  creator: "Oromane",
  keywords: ["AnthroStat", "Claude", "Anthropic", "usage monitor", "Tauri