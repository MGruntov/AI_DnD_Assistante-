(function () {
  // HUD page module: dice roller, session notes, and SRD lookup.
  // Safe to include on any page; it no-ops unless HUD elements exist.

  const hudActiveCharacterMetaEl = document.getElementById("hudActiveCharacterMeta");
  const hudChangeCharacterBtn = document.getElementById("hudChangeCharacterBtn");
  const hudRollLogEl = document.getElementById("hudRollLog");
  const hudDiceButtons = Array.from(document.querySelectorAll(".dice__btn"));
  const sessionNotesEl = document.getElementById("sessionNotes");
  const sessionNotesStatusEl = document.getElementById("sessionNotesStatus");

  const rulesLookupInput = document.getElementById("rulesLookupInput");
  const rulesLookupBtn = document.getElementById("rulesLookupBtn");
  const rulesLookupResults = document.getElementById("rulesLookupResults");
  const rulesResultTitle = document.getElementById("rulesResultTitle");
  const rulesResultText = document.getElementById("rulesResultText");
  const rulesResultSource = document.getElementById("rulesResultSource");
  const rulesLookupPrevBtn = document.getElementById("rulesLookupPrevBtn");
  const rulesLookupNextBtn = document.getElementById("rulesLookupNextBtn");
  const rulesLookupCounter = document.getElementById("rulesLookupCounter");
  const rulesLookupMessage = document.getElementById("rulesLookupMessage");

  const hasHudUI =
    !!hudActiveCharacterMetaEl ||
    !!hudChangeCharacterBtn ||
    !!hudRollLogEl ||
    hudDiceButtons.length > 0 ||
    !!sessionNotesEl ||
    !!rulesLookupInput;

  if (!hasHudUI) return;

  const STORAGE_KEYS = {
    ACTIVE_CAMPAIGN_ID: "adaActiveCampaignId",
    ACTIVE_CHARACTER_ID: "adaActiveCharacterId",
    POST_SELECT_TARGET: "adaPostSelectTarget",
  };

  function computeBackendBaseUrl() {
    try {
      const hostname = window.location && window.location.hostname ? window.location.hostname : "";
      const isDev = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
      // BACKEND OPTIONS - Choose one:
      // Option 1: Shared backend (default)
      return isDev ? "http://localhost:8787" : "https://backend.ada-assistante.workers.dev";
      // Option 2: ev713's personal backend (uncomment below, comment above)
      // return isDev ? "http://localhost:8787" : "https://backend.ev713-backend.workers.dev";
    } catch {
      return "https://backend.ada-assistante.workers.dev";
      // return "https://backend.ev713-backend.workers.dev"; // Option 2
    }
  }

  function getBackendBaseUrl() {
    const ada = window.ADA;
    const configured = ada && ada.config && ada.config.BACKEND_BASE_URL;
    return configured || computeBackendBaseUrl();
  }

  function getActiveCharacter() {
    const ada = window.ADA;
    if (ada && typeof ada.getActiveCharacter === "function") {
      return ada.getActiveCharacter();
    }
    return null;
  }

  function getActiveCampaignId() {
    const ada = window.ADA;
    if (ada && typeof ada.getActiveCampaignId === "function") {
      return ada.getActiveCampaignId();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CAMPAIGN_ID);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  function getActiveCharacterId() {
    const ch = getActiveCharacter();
    if (ch && ch.id != null) return String(ch.id);
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHARACTER_ID);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  function renderActiveCharacterMeta(messageOverride) {
    if (!hudActiveCharacterMetaEl) return;

    if (messageOverride) {
      hudActiveCharacterMetaEl.textContent = String(messageOverride);
      return;
    }

    const ch = getActiveCharacter();
    if (!ch) {
      hudActiveCharacterMetaEl.textContent = "No character selected yet.";
      return;
    }

    const name = ch.name || "Unnamed Adventurer";
    const race = ch.concept && ch.concept.race ? ch.concept.race : "";
    const cls = ch.concept && ch.concept.classSummary ? ch.concept.classSummary : "Adventurer";
    const level = ch.concept && ch.concept.levelSummary ? ch.concept.levelSummary : "";

    const pieces = [name, [race, cls].filter(Boolean).join(" "), level ? `Lv ${level}` : ""]
      .filter(Boolean)
      .join(" • ");

    hudActiveCharacterMetaEl.textContent = pieces;
  }

  // -------- Dice roller --------
  const rollHistory = [];

  function logRoll({ die, result }) {
    if (!hudRollLogEl) return;

    const now = new Date();
    const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const item = { die, result, stamp };
    rollHistory.unshift(item);
    if (rollHistory.length > 40) rollHistory.pop();

    hudRollLogEl.innerHTML = "";
    rollHistory.forEach((r) => {
      const li = document.createElement("li");
      li.className = "roll-log__item";
      li.innerHTML = `Rolled d${r.die}: <b>${r.result}</b> <span>(${r.stamp})</span>`;
      hudRollLogEl.appendChild(li);
    });
  }

  function initDice() {
    if (!hudDiceButtons.length || !hudRollLogEl) return;

    hudDiceButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const die = Number(btn.getAttribute("data-die"));
        if (!Number.isFinite(die) || die <= 0) return;
        const result = Math.floor(Math.random() * die) + 1;
        btn.classList.remove("dice__btn--popped");
        // restart animation
        void btn.offsetWidth;
        btn.classList.add("dice__btn--popped");
        logRoll({ die, result });
      });
    });
  }

  // -------- Session notes --------
  let notesSaveTimer = null;

  function currentNotesStorageKey() {
    const camp = getActiveCampaignId() ? String(getActiveCampaignId()) : "no-campaign";
    const ch = getActiveCharacterId() ? String(getActiveCharacterId()) : "none";
    return `adaSessionNotes:${camp}:${ch}`;
  }

  function loadSessionNotesFromStorage() {
    if (!sessionNotesEl) return;
    try {
      const raw = localStorage.getItem(currentNotesStorageKey()) || "";
      sessionNotesEl.value = raw;
      if (sessionNotesStatusEl) sessionNotesStatusEl.textContent = "";
    } catch {
      // ignore
    }
  }

  function scheduleSaveSessionNotes() {
    if (!sessionNotesEl) return;

    if (notesSaveTimer) window.clearTimeout(notesSaveTimer);
    if (sessionNotesStatusEl) sessionNotesStatusEl.textContent = "Saving…";

    notesSaveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(currentNotesStorageKey(), sessionNotesEl.value || "");
        if (sessionNotesStatusEl) sessionNotesStatusEl.textContent = "Saved.";
      } catch {
        if (sessionNotesStatusEl) {
          sessionNotesStatusEl.textContent = "Could not save on this device.";
        }
      }
    }, 350);
  }

  function initNotes() {
    if (!sessionNotesEl) return;
    sessionNotesEl.addEventListener("input", scheduleSaveSessionNotes);
    loadSessionNotesFromStorage();
  }

  // -------- Rules lookup (SRD) --------
  const rulesLookupState = {
    results: [],
    currentIndex: 0,
  };

  let rulesLookupDebounceTimer = null;
  let rulesLookupAbortController = null;
  let rulesLookupRequestSeq = 0;
  let rulesLookupLastIssuedQuery = "";

  function clearRulesUi() {
    rulesLookupState.results = [];
    rulesLookupState.currentIndex = 0;
    if (rulesLookupMessage) rulesLookupMessage.textContent = "";
    if (rulesLookupResults) rulesLookupResults.hidden = true;
  }

  function scheduleRulesLookup(rawQuery) {
    const query = String(rawQuery || "").trim();

    if (rulesLookupDebounceTimer) window.clearTimeout(rulesLookupDebounceTimer);

    if (!query) {
      clearRulesUi();
      if (rulesLookupAbortController) {
        rulesLookupAbortController.abort();
        rulesLookupAbortController = null;
      }
      return;
    }

    if (query.length < 2) {
      if (rulesLookupMessage) rulesLookupMessage.textContent = "Keep typing…";
      if (rulesLookupResults) rulesLookupResults.hidden = true;
      return;
    }

    rulesLookupDebounceTimer = window.setTimeout(() => {
      performRulesLookup({ query });
    }, 220);
  }

  async function performRulesLookup({ query, k = 5, immediate = false } = {}) {
    if (!rulesLookupInput) return;
    const q = (typeof query === "string" ? query : rulesLookupInput.value).trim();

    if (!q) {
      if (rulesLookupMessage) rulesLookupMessage.textContent = "Please enter a search query.";
      if (rulesLookupResults) rulesLookupResults.hidden = true;
      return;
    }

    if (!immediate && q.length < 2) {
      if (rulesLookupMessage) rulesLookupMessage.textContent = "Keep typing…";
      if (rulesLookupResults) rulesLookupResults.hidden = true;
      return;
    }

    const normalized = q.toLowerCase();
    if (!immediate && normalized === rulesLookupLastIssuedQuery) {
      return;
    }
    rulesLookupLastIssuedQuery = normalized;

    if (rulesLookupAbortController) {
      rulesLookupAbortController.abort();
    }
    rulesLookupAbortController = new AbortController();
    const seq = ++rulesLookupRequestSeq;

    if (rulesLookupMessage) rulesLookupMessage.textContent = "Searching…";

    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/srd/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, k }),
        signal: rulesLookupAbortController.signal,
      });
      const data = await res.json().catch(() => ({}));

      if (seq !== rulesLookupRequestSeq) return;

      if (!res.ok || data.ok === false) {
        if (rulesLookupMessage) {
          rulesLookupMessage.textContent =
            data.error || data.message || "Could not search rules. Please try again.";
        }
        if (rulesLookupResults) rulesLookupResults.hidden = true;
        return;
      }

      rulesLookupState.results = Array.isArray(data.results) ? data.results : [];
      rulesLookupState.currentIndex = 0;

      if (rulesLookupState.results.length === 0) {
        if (rulesLookupMessage) rulesLookupMessage.textContent = "No results found for that query.";
        if (rulesLookupResults) rulesLookupResults.hidden = true;
        return;
      }

      displayRulesResult();
      if (rulesLookupMessage) rulesLookupMessage.textContent = "";
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("[ADA] Rules lookup failed", err);
      if (rulesLookupMessage) rulesLookupMessage.textContent = "Could not search rules. Please try again.";
      if (rulesLookupResults) rulesLookupResults.hidden = true;
    }
  }

  function displayRulesResult() {
    const result = rulesLookupState.results[rulesLookupState.currentIndex];
    if (!result) return;

    if (rulesResultTitle) rulesResultTitle.textContent = result.title || "Unknown";
    if (rulesResultText) rulesResultText.textContent = result.text || "No content available.";

    if (rulesResultSource) {
      const path = Array.isArray(result.path) ? result.path.join(" > ") : "";
      rulesResultSource.textContent = `Source: ${path || "D&D 5e SRD"}`;
    }

    if (rulesLookupCounter) {
      rulesLookupCounter.textContent = `${rulesLookupState.currentIndex + 1} / ${rulesLookupState.results.length}`;
    }

    if (rulesLookupPrevBtn) rulesLookupPrevBtn.hidden = rulesLookupState.currentIndex === 0;
    if (rulesLookupNextBtn) {
      rulesLookupNextBtn.hidden =
        rulesLookupState.currentIndex === rulesLookupState.results.length - 1;
    }

    if (rulesLookupResults) rulesLookupResults.hidden = false;
  }

  function initRulesLookup() {
    if (!rulesLookupInput) return;

    if (rulesLookupBtn) {
      rulesLookupBtn.addEventListener("click", () => {
        performRulesLookup({ immediate: true });
      });
    }

    rulesLookupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        performRulesLookup({ immediate: true });
      }
    });

    rulesLookupInput.addEventListener("input", () => {
      scheduleRulesLookup(rulesLookupInput.value);
    });

    if (rulesLookupNextBtn) {
      rulesLookupNextBtn.addEventListener("click", () => {
        if (rulesLookupState.currentIndex < rulesLookupState.results.length - 1) {
          rulesLookupState.currentIndex++;
          displayRulesResult();
        }
      });
    }

    if (rulesLookupPrevBtn) {
      rulesLookupPrevBtn.addEventListener("click", () => {
        if (rulesLookupState.currentIndex > 0) {
          rulesLookupState.currentIndex--;
          displayRulesResult();
        }
      });
    }
  }

  // -------- Cross-module hooks --------
  function initChooseCharacter() {
    if (!hudChangeCharacterBtn) return;

    hudChangeCharacterBtn.addEventListener("click", () => {
      const ada = window.ADA;
      if (ada && typeof ada.requestHudCharacterSelection === "function") {
        ada.requestHudCharacterSelection(
          "Choose an active character to enter the Session HUD."
        );
        return;
      }

      // Fallback if core script isn't present.
      try {
        localStorage.setItem(STORAGE_KEYS.POST_SELECT_TARGET, "hud");
      } catch {
        // ignore
      }
      window.location.href = "vault.html";
    });
  }

  // Keep HUD UI in sync with app state.
  window.addEventListener("ada:active-character-changed", () => {
    renderActiveCharacterMeta();
    loadSessionNotesFromStorage();
  });

  window.addEventListener("ada:active-campaign-changed", () => {
    loadSessionNotesFromStorage();
  });

  window.addEventListener("ada:hud-message", (event) => {
    const msg = event && event.detail && event.detail.message ? event.detail.message : "";
    if (msg) renderActiveCharacterMeta(msg);
  });

  // Initial render
  initChooseCharacter();
  initDice();
  initNotes();
  initRulesLookup();
  renderActiveCharacterMeta();
})();
