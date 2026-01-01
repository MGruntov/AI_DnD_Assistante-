// Placeholder module for splitting speech.js.
// Next steps: move WebSpeech API wiring + transcript normalization here.

export function stopRecognition(recognition) {
	try {
		if (recognition) recognition.stop();
	} catch {
		// ignore
	}
}
