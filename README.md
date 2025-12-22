# Protocolito

Privacy-first AI meeting assistant that captures, transcribes, and summarizes meetings locally.

## Features
- Local-first: recordings, transcripts, and summaries stay on your device
- Real-time transcription (local Whisper/Parakeet or API)
- AI summaries (local or API)
- Works with Zoom, Google Meet, Microsoft Teams, or offline audio
- macOS, Windows, Linux

## Downloads
Get the latest release from GitHub:
https://github.com/Zackriya-Solutions/meeting-minutes/releases/latest

- Windows: `.msi` (installer) or `.exe` (portable)
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`, or `.rpm`

## Build from source
```bash
cd frontend
pnpm install
pnpm tauri:build:cpu
```

## License
MIT
