# AnthroStat

A sleek, minimalist, cross-platform desktop widget to monitor your Claude AI session usage limits. 
Designed for power users who need to keep an eye on their Claude Pro limits without switching tabs.

## Features
- **Live Usage Tracking:** Real-time progress bar of your message limits.
- **Historical Data:** Visual area chart of your usage history.
- **Customizable:** Multi-language (EN, FR, ES, PT, RU), adjustable alert thresholds, and 12/24h time formats.
- **Compact Mode:** A beautiful ultra-minimalist mode that sits quietly on your screen.
- **Always on Top:** Never lose track of your limits.

## How it works
This app runs completely locally using **Tauri** (Rust + Next.js). It leverages your Claude `sessionKey` cookie to directly ping Anthropic's private usage API without passing through any external servers.

> **Note on Unofficial API**: This tool uses an undocumented endpoint. It is inherently unstable and requires you to manually supply your `sessionKey` cookie. If Anthropic changes their API, the widget might need an update.

## Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development environment: `npm run tauri dev`
4. Build for production: `npm run tauri build`

## Configuration
Upon first launch, click the Gear icon and paste your `sessionKey` (which you can find by inspecting your cookies on claude.ai).

## License
MIT License.
