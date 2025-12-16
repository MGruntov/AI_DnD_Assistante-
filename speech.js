(function () {
  const TranscriptMode = {
    APPEND: "append",
    REPLACE: "replace",
  };

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const statusEl = document.getElementById("status");
  const transcriptEl = document.getElementById("transcript");
  const supportWarning = document.getElementById("supportWarning");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (supportWarning) supportWarning.hidden = false;
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Speech not supported";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US"; // For D&D, you usually want English; make configurable later.
  recognition.interimResults = true;
  recognition.continuous = true; // Keep listening until explicitly stopped.

  let isListening = false;
  let lastFinal = "";
  let mode = TranscriptMode.APPEND;

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
  }

  function setListeningUI(listening) {
    isListening = listening;
    if (startBtn) startBtn.disabled = listening;
    if (stopBtn) stopBtn.disabled = !listening;
    setStatus(listening ? "Listening..." : "Idle");
  }

  function updateTranscript(text, updateMode) {
    if (!transcriptEl) return;
    if (updateMode === TranscriptMode.REPLACE) {
      transcriptEl.value = text;
    } else {
      const prefix = transcriptEl.value.trim();
      transcriptEl.value = prefix ? prefix + " " + text : text;
    }
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.trim();
      if (result.isFinal) {
        final += transcript + " ";
      } else {
        interim += transcript + " ";
      }
    }

    if (final) {
      lastFinal += final;
      updateTranscript(lastFinal.trim(), TranscriptMode.REPLACE);
    } else if (interim) {
      const combined = (lastFinal + " " + interim).trim();
      updateTranscript(combined, TranscriptMode.REPLACE);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event);
    setStatus("Error: " + (event.error || "unknown"));
    setListeningUI(false);
  };

  recognition.onend = () => {
    // If we didn't explicitly stop, it might have dropped; reflect idle state.
    if (isListening) {
      // Attempt to restart for robustness.
      try {
        recognition.start();
      } catch (e) {
        console.warn("Could not restart recognition", e);
        setListeningUI(false);
      }
    } else {
      setListeningUI(false);
    }
  };

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (isListening) return;
      try {
        lastFinal = transcriptEl ? transcriptEl.value.trim() + " " : "";
        recognition.start();
        setListeningUI(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
        setStatus("Failed to start listening");
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      if (!isListening) return;
      isListening = false;
      try {
        recognition.stop();
      } catch (e) {
        console.error("Failed to stop recognition", e);
      }
      setListeningUI(false);
    });
  }

  // Initial status
  setStatus("Idle");
})();
