# ClaudeMon

A minimalist, cross-platform desktop widget to monitor Claude web session usage limits.

## Warning : Unofficial API
This project relies on session cookie extraction to query undocumented internal endpoints. It is inherently unstable and will require manual cookie renewal when tokens expire or are revoked by security protocols.

## Architecture
The project is divided into two parts:
1. **Backend (Data Extraction) :** A Dockerized n8n workflow that manages HTTP requests and error handling, exposing a local JSON Webhook.
2. **Frontend (UI) :** A desktop client displaying the usage gauge and connection status.

## Features
* Live usage progress bar and message limit tracking.
* Compact and Collapsible UI modes.
* Dynamic color alerts based on custom thresholds (e.g., switches to red at 80% usage).
* Internationalization (EN, FR, ES, PT, RU).
* Always-on-top window support.

## Installation

### Prerequisites
* Docker and Docker Compose.
* Your Claude `sessionKey` cookie.

### Backend Setup
1. Clone the repository: `git clone https://github.com/oromane/claudemon.git`
2. Create a `.env` file at the root and add your key: `CLAUDE_SESSION_KEY=your_cookie_value`
3. Run the extraction service: `docker compose up -d`

## Configuration
Edit the `config.json` file to customize warning thresholds, language, and date formats.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
