# AI_DnD_Assistante-

AI D&D assistant.

## ADA Voice Capture (Speech → Text)

The first feature in this project is a lightweight speech-to-text capture UI, intended as the front door for ADA's narrative-to-mechanics pipeline.

### What it does

- Records from your microphone using the browser's speech recognition API (Chrome/Edge)
- Streams recognized speech into a live-updating text area
- Lets you start/stop capture without any menus or complex flows

This gives you a quick way to dictate rough gameplay notes that future components can turn into polished narrative or mechanics-ready data.

### Files

- `index.html` – Main page and UI shell
- `style.css` – Minimal styling for a clean, dark ADA-themed interface
- `speech.js` – All client-side logic for speech recognition and transcript handling

### How to run

1. Open `index.html` in a modern Chromium-based browser (Chrome or Edge recommended).
2. When prompted, allow microphone access.
3. Click **Start Recording**, then speak your D&D notes or character ideas.
4. Click **Stop** when you are done; the transcript remains in the text area for copying or later processing.

> Note: The current implementation uses the browser's built-in speech recognition, so support on Firefox and some Linux setups may be limited. A server-side speech engine (e.g., Whisper) can be wired in later as part of ADA's full architecture.
