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
  const generatePortraitsBtn = document.getElementById("generatePortraitsBtn");
  const portraitStatusEl = document.getElementById("portraitStatus");
  const forgeCharacterBtn = document.getElementById("forgeCharacterBtn");
  const forgeCharacterNameInput = document.getElementById("forgeCharacterName");
  const finishCharacterBtn = document.getElementById("finishCharacterBtn");
  const forgeStatusEl = document.getElementById("forgeStatus");
  const forgedCharacterEl = document.getElementById("forgedCharacter");

  const authSection = document.getElementById("authSection");
  const homeSection = document.getElementById("homeSection");
  const profileSection = document.getElementById("profileSection");
  const campaignsSection = document.getElementById("campaignsSection");
  const vaultSection = document.getElementById("vaultSection");
  const loginView = document.getElementById("loginView");
  const registerView = document.getElementById("registerView");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const authMessageEl = document.getElementById("authMessage");
  const currentUserLabel = document.getElementById("currentUserLabel");
  const appNav = document.getElementById("appNav");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileUsernameEl = document.getElementById("profileUsername");
  const profilePortraitEl = document.getElementById("profilePortrait");
  const campaignsList = document.getElementById("campaignsList");
  const campaignsMessage = document.getElementById("campaignsMessage");
  const createCampaignForm = document.getElementById("createCampaignForm");
  const campaignNameInput = document.getElementById("campaignName");
  const campaignParticipantsInput = document.getElementById("campaignParticipants");
  const campaignFilterAllBtn = document.getElementById("campaignFilterAll");
  const campaignFilterDmBtn = document.getElementById("campaignFilterDm");
  const campaignFilterPlayerBtn = document.getElementById("campaignFilterPlayer");
  const campaignsListView = document.getElementById("campaignsListView");
  const campaignDetailView = document.getElementById("campaignDetailView");
  const campaignBackBtn = document.getElementById("campaignBackBtn");
  const campaignDetailTitle = document.getElementById("campaignDetailTitle");
  const campaignDetailMeta = document.getElementById("campaignDetailMeta");
  const campaignDeleteBtn = document.getElementById("campaignDeleteBtn");
  const campaignLeaveBtn = document.getElementById("campaignLeaveBtn");
  const campaignCompleteBtn = document.getElementById("campaignCompleteBtn");
  const campaignActionStatusEl = document.getElementById("campaignActionStatus");
  const campaignTabButtons = Array.from(
    document.querySelectorAll(".campaign-tab-button")
  );
  const campaignTabPanels = Array.from(
    document.querySelectorAll(".campaign-tab-panel")
  );
  const campaignCharactersGrid = document.getElementById("campaignCharactersGrid");
  const campaignJournalsList = document.getElementById("campaignJournalsList");
  const campaignScriptsList = document.getElementById("campaignScriptsList");
  const campaignCreateJournalsBtn = document.getElementById("campaignCreateJournalsBtn");
  const campaignJournalsStatusEl = document.getElementById("campaignJournalsStatus");
  const campaignScriptPromptInput = document.getElementById("campaignScriptPrompt");
  const campaignScriptGenerateBtn = document.getElementById("campaignScriptGenerateBtn");
  const campaignScriptStatusEl = document.getElementById("campaignScriptStatus");
  const campaignDialogueStartBtn = document.getElementById("campaignDialogueStartBtn");
  const campaignDialogueStopBtn = document.getElementById("campaignDialogueStopBtn");
  const campaignDialogueStatusEl = document.getElementById("campaignDialogueStatus");
  const campaignDialogueTranscriptEl = document.getElementById("campaignDialogueTranscript");
  const dialogueContainerEl = document.getElementById("dialogueContainer");
  const dialogueComposerEl = document.getElementById("dialogueComposer");
  const dialogueTextInputEl = document.getElementById("dialogueTextInput");
  const dialogueSendBtn = document.getElementById("dialogueSendBtn");

  const aiDmNoticeEl = document.getElementById("aiDmNotice");
  const aiDmPanelEl = document.getElementById("aiDmPanel");
  const aiDmRollBtn = document.getElementById("aiDmRollBtn");
  const aiDmMechanicsEl = document.getElementById("aiDmMechanics");

  const adventuresList = document.getElementById("adventuresList");
  const adventuresMessage = document.getElementById("adventuresMessage");

  const vaultListView = document.getElementById("vaultListView");
  const vaultDetailView = document.getElementById("vaultDetailView");
  const vaultCharactersGrid = document.getElementById("vaultCharactersGrid");
  const vaultMessage = document.getElementById("vaultMessage");
  const vaultBackBtn = document.getElementById("vaultBackBtn");
  const vaultDetailName = document.getElementById("vaultDetailName");
  const vaultDetailMeta = document.getElementById("vaultDetailMeta");
  const vaultDetailPortrait = document.getElementById("vaultDetailPortrait");
  const vaultDetailPrompt = document.getElementById("vaultDetailPrompt");
  const vaultDetailAbilities = document.getElementById("vaultDetailAbilities");
  const vaultDetailMechanics = document.getElementById("vaultDetailMechanics");
  const vaultDetailResources = document.getElementById("vaultDetailResources");
  const vaultLevelUpBtn = document.getElementById("vaultLevelUpBtn");
  const vaultLevelUpStatus = document.getElementById("vaultLevelUpStatus");
  const vaultCampaignSelect = document.getElementById("vaultCampaignSelect");
  const vaultLinkBtn = document.getElementById("vaultLinkBtn");
  const vaultLinkStatus = document.getElementById("vaultLinkStatus");
  const vaultDeleteBtn = document.getElementById("vaultDeleteBtn");
  const vaultDeleteStatus = document.getElementById("vaultDeleteStatus");

  const portraitImgs = [
    document.getElementById("portraitImg0"),
    document.getElementById("portraitImg1"),
    document.getElementById("portraitImg2"),
  ];
  const portraitCards = Array.from(
    document.querySelectorAll(".portrait-card")
  );
  const portraitSelectButtons = Array.from(
    document.querySelectorAll(".portrait-card__select-btn")
  );

  // Rules Lookup Elements
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

  // Rules Lookup State
  let rulesLookupState = {
    results: [],
    currentIndex: 0,
  };

  const PORTRAIT_STORAGE_KEY = "adaCurrentCharacterPortraitUrl";
  const CURRENT_USER_STORAGE_KEY = "adaCurrentUser";
  const ACTIVE_CAMPAIGN_STORAGE_KEY = "adaActiveCampaignId";

  let activeCampaignId = null;
  let activeCampaign = null;
  let activeCharacter = null;
  let activeCampaignCharacters = [];
  let cachedPlayerSpeakerLabel = "You";
  // Backend API base URL (Cloudflare Worker)
  // Automatically use localhost for development, production URL otherwise
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
  const BACKEND_BASE_URL = isDevelopment
    ? "http://localhost:8787"
    : "https://backend.ada-assistante.workers.dev";
  let cachedAdventures = [];
  let cachedAdventureCharacters = [];
  let cachedUserCampaigns = [];
  let cachedVaultCharacters = [];
  let lastAiMechanics = null;
  let pendingForgedCharacter = null;
  let pendingNarrativeText = "";
  let pendingCharacterName = "";

  try {
    const storedCampaignId = localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
    if (storedCampaignId) {
      activeCampaignId = storedCampaignId;
    }
  } catch {
    // ignore storage issues
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  if (!SpeechRecognition) {
    // Browser doesn't support speech; disable related controls but keep the rest of the app working.
    if (supportWarning) supportWarning.hidden = false;
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    if (campaignDialogueStartBtn) campaignDialogueStartBtn.disabled = true;
    if (campaignDialogueStopBtn) campaignDialogueStopBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Speech not supported";
    if (campaignDialogueStatusEl)
      campaignDialogueStatusEl.textContent = "Speech not supported";
  } else {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // For D&D, you usually want English; make configurable later.
    recognition.interimResults = true;
    recognition.continuous = true; // Keep listening until explicitly stopped.
  }

  let isListening = false;
  let lastFinal = "";
  let mode = TranscriptMode.APPEND;
  let activeTranscriptEl = transcriptEl;
  let activeTranscriptStatusEl = statusEl;
  let activeTranscriptContext = "home"; // "home" | "dialogue"

  function setStatus(text) {
    const el = activeTranscriptStatusEl || statusEl;
    if (!el) return;
    el.textContent = text;
  }

  function computePlayerSpeakerLabel({ characters, username }) {
    const u = (username || "").trim();
    const list = Array.isArray(characters) ? characters : [];
    const owned = u ? list.filter((c) => c && c.owner === u) : [];
    const candidate = owned.length ? owned[0] : null;
    const name = candidate && candidate.name ? String(candidate.name).trim() : "";
    if (name) return name;

    // If no owned character is linked (e.g., DM-only), fall back gracefully.
    return u || "You";
  }

  function refreshDialogueComposerLabel() {
    if (!dialogueTextInputEl) return;
    const label = cachedPlayerSpeakerLabel || "You";
    dialogueTextInputEl.placeholder = `Type as ${label}…`;
  }

  function setPortraitStatus(text) {
    if (!portraitStatusEl) return;
    portraitStatusEl.textContent = text || "";
  }

  function setForgeStatus(text) {
    if (!forgeStatusEl) return;
    forgeStatusEl.textContent = text || "";
  }

  function hasSelectedPortrait() {
    try {
      const url = localStorage.getItem(PORTRAIT_STORAGE_KEY);
      return !!url;
    } catch {
      return false;
    }
  }

  function updateFinishCharacterButtonState() {
    if (!finishCharacterBtn) return;
    const enabled = !!pendingForgedCharacter && hasSelectedPortrait();
    finishCharacterBtn.disabled = !enabled;
  }

  function setAuthMessage(message) {
    if (!authMessageEl) return;
    authMessageEl.textContent = message || "";
  }

  function setListeningUI(listening) {
    isListening = listening;
    if (startBtn) startBtn.disabled = listening;
    if (stopBtn) stopBtn.disabled = !listening;
    if (campaignDialogueStartBtn) campaignDialogueStartBtn.disabled = listening;
    if (campaignDialogueStopBtn) campaignDialogueStopBtn.disabled = !listening;
    setStatus(listening ? "Listening..." : "Idle");
  }

  function updateTranscript(text, updateMode) {
    const target = activeTranscriptEl || transcriptEl;
    if (!target) return;
    if (updateMode === TranscriptMode.REPLACE) {
      target.value = text;
    } else {
      const prefix = target.value.trim();
      target.value = prefix ? prefix + " " + text : text;
    }
    target.scrollTop = target.scrollHeight;

    // If we're in the campaign dialogue view, keep the chat-style thread in sync.
    if (target === campaignDialogueTranscriptEl) {
      scheduleRenderCampaignDialogueThread(target.value || "");
    }
  }

  // Public-ish API for the dialogue UI.
  // sender: "dm" | "player" | "system" | string
  function appendMessage(sender, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    const s = String(sender || "").toLowerCase();
    if (s === "dm" || s === "ada" || s === "ai") {
      appendAiDmLog("dm", trimmed);
      return;
    }
    if (s === "player" || s === "you") {
      appendAiDmLog("player", trimmed);
      return;
    }

    // Unknown sender: keep transcript consistent for parsing.
    if (!campaignDialogueTranscriptEl) return;
    const current = campaignDialogueTranscriptEl.value.trim();
    const label = sender ? String(sender).trim() : "Transcript";
    const entry = `${label}: ${trimmed}`;
    const updated = current ? `${current}\n\n${entry}` : entry;
    campaignDialogueTranscriptEl.value = updated;
    campaignDialogueTranscriptEl.scrollTop = campaignDialogueTranscriptEl.scrollHeight;
    renderCampaignDialogueThread(updated);
    scheduleSaveCampaignTranscript();
  }

  function parseCampaignDialogueTranscript(transcript, currentUser, playerLabel) {
    const raw = typeof transcript === "string" ? transcript : "";
    const chunks = raw
      .split(/\n\s*\n+/g)
      .map((c) => c.trim())
      .filter(Boolean);

    const messages = [];
    chunks.forEach((chunk) => {
      const m = chunk.match(/^([A-Za-z0-9_\-\s]{1,40}):\s*([\s\S]+)$/);
      if (m) {
        const speaker = String(m[1] || "").trim();
        const body = String(m[2] || "").trim();
        const speakerLower = speaker.toLowerCase();
        const currentUserLower = (currentUser || "").toLowerCase();
        const playerLabelLower = (playerLabel || "").toLowerCase();

        let role = "other";
        if (speakerLower === "ada" || speakerLower === "dm" || speakerLower === "dungeon master") {
          role = "dm";
        } else if (
          speakerLower === "you" ||
          (playerLabelLower && speakerLower === playerLabelLower) ||
          (currentUserLower && speakerLower === currentUserLower)
        ) {
          role = "player";
        }

        messages.push({ role, speaker, text: body });
        return;
      }

      // Untagged transcript chunks (e.g., raw voice capture) are shown as a neutral system message.
      messages.push({ role: "system", speaker: "Transcript", text: chunk });
    });

    return messages;
  }

  function renderCampaignDialogueThread(transcript) {
    if (!dialogueContainerEl) return;
    const currentUser = getCurrentUser();
    const messages = parseCampaignDialogueTranscript(transcript, currentUser, cachedPlayerSpeakerLabel);
    dialogueContainerEl.innerHTML = "";

    if (messages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No dialogue yet. Start session capture or talk to ADA-DM.";
      dialogueContainerEl.appendChild(empty);
      return;
    }

    messages.forEach((msg) => {
      const bubble = document.createElement("div");
      bubble.className = `chat-msg chat-msg--${msg.role}`;

      const meta = document.createElement("div");
      meta.className = "chat-msg__meta";
      meta.textContent = msg.speaker;

      const body = document.createElement("div");
      body.className = "chat-msg__body";
      body.textContent = msg.text;

      bubble.appendChild(meta);
      bubble.appendChild(body);
      dialogueContainerEl.appendChild(bubble);
    });

    dialogueContainerEl.scrollTop = dialogueContainerEl.scrollHeight;
  }

  let renderCampaignDialogueTimer = null;

  function scheduleRenderCampaignDialogueThread(transcript) {
    if (!dialogueContainerEl) return;
    if (renderCampaignDialogueTimer) window.clearTimeout(renderCampaignDialogueTimer);
    renderCampaignDialogueTimer = window.setTimeout(() => {
      renderCampaignDialogueThread(transcript);
    }, 120);
  }

  async function apiPost(path, payload) {
    const url = `${BACKEND_BASE_URL}${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      console.error("[ADA] API error", e);
      return {
        ok: false,
        status: 0,
        data: { error: "Network error. Please try again." },
      };
    }
  }

  function getCurrentUser() {
    try {
      return localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setCurrentUser(username) {
    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, username);
    } catch (e) {
      console.warn("Failed to persist current user", e);
    }
  }

  function clearCurrentUser() {
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function showView(view) {
    // view: "auth-login" | "auth-register" | "home" | "profile" | "campaigns" | "campaign-detail" | "vault"
    const isAuthView = view === "auth-login" || view === "auth-register";
    const isCampaignView = view === "campaigns" || view === "campaign-detail";
    const isVaultView = view === "vault";

    if (authSection) authSection.hidden = !isAuthView;
    if (loginView) loginView.hidden = view !== "auth-login";
    if (registerView) registerView.hidden = view !== "auth-register";
    if (homeSection) homeSection.hidden = view !== "home";
    if (profileSection) profileSection.hidden = view !== "profile";
    if (campaignsSection) campaignsSection.hidden = !isCampaignView;
    if (vaultSection) {
      vaultSection.hidden = !isVaultView;
      if (isVaultView) {
        // reset to list view whenever entering the vault
        vaultDetailView.hidden = true;
        vaultListView.hidden = false;
        loadVaultCharacters();
        loadUserCampaignsForVault();
      }
    }

    if (campaignsListView && campaignDetailView) {
      if (view === "campaigns") {
        campaignsListView.hidden = false;
        campaignDetailView.hidden = true;
      } else if (view === "campaign-detail") {
        campaignsListView.hidden = true;
        campaignDetailView.hidden = false;
      }
    }

    // While on login/register screens, always hide nav and user label
    if (isAuthView) {
      if (appNav) {
        appNav.hidden = true;
        appNav.style.display = "none";
      }
      if (currentUserLabel) {
        currentUserLabel.hidden = true;
        currentUserLabel.style.display = "none";
      }
    }
  }

  function updateNav(username) {
    const loggedIn = !!username;
    if (currentUserLabel) {
      currentUserLabel.hidden = !loggedIn;
      currentUserLabel.textContent = loggedIn ? `Logged in as ${username}` : "";
      currentUserLabel.style.display = loggedIn ? "inline" : "none";
    }
    if (appNav) {
      appNav.hidden = !loggedIn;
      appNav.style.display = loggedIn ? "flex" : "none";
    }
  }

  function refreshProfileFromStorage() {
    if (!profilePortraitEl) return;
    profilePortraitEl.innerHTML = "";
    try {
      const url = localStorage.getItem(PORTRAIT_STORAGE_KEY);
      if (!url) return;
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Saved character portrait";
      profilePortraitEl.appendChild(img);
    } catch {
      // ignore
    }
  }

  function buildPortraitPrompt() {
    if (!transcriptEl) return null;
    const raw = transcriptEl.value.trim();
    if (!raw) return null;

    const clipped = raw.length > 280 ? raw.slice(0, 280) + "..." : raw;
    return `fantasy D&D character portrait, digital painting, ${clipped}`;
  }

  function buildPortraitImageUrl(prompt, seed) {
    // Uses the Pollinations free image generation endpoint.
    // You can swap this for another provider if you prefer.
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}`;
  }

  function clearPortraitSelection() {
    portraitCards.forEach((card) => {
      card.classList.remove("portrait-card--selected");
    });
  }

  function enablePortraitSelection() {
    portraitSelectButtons.forEach((btn) => {
      btn.disabled = false;
    });
  }

  function handlePortraitSelect(index) {
    const img = portraitImgs[index];
    if (!img || !img.src) return;

    const url = img.src;
    clearPortraitSelection();
    const card = portraitCards[index];
    if (card) {
      card.classList.add("portrait-card--selected");
    }

    try {
      localStorage.setItem(PORTRAIT_STORAGE_KEY, url);
      setPortraitStatus(
        "Portrait saved for this character (stored locally on this device)."
      );
      refreshProfileFromStorage();
      updateFinishCharacterButtonState();
    } catch (e) {
      console.warn("Could not persist portrait selection", e);
      setPortraitStatus("Portrait selected (could not save locally).");
    }
  }

  function logDialogueSnippet(snippet, fullText) {
    if (!activeCampaignId) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const trimmedSnippet = (snippet || "").trim();
    const trimmedFull = (fullText || "").trim();
    if (!trimmedSnippet && !trimmedFull) return;

    apiPost("/api/campaigns/details", {
      action: "logTranscript",
      campaignId: activeCampaignId,
      username: currentUser,
      snippet: trimmedSnippet,
      fullText: trimmedFull || trimmedSnippet,
    }).catch((e) => {
      console.warn("[ADA] Failed to log transcript snippet", e);
    });
  }

  if (recognition) {
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

    if (activeTranscriptContext === "dialogue") {
      // In campaign dialogue mode, treat each final chunk as a message.
      if (final) {
        handleDialoguePlayerInput(final.trim(), { source: "speech" });
      }
      // We intentionally ignore interim results in chat mode to avoid spammy bubbles.
      return;
    }

    if (final) {
      lastFinal += final;
      const combinedFinal = lastFinal.trim();
      updateTranscript(combinedFinal, TranscriptMode.REPLACE);
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
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (isListening) return;
      if (!recognition) {
        setStatus("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        activeTranscriptEl = transcriptEl;
        activeTranscriptStatusEl = statusEl;
        activeTranscriptContext = "home";
        const existing =
          activeTranscriptEl && activeTranscriptEl.value
            ? activeTranscriptEl.value.trim() + " "
            : "";
        lastFinal = existing;
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
        if (recognition) recognition.stop();
      } catch (e) {
        console.error("Failed to stop recognition", e);
      }
      setListeningUI(false);
    });
  }

  if (campaignDialogueStartBtn) {
    campaignDialogueStartBtn.addEventListener("click", () => {
      if (isListening) return;
      if (!recognition) {
        if (campaignDialogueStatusEl)
          campaignDialogueStatusEl.textContent =
            "Speech recognition is not supported in this browser.";
        return;
      }
      if (!activeCampaignId) {
        if (campaignDialogueStatusEl)
          campaignDialogueStatusEl.textContent =
            "Select a campaign first, then open its Dialogue tab.";
        return;
      }

      try {
        activeTranscriptEl = campaignDialogueTranscriptEl || transcriptEl;
        activeTranscriptStatusEl = campaignDialogueStatusEl || statusEl;
        activeTranscriptContext = "dialogue";
        const existing =
          activeTranscriptEl && activeTranscriptEl.value
            ? activeTranscriptEl.value.trim() + " "
            : "";
        lastFinal = existing;
        recognition.start();
        setListeningUI(true);
      } catch (e) {
        console.error("Failed to start recognition for dialogue", e);
        setStatus("Failed to start listening");
      }
    });
  }

  if (campaignDialogueStopBtn) {
    campaignDialogueStopBtn.addEventListener("click", () => {
      if (!isListening) return;
      isListening = false;
      try {
        if (recognition) recognition.stop();
      } catch (e) {
        console.error("Failed to stop recognition (dialogue)", e);
      }
      setListeningUI(false);
    });
  }

  // Initial status
  setStatus("Idle");

   // Portrait generation wiring
  if (generatePortraitsBtn) {
    generatePortraitsBtn.addEventListener("click", () => {
      const prompt = buildPortraitPrompt();
      if (!prompt) {
        setPortraitStatus(
          "Add some transcript text first, then we'll generate portraits from it."
        );
        return;
      }

      setPortraitStatus(
        "Generating portraits... this may take a few seconds on the first request."
      );

      const baseSeed = Math.floor(Math.random() * 1_000_000_000);
      portraitImgs.forEach((img, index) => {
        if (!img) return;
        const seed = baseSeed + index;
        const url = buildPortraitImageUrl(prompt, seed);
        img.hidden = false;
        img.src = url;
      });

      enablePortraitSelection();
    });
  }

  portraitSelectButtons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.getAttribute("data-index"));
      if (Number.isNaN(index)) return;
      handlePortraitSelect(index);
    });
  });

  try {
    const existingPortrait = localStorage.getItem(PORTRAIT_STORAGE_KEY);
    if (existingPortrait) {
      setPortraitStatus(
        "A portrait is already saved for this character. You can generate new ones if you want to change it."
      );
      refreshProfileFromStorage();
    }
  } catch {
    // Ignore storage issues on load.
  }

  function renderForgedCharacter(character) {
    if (!forgedCharacterEl) return;
    if (!character) {
      forgedCharacterEl.hidden = true;
      forgedCharacterEl.innerHTML = "";
      return;
    }

    const { concept, mechanics } = character;
    const classes = concept?.classSummary || "";
    const levels = concept?.levelSummary || "";

    const ability = mechanics?.abilityScores || {};

    forgedCharacterEl.hidden = false;
    forgedCharacterEl.innerHTML = "";

    const title = document.createElement("h3");
    title.className = "forge__result-title";
    title.textContent = concept?.race
      ? `${concept.race} ${classes || "Adventurer"}`
      : classes || "Forged Adventurer";

    const row1 = document.createElement("p");
    row1.className = "forge__result-row";
    row1.textContent = `Classes: ${classes || "Unknown"} | Levels: ${
      levels || "?"
    }`;

    const row2 = document.createElement("p");
    row2.className = "forge__result-row";
    row2.textContent = `HP: ${
      mechanics?.hitPoints ?? "?"
    } | AC: ${mechanics?.armorClass ?? "?"} | Speed: ${
      mechanics?.speed ?? "?"
    }`;

    const row3 = document.createElement("p");
    row3.className = "forge__result-row";
    row3.textContent = `STR ${ability.str ?? "-"}, DEX ${
      ability.dex ?? "-"
    }, CON ${ability.con ?? "-"}, INT ${ability.int ?? "-"}, WIS ${
      ability.wis ?? "-"
    }, CHA ${ability.cha ?? "-"}`;

    forgedCharacterEl.appendChild(title);
    forgedCharacterEl.appendChild(row1);
    forgedCharacterEl.appendChild(row2);
    forgedCharacterEl.appendChild(row3);
  }

  async function apiGet(path) {
    const url = `${BACKEND_BASE_URL}${path}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      console.error("[ADA] API GET error", e);
      return { ok: false, status: 0, data: null };
    }
  }

  function computeCharacterTotalLevel(character) {
    const levelSummary = character?.concept?.levelSummary;
    if (typeof levelSummary !== "string" || !levelSummary.trim()) return 1;
    const parts = levelSummary
      .split("/")
      .map((p) => Number.parseInt(p, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!parts.length) return 1;
    return parts.reduce((acc, n) => acc + n, 0);
  }

  async function loadAdventuresAndCharacters() {
    const user = getCurrentUser();
    if (!user) {
      if (adventuresList) adventuresList.innerHTML = "";
      if (adventuresMessage)
        adventuresMessage.textContent = "Log in and create a character to try a solo ADA adventure.";
      return;
    }

    if (adventuresMessage) adventuresMessage.textContent = "Loading adventures...";
    if (adventuresList) adventuresList.innerHTML = "";

    try {
      const [advRes, charsRes] = await Promise.all([
        apiGet("/api/adventures"),
        apiGet(`/api/characters?user=${encodeURIComponent(user)}`),
      ]);

      if (!advRes.ok) {
        const msg = (advRes.data && advRes.data.error) || "Could not load adventures.";
        if (adventuresMessage) adventuresMessage.textContent = msg;
        return;
      }

      const adventures = Array.isArray(advRes.data?.adventures)
        ? advRes.data.adventures
        : [];
      const characters = Array.isArray(charsRes.data?.characters)
        ? charsRes.data.characters
        : [];

      cachedAdventures = adventures;
      cachedAdventureCharacters = characters;

      renderAdventures(adventures, characters);
    } catch (e) {
      console.error("Failed to load adventures or characters", e);
      if (adventuresMessage) adventuresMessage.textContent = "Error loading adventures.";
    }
  }

  function renderAdventures(adventures, characters) {
    if (!adventuresList) return;
    adventuresList.innerHTML = "";

    if (!Array.isArray(adventures) || adventures.length === 0) {
      if (adventuresMessage)
        adventuresMessage.textContent = "No public adventures are available yet.";
      return;
    }

    if (adventuresMessage) adventuresMessage.textContent = "";

    const userHasCharacters = Array.isArray(characters) && characters.length > 0;

    adventures.forEach((adv) => {
      const card = document.createElement("article");
      card.className = "adventure-card";

      const header = document.createElement("div");
      header.className = "adventure-card__header";

      const title = document.createElement("h3");
      title.className = "adventure-card__title";
      title.textContent = adv.title || "Adventure";

      const badge = document.createElement("span");
      badge.className = "adventure-card__badge";
      const levelMin = adv.levelMin ?? 1;
      const levelMax = adv.levelMax ?? levelMin;
      badge.textContent = `Lv ${levelMin}-${levelMax} · ${adv.difficulty || "Normal"}`;

      header.appendChild(title);
      header.appendChild(badge);

      const meta = document.createElement("p");
      meta.className = "adventure-card__meta";
      meta.textContent = "Solo · ADA as your Dungeon Master";

      const summary = document.createElement("p");
      summary.className = "adventure-card__summary";
      summary.textContent = adv.summary || "";

      const controls = document.createElement("div");
      controls.className = "adventure-card__controls";

      const select = document.createElement("select");
      select.className = "adventure-card__select";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = userHasCharacters
        ? "Choose a character"
        : "Create a character first";
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      let hasEligible = false;

      if (userHasCharacters) {
        characters.forEach((ch) => {
          const lvl = computeCharacterTotalLevel(ch);
          const meets = lvl >= (adv.levelMin ?? 1) && lvl <= (adv.levelMax ?? lvl);
          const opt = document.createElement("option");
          opt.value = ch.id;
          opt.textContent = `${ch.name || "Unnamed"} (Lv ${lvl})`;
          if (!meets) {
            opt.disabled = true;
            opt.textContent += " – level out of range";
          } else {
            hasEligible = true;
          }
          select.appendChild(opt);
        });
      }

      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "btn btn--primary btn--small";
      startBtn.textContent = "Start solo run";
      startBtn.disabled = !userHasCharacters || !hasEligible;

      const status = document.createElement("p");
      status.className = "adventure-card__status";

      startBtn.addEventListener("click", () => {
        const selectedId = select.value;
        if (!selectedId) {
          status.textContent = hasEligible
            ? "Choose a character first."
            : "You don't have any characters in the required level range.";
          return;
        }
        // Starting a fresh AI-solo run; clear any previous dialogue UI state
        if (campaignDialogueTranscriptEl) {
          campaignDialogueTranscriptEl.value = "";
        }
        if (aiDmMechanicsEl) {
          aiDmMechanicsEl.textContent = "";
        }
        status.textContent = "Starting solo run...";
        const currentUser = getCurrentUser();
        apiPost("/api/ai-campaigns/start", {
          username: currentUser,
          characterId: selectedId,
          adventureId: adv.id,
        }).then((result) => {
          if (!result.ok) {
            const msg = (result.data && result.data.error) ||
              "Could not start adventure.";
            status.textContent = msg;
            return;
          }
          status.textContent = "Adventure started. Opening campaign...";
          const data = result.data || {};
          const campaign = data.campaign;
          const opening = data.openingNarrative || (data.opening && data.opening.narrative);
          if (campaign) {
            openCampaignDashboard(campaign);
            if (opening) {
              appendAiDmLog("dm", opening);
              setCampaignTab("dialogue");
            }
          }
        });
      });

      controls.appendChild(select);
      controls.appendChild(startBtn);
      controls.appendChild(status);

      card.appendChild(header);
      card.appendChild(meta);
      card.appendChild(summary);
      card.appendChild(controls);

      adventuresList.appendChild(card);
    });
  }

  function isAIDmCampaign(campaign) {
    if (!campaign) return false;
    return campaign.dmIsAI === true || campaign.mode === "ai-solo";
  }

  function setCampaignTab(tabId) {
    if (!tabId) return;

    campaignTabButtons.forEach((btn) => {
      const tab = btn.getAttribute("data-tab");
      const isActive = tab === tabId;
      if (isActive) {
        btn.classList.add("campaign-tab-button--active");
        btn.setAttribute("aria-current", "page");
      } else {
        btn.classList.remove("campaign-tab-button--active");
        btn.removeAttribute("aria-current");
      }
    });

    campaignTabPanels.forEach((panel) => {
      const tab = panel.getAttribute("data-tab");
      panel.hidden = tab !== tabId;
    });
  }

  function appendAiDmLog(role, text) {
    if (!text) return;
    const playerLabel = cachedPlayerSpeakerLabel || "You";
    const prefix = role === "dm" ? "ADA: " : `${playerLabel}: `;
    const current = campaignDialogueTranscriptEl
      ? campaignDialogueTranscriptEl.value.trim()
      : "";
    const entry = `${prefix}${text.trim()}`;
    const updated = current ? `${current}\n\n${entry}` : entry;

    if (campaignDialogueTranscriptEl) {
      campaignDialogueTranscriptEl.value = updated;
      campaignDialogueTranscriptEl.scrollTop =
        campaignDialogueTranscriptEl.scrollHeight;
    }

    renderCampaignDialogueThread(updated);
    scheduleSaveCampaignTranscript();
  }

  let saveTranscriptTimer = null;

  function scheduleSaveCampaignTranscript() {
    if (!campaignDialogueTranscriptEl) return;
    if (!activeCampaignId) return;
    const username = getCurrentUser();
    if (!username) return;

    const text = campaignDialogueTranscriptEl.value || "";
    if (saveTranscriptTimer) window.clearTimeout(saveTranscriptTimer);
    saveTranscriptTimer = window.setTimeout(() => {
      apiPost("/api/campaigns/details", {
        action: "updateTranscript",
        campaignId: activeCampaignId,
        username,
        transcript: text,
      }).catch((e) => {
        console.warn("[ADA] Failed to save campaign transcript", e);
      });
    }, 800);
  }

  async function sendAiDmTurn() {
    // Backwards-compatible wrapper for old button wiring.
    const text = dialogueTextInputEl ? dialogueTextInputEl.value.trim() : "";
    if (!text) return;
    await handleDialoguePlayerInput(text, { source: "typing" });
  }

  let aiDmTurnQueue = Promise.resolve();

  async function sendAiDmTurnWithText(text) {
    if (!activeCampaign || !isAIDmCampaign(activeCampaign)) return;
    const username = getCurrentUser();
    if (!username) {
      if (aiDmMechanicsEl)
        aiDmMechanicsEl.textContent = "Log in to talk to ADA as DM.";
      return;
    }

    const trimmed = (text || "").trim();
    if (!trimmed) return;

    if (dialogueSendBtn) dialogueSendBtn.disabled = true;
    if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Talking to ADA...";

    // Ensure we serialize turns so responses stay in order.
    aiDmTurnQueue = aiDmTurnQueue.then(async () => {
      const result = await apiPost("/api/ai-dm/turn", {
        username,
        campaignId: activeCampaignId,
        text: trimmed,
      });

      if (!result.ok) {
        const msg =
          (result.data && (result.data.error || result.data.message)) ||
          "ADA could not respond right now.";
        if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = msg;
        return;
      }

      const payload = result.data || {};
      const narrative = payload.narrative || payload.text || "";
      const mechanics = payload.mechanics || null;
      const debug = payload.debug || null;
      lastAiMechanics = mechanics;

      if (narrative) {
        appendMessage("dm", narrative);
      }

      if (mechanics && aiDmMechanicsEl) {
        const dc = mechanics.dc;
        const ability = mechanics.ability;
        const skill = mechanics.skill;
        const advantage = mechanics.advantage;
        const checkDescription = mechanics.checkDescription;
        const pieces = [];
        if (checkDescription && String(checkDescription).trim()) {
          pieces.push(String(checkDescription).trim());
        }
        if (dc != null) pieces.push(`DC ${dc}`);
        if (ability) pieces.push(ability.toUpperCase());
        if (skill) pieces.push(skill);
        if (advantage === "advantage") pieces.push("(advantage)");
        if (advantage === "disadvantage") pieces.push("(disadvantage)");
        aiDmMechanicsEl.textContent =
          pieces.length > 0 ? `Check requested: ${pieces.join(" ")}` : "";
      } else if (aiDmMechanicsEl) {
        aiDmMechanicsEl.textContent = "";
      }

      // If backend debug is enabled, show which model is being used.
      const modelName =
        debug && debug.gemini && debug.gemini.model
          ? String(debug.gemini.model)
          : "";
      if (modelName && aiDmNoticeEl) {
        aiDmNoticeEl.hidden = false;
        aiDmNoticeEl.textContent =
          `ADA is acting as the Dungeon Master for this campaign. ` +
          `Type what your character does next and send it to continue the story. ` +
          `AI model: ${modelName}`;
      }
    }).catch((e) => {
      console.error("[ADA] AI-DM turn failed", e);
      if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Error talking to ADA.";
    }).finally(() => {
      if (dialogueSendBtn) dialogueSendBtn.disabled = false;
    });

    return aiDmTurnQueue;
  }

  async function handleDialoguePlayerInput(text, { source } = {}) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    // Echo the player's message to the chat.
    appendMessage("player", trimmed);
    if (dialogueTextInputEl) dialogueTextInputEl.value = "";

    // For journals and future mechanics, keep the transcript log action for speech captures.
    if (source === "speech") {
      logDialogueSnippet(trimmed, campaignDialogueTranscriptEl ? campaignDialogueTranscriptEl.value : trimmed);
    }

    // If this is an AI-DM campaign, request the AI's reply.
    if (activeCampaign && isAIDmCampaign(activeCampaign)) {
      await sendAiDmTurnWithText(trimmed);
    }

  }

  function renderCampaignCharacters(characters) {
    if (!campaignCharactersGrid) return;
    campaignCharactersGrid.innerHTML = "";

    if (!Array.isArray(characters) || characters.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent =
        "No characters are linked to this campaign yet. Forge a character and link it from your tools.";
      campaignCharactersGrid.appendChild(empty);
      return;
    }

    characters.forEach((ch) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "party-card";

      const header = document.createElement("div");
      header.className = "party-card__header";

      const nameEl = document.createElement("h3");
      nameEl.className = "party-card__name";
      const name = ch.name && String(ch.name).trim();
      nameEl.textContent = name || "Unnamed adventurer";

      const tag = document.createElement("span");
      tag.className = "party-card__tag";
      const race = ch.concept?.race || "?";
      const cls = ch.concept?.classSummary || "Adventurer";
      tag.textContent = `${race} ${cls}`;

      header.appendChild(nameEl);
      header.appendChild(tag);

      const meta = document.createElement("p");
      meta.className = "party-card__meta";
      const levelSummary = ch.concept?.levelSummary || "1";
      meta.textContent = `Level(s): ${levelSummary}`;

      card.appendChild(header);
      card.appendChild(meta);

      if (ch.portraitUrl) {
        const portraitWrapper = document.createElement("div");
        portraitWrapper.className = "party-card__portrait";
        const img = document.createElement("img");
        img.src = ch.portraitUrl;
        img.alt = `Portrait of ${name || "campaign character"}`;
        portraitWrapper.appendChild(img);
        card.appendChild(portraitWrapper);
      }

      card.addEventListener("click", () => {
        // Open this character's full sheet in the vault view
        showView("vault");
        renderVaultDetail(ch);
      });

      campaignCharactersGrid.appendChild(card);
    });
  }

  function renderCampaignJournals(journals) {
    if (!campaignJournalsList) return;
    campaignJournalsList.innerHTML = "";

    if (!Array.isArray(journals) || journals.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent =
        "No journal entries yet. Generate them later from your recorded dialogue.";
      campaignJournalsList.appendChild(empty);
      return;
    }

    const sorted = journals.slice().sort((a, b) => {
      const ad = Date.parse(a.createdAt || "");
      const bd = Date.parse(b.createdAt || "");
      return (bd || 0) - (ad || 0);
    });

    sorted.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "journal-entry";

      const meta = document.createElement("div");
      meta.className = "journal-entry__meta";
      const author = entry.author || "Narrator";
      const createdAt = new Date(entry.createdAt || Date.now()).toLocaleString();
      meta.textContent = `${author} · ${createdAt}`;

      const body = document.createElement("div");
      body.textContent = entry.polishedText || entry.rawTranscript || "";

      article.appendChild(meta);
      article.appendChild(body);

      campaignJournalsList.appendChild(article);
    });
  }

  function renderCampaignScripts(scripts) {
    if (!campaignScriptsList) return;
    campaignScriptsList.innerHTML = "";

    if (!Array.isArray(scripts) || scripts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent =
        "No scripts saved yet. Use the prompt above to generate an encounter script.";
      campaignScriptsList.appendChild(empty);
      return;
    }

    const sorted = scripts.slice().sort((a, b) => {
      const ad = Date.parse(a.createdAt || "");
      const bd = Date.parse(b.createdAt || "");
      return (bd || 0) - (ad || 0);
    });

    sorted.forEach((script) => {
      const card = document.createElement("article");
      card.className = "script-card";

      const title = document.createElement("h3");
      title.className = "script-card__title";
      title.textContent = script.title || "Encounter Script";

      const meta = document.createElement("div");
      meta.className = "script-card__meta";
      const author = script.author || "DM";
      const createdAt = new Date(script.createdAt || Date.now()).toLocaleString();
      meta.textContent = `${author} · ${createdAt}`;

      const body = document.createElement("div");
      body.className = "script-card__body";
      body.textContent = script.body || "";

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(body);

      campaignScriptsList.appendChild(card);
    });
  }

  async function loadCampaignDetail(campaignId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      if (campaignsMessage)
        campaignsMessage.textContent =
          "You need to be logged in to see campaign details.";
      return;
    }

    if (campaignScriptStatusEl) campaignScriptStatusEl.textContent = "Idle";
    if (campaignCharactersGrid) campaignCharactersGrid.innerHTML = "";
    if (campaignJournalsList) campaignJournalsList.innerHTML = "";
    if (campaignScriptsList) campaignScriptsList.innerHTML = "";
    if (campaignDialogueTranscriptEl) campaignDialogueTranscriptEl.value = "";

    const result = await apiGet(
      `/api/campaigns/details?id=${encodeURIComponent(
        campaignId
      )}&user=${encodeURIComponent(currentUser)}`
    );

    if (!result.ok) {
      if (campaignsMessage)
        campaignsMessage.textContent =
          "Could not load campaign details. Please try again later.";
      return;
    }

    const data = result.data || {};
    const campaign = data.campaign;
    const characters = Array.isArray(data.characters) ? data.characters : [];
    const journals = Array.isArray(data.journals) ? data.journals : [];
    const scripts = Array.isArray(data.scripts) ? data.scripts : [];

    activeCampaignCharacters = characters;
    cachedPlayerSpeakerLabel = computePlayerSpeakerLabel({ characters, username: currentUser });
    refreshDialogueComposerLabel();

    if (campaign) {
      activeCampaign = campaign;
      if (campaignDetailTitle)
        campaignDetailTitle.textContent = campaign.name || "Campaign Dashboard";

      if (campaignDetailMeta) {
        const role = campaign.dm === currentUser ? "Dungeon Master" : "Player";
        const others = (Array.isArray(campaign.participants)
          ? campaign.participants
          : []
        ).filter((p) => p !== currentUser);
        const othersLabel = others.length ? ` · With ${others.join(", ")}` : "";
        const created = new Date(campaign.createdAt || Date.now()).toLocaleString();
        campaignDetailMeta.textContent = `${role} · Created ${created}${othersLabel}`;
      }

      const isAi = isAIDmCampaign(campaign);
      if (aiDmNoticeEl) aiDmNoticeEl.hidden = !isAi;
      if (aiDmPanelEl) aiDmPanelEl.hidden = !isAi;
      if (dialogueTextInputEl) dialogueTextInputEl.disabled = false;
      if (dialogueSendBtn) dialogueSendBtn.disabled = false;
      if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "";

      // Configure delete/leave buttons based on campaign type and user role
      const isDm = campaign.dm === currentUser;
      const isParticipant =
        Array.isArray(campaign.participants) &&
        campaign.participants.includes(currentUser);

      if (campaignDeleteBtn) {
        const canDelete = isAi && isParticipant;
        campaignDeleteBtn.hidden = !canDelete;
        campaignDeleteBtn.disabled = !canDelete;
      }

      if (campaignLeaveBtn) {
        const canLeave = !isAi && isParticipant && !isDm;
        campaignLeaveBtn.hidden = !canLeave;
        campaignLeaveBtn.disabled = !canLeave;
      }

      if (campaignCompleteBtn) {
        const alreadyCompleted = campaign.status === "completed";
        const canComplete = !isAi && isDm && isParticipant && !alreadyCompleted;
        campaignCompleteBtn.hidden = !canComplete;
        campaignCompleteBtn.disabled = !canComplete;
      }

      if (campaignActionStatusEl) campaignActionStatusEl.textContent = "";

      if (campaignDialogueTranscriptEl) {
        const transcript =
          typeof campaign.conversationTranscript === "string"
            ? campaign.conversationTranscript
            : "";
        campaignDialogueTranscriptEl.value = transcript;
        campaignDialogueTranscriptEl.scrollTop =
          campaignDialogueTranscriptEl.scrollHeight;
        renderCampaignDialogueThread(transcript);
      } else {
        renderCampaignDialogueThread("");
      }
    }

    renderCampaignCharacters(characters);
    renderCampaignJournals(journals);
    renderCampaignScripts(scripts);
  }

  function openCampaignDashboard(campaign) {
    if (!campaign) return;
    activeCampaignId = campaign.id;
    activeCampaign = campaign;

    // Reset dialogue transcript when switching to a different campaign
    if (campaignDialogueTranscriptEl) {
      campaignDialogueTranscriptEl.value = "";
    }
    if (dialogueContainerEl) {
      dialogueContainerEl.innerHTML = "";
    }

    activeCampaignCharacters = [];
    cachedPlayerSpeakerLabel = computePlayerSpeakerLabel({ characters: [], username: getCurrentUser() });
    refreshDialogueComposerLabel();

    try {
      localStorage.setItem(ACTIVE_CAMPAIGN_STORAGE_KEY, String(campaign.id));
    } catch (e) {
      console.warn("[ADA] Failed to persist active campaign id", e);
    }

    setCampaignTab("characters");
    showView("campaign-detail");
    loadCampaignDetail(campaign.id);
  }

  function renderCampaigns(campaigns, filter, currentUser) {
    if (!campaignsList) return;
    campaignsList.innerHTML = "";

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      if (campaignsMessage)
        campaignsMessage.textContent =
          "No campaigns yet. Create one to get started!";
      return;
    }

    const filtered = campaigns.filter((c) => {
      const isDm = c.dm === currentUser;
      const isParticipant =
        Array.isArray(c.participants) && c.participants.includes(currentUser);
      if (!isParticipant) return false;
      if (filter === "dm") return isDm;
      if (filter === "player") return !isDm;
      return true;
    });

    if (filtered.length === 0) {
      if (campaignsMessage) {
        if (filter === "dm") {
          campaignsMessage.textContent =
            "You're not a DM in any campaigns yet.";
        } else if (filter === "player") {
          campaignsMessage.textContent =
            "You're not listed as a player in any campaigns yet.";
        } else {
          campaignsMessage.textContent = "No campaigns yet.";
        }
      }
      return;
    }

    if (campaignsMessage) campaignsMessage.textContent = "";

    filtered.forEach((c) => {
      const card = document.createElement("article");
      card.className = "campaign-card";

      const header = document.createElement("div");
      header.className = "campaign-card__header";

      const title = document.createElement("h3");
      title.className = "campaign-card__title";
      title.textContent = c.name || "Untitled campaign";

      const badge = document.createElement("span");
      badge.className = "campaign-card__badge";
      badge.textContent =
        c.dm === currentUser ? "Dungeon Master" : "Player";

      header.appendChild(title);
      header.appendChild(badge);

      const meta = document.createElement("p");
      meta.className = "campaign-card__meta";
      meta.textContent = `Created ${new Date(
        c.createdAt || Date.now()
      ).toLocaleString()}`;

      const participants = document.createElement("p");
      participants.className = "campaign-card__participants";
      const others = (Array.isArray(c.participants) ? c.participants : []).filter(
        (p) => p !== currentUser
      );
      participants.textContent = others.length
        ? `Participants: ${others.join(", ")}`
        : "Participants: just you for now";

      card.appendChild(header);
      card.appendChild(meta);
      card.appendChild(participants);

      card.dataset.campaignId = c.id;
      card.addEventListener("click", () => {
        openCampaignDashboard(c);
      });

      campaignsList.appendChild(card);
    });
  }

  async function loadCampaigns(filter) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      if (campaignsMessage)
        campaignsMessage.textContent =
          "You need to be logged in to see campaigns.";
      if (campaignsList) campaignsList.innerHTML = "";
      return;
    }

    if (campaignsMessage)
      campaignsMessage.textContent = "Loading campaigns...";
    if (campaignsList) campaignsList.innerHTML = "";

    const result = await apiGet(
      `/api/campaigns?user=${encodeURIComponent(currentUser)}`
    );
    if (!result.ok) {
      if (campaignsMessage)
        campaignsMessage.textContent =
          "Could not load campaigns. Please try again later.";
      return;
    }

    const campaigns =
      result.data && Array.isArray(result.data.campaigns)
        ? result.data.campaigns
        : [];
    renderCampaigns(campaigns, filter, currentUser);
  }

  async function loadVaultCharacters() {
    const user = getCurrentUser();
    if (!user) return;
    vaultMessage.textContent = "Loading your characters...";
    vaultCharactersGrid.innerHTML = "";
    try {
      const result = await apiGet(`/api/characters?user=${encodeURIComponent(user)}`);
      if (!result.ok) {
        throw new Error((result.data && result.data.error) || "Failed to load characters");
      }
      const data = result.data || {};
      const characters = Array.isArray(data.characters) ? data.characters : [];
      cachedVaultCharacters = characters;
      if (!characters.length) {
        vaultMessage.textContent = "No characters yet. Forge one from the Home tab to get started.";
        return;
      }
      vaultMessage.textContent = "";
      characters.forEach((ch) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "vault-card";
        const race = ch.concept?.race || "";
        const cls = ch.concept?.classSummary || "Adventurer";
        const meta = [race, cls].filter(Boolean).join(" ");
        card.innerHTML = `
          <div class="vault-card__portrait" style="background-image: url('${(ch.portraitUrl || "").replace(/'/g, "&#39;")}')"></div>
          <div class="vault-card__name">${ch.name || "Unnamed Adventurer"}</div>
          <div class="vault-card__meta">${meta || "Adventurer"}</div>
        `;
        card.addEventListener("click", () => openVaultDetail(ch.id));
        vaultCharactersGrid.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to load characters", err);
      vaultMessage.textContent = err.message || "Error loading characters.";
    }
  }

  async function loadUserCampaignsForVault() {
    const user = getCurrentUser();
    if (!user) return;
    try {
      const result = await apiGet(`/api/campaigns?user=${encodeURIComponent(user)}`);
      if (!result.ok) return;
      const data = result.data || {};
      cachedUserCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    } catch (err) {
      console.warn("Unable to load campaigns for vault", err);
    }
  }

  function populateVaultCampaignSelect(character) {
    vaultCampaignSelect.innerHTML = "";
    const optPlaceholder = document.createElement("option");
    optPlaceholder.value = "";
    optPlaceholder.textContent = "Select a campaign";
    vaultCampaignSelect.appendChild(optPlaceholder);

    if (!cachedUserCampaigns.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.textContent = "No campaigns yet";
      vaultCampaignSelect.appendChild(opt);
      return;
    }

    cachedUserCampaigns.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      const labelRole = c.dm === getCurrentUser() ? "DM" : "Player";
      opt.textContent = `${c.name} (${labelRole})`;
      vaultCampaignSelect.appendChild(opt);
    });

    if (character && Array.isArray(character.campaignIds) && character.campaignIds.length) {
      const lastId = character.campaignIds[character.campaignIds.length - 1];
      const match = Array.from(vaultCampaignSelect.options).find((o) => o.value === lastId);
      if (match) vaultCampaignSelect.value = lastId;
    }
  }

  function renderVaultDetail(character) {
    activeCharacter = character;
    vaultDetailName.textContent = character.name || "Unnamed Adventurer";
    const race = character.concept?.race || "";
    const mainClass = Array.isArray(character.concept?.classes) && character.concept.classes.length
      ? character.concept.classes[0].name
      : "";
    const level = Array.isArray(character.concept?.classes) && character.concept.classes.length
      ? character.concept.classes[0].level
      : undefined;
    const roleLine = [race, mainClass, level ? `Level ${level}` : ""].filter(Boolean).join(" • ");
    vaultDetailMeta.textContent = roleLine || "Adventurer";
    // Render portrait as an <img> so we don't rely on background-image vs gradient precedence
    vaultDetailPortrait.innerHTML = "";
    if (character.portraitUrl) {
      const img = document.createElement("img");
      img.src = character.portraitUrl;
      img.alt = `Portrait of ${character.name || "character"}`;
      vaultDetailPortrait.appendChild(img);
    }

    if (vaultDetailPrompt) {
      const rawPrompt =
        character.narrative && character.narrative.rawTranscript
          ? character.narrative.rawTranscript
          : "";
      vaultDetailPrompt.value = rawPrompt;
    }

    // Abilities
    vaultDetailAbilities.innerHTML = "";
    const abilities = character.mechanics?.abilityScores || {};
    const abilityOrder = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    abilityOrder.forEach((abbr) => {
      const key = abbr.toLowerCase();
      const score = abilities[key] ?? "—";
      const dt = document.createElement("dt");
      dt.textContent = abbr;
      const dd = document.createElement("dd");
      dd.textContent = String(score);
      vaultDetailAbilities.appendChild(dt);
      vaultDetailAbilities.appendChild(dd);
    });

    // Mechanics summary
    const m = character.mechanics || {};
    const lines = [];
    if (m.hitPoints != null) lines.push(`HP ${m.hitPoints}`);
    if (m.armorClass != null) lines.push(`AC ${m.armorClass}`);
    if (m.speed != null) lines.push(`Speed ${m.speed} ft`);
    if (m.proficiencyBonus != null) lines.push(`Proficiency +${m.proficiencyBonus}`);
    const savesArr = Array.isArray(m.savingThrows) ? m.savingThrows : [];
    if (savesArr.length) lines.push(`Saves: ${savesArr.map((s) => s.toUpperCase()).join(", ")}`);
    vaultDetailMechanics.innerHTML = lines.map((l) => `<div>${l}</div>`).join("");

    // Progression + resources (system-managed; not directly editable)
    const XP_THRESHOLD_BY_LEVEL = {
      1: 0,
      2: 300,
      3: 900,
      4: 2700,
      5: 6500,
      6: 14000,
      7: 23000,
      8: 34000,
      9: 48000,
      10: 64000,
      11: 85000,
      12: 100000,
      13: 120000,
      14: 140000,
      15: 165000,
      16: 195000,
      17: 225000,
      18: 265000,
      19: 305000,
      20: 355000,
    };

    const prog = character.progression || null;
    const levelFromProg = prog && typeof prog.level === "number" ? prog.level : null;
    const levelFromConcept =
      Array.isArray(character.concept?.classes) && character.concept.classes.length
        ? Number(character.concept.classes[0].level)
        : 1;
    const levelEffective = levelFromProg || (Number.isFinite(levelFromConcept) ? levelFromConcept : 1);

    const xp = prog && typeof prog.xp === "number" ? prog.xp : 0;
    const xpToNext = prog && typeof prog.xpToNextLevel === "number" ? prog.xpToNextLevel : null;
    const xpBase = XP_THRESHOLD_BY_LEVEL[levelEffective] || 0;
    const xpCeil = xpToNext != null ? xpToNext : (XP_THRESHOLD_BY_LEVEL[20] || 355000);
    const xpInto = Math.max(0, xp - xpBase);
    const xpSpan = Math.max(1, xpCeil - xpBase);
    const xpIntoClamped = Math.max(0, Math.min(xpSpan, xpInto));

    const hpMax = prog && prog.hp && typeof prog.hp.max === "number" ? prog.hp.max : (m.hitPoints != null ? m.hitPoints : 0);
    const hpCur = prog && prog.hp && typeof prog.hp.current === "number" ? prog.hp.current : hpMax;
    const manaMax = prog && prog.manaSlots && typeof prog.manaSlots.max === "number" ? prog.manaSlots.max : 0;
    const manaCur = prog && prog.manaSlots && typeof prog.manaSlots.current === "number" ? prog.manaSlots.current : manaMax;

    if (vaultDetailResources) {
      const rows = [];
      rows.push(
        `<div class="vault-resource__row">
          <div class="vault-resource__label">HP</div>
          <div class="vault-resource__value">
            <div>${hpCur} / ${hpMax}</div>
            <progress value="${Math.max(0, Math.min(hpMax, hpCur))}" max="${Math.max(1, hpMax)}"></progress>
          </div>
        </div>`
      );

      if (manaMax > 0) {
        rows.push(
          `<div class="vault-resource__row">
            <div class="vault-resource__label">Mana slots</div>
            <div class="vault-resource__value">
              <div>${manaCur} / ${manaMax}</div>
              <progress value="${Math.max(0, Math.min(manaMax, manaCur))}" max="${Math.max(1, manaMax)}"></progress>
            </div>
          </div>`
        );
      }

      rows.push(
        `<div class="vault-resource__row">
          <div class="vault-resource__label">XP</div>
          <div class="vault-resource__value">
            <div>Level ${levelEffective} · ${xp} XP</div>
            <progress value="${xpIntoClamped}" max="${xpSpan}"></progress>
          </div>
        </div>`
      );

      vaultDetailResources.innerHTML = rows.join("");
    }

    if (vaultLevelUpBtn) {
      const canLevelUp = !!(prog && prog.canLevelUp);
      vaultLevelUpBtn.hidden = !canLevelUp;
      vaultLevelUpBtn.disabled = !canLevelUp;
    }
    if (vaultLevelUpStatus) vaultLevelUpStatus.textContent = "";

    populateVaultCampaignSelect(character);

    vaultListView.hidden = true;
    vaultDetailView.hidden = false;
  }

  if (vaultLevelUpBtn) {
    vaultLevelUpBtn.addEventListener("click", async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || !activeCharacter) return;
      if (vaultLevelUpStatus) vaultLevelUpStatus.textContent = "Leveling up...";
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/characters/level-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser, characterId: activeCharacter.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || data.message || "Failed to level up.");
        }

        const updated = data.character;
        if (updated && updated.id) {
          // Update cache and rerender immediately.
          cachedVaultCharacters = cachedVaultCharacters.map((c) =>
            c.id === updated.id ? updated : c
          );
          renderVaultDetail(updated);
        }
        if (vaultLevelUpStatus) vaultLevelUpStatus.textContent = "Level up complete.";
      } catch (err) {
        console.error("Failed to level up", err);
        if (vaultLevelUpStatus) vaultLevelUpStatus.textContent = err.message || "Error leveling up.";
      }
    });
  }

  function openVaultDetail(characterId) {
    const ch = cachedVaultCharacters.find((c) => c.id === characterId);
    if (!ch) return;
    renderVaultDetail(ch);
  }

  // Auth wiring
  const initialUser = getCurrentUser();
  if (initialUser) {
    updateNav(initialUser);
    if (profileUsernameEl) profileUsernameEl.textContent = initialUser;
    showView("home");
  } else {
    updateNav(null);
    showView("auth-login");
  }

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", () => {
      setAuthMessage("");
      showView("auth-register");
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => {
      setAuthMessage("");
      showView("auth-login");
    });
  }

  if (forgeCharacterBtn) {
    forgeCharacterBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setForgeStatus("You need to be logged in to forge a character.");
        renderForgedCharacter(null);
        return;
      }

      if (!transcriptEl || !transcriptEl.value.trim()) {
        setForgeStatus(
          "Add some transcript text first so ADA has something to forge from."
        );
        renderForgedCharacter(null);
        return;
      }

      setForgeStatus("Forging character from transcript...");
      renderForgedCharacter(null);

      const narrativeText = transcriptEl.value.trim();
      const rawName = forgeCharacterNameInput && forgeCharacterNameInput.value
        ? forgeCharacterNameInput.value.trim()
        : "";

      apiPost("/api/characters/forge", {
        username: currentUser,
        narrativeText,
        name: rawName || null,
        portraitUrl: null,
        dryRun: true,
      }).then((result) => {
        if (!result.ok) {
          const msg = (result.data && result.data.error) ||
            "Could not forge character. Please try again.";
          setForgeStatus(msg);
          renderForgedCharacter(null);
          return;
        }

        const character = result.data && result.data.character;
        if (!character) {
          setForgeStatus("Forge succeeded but no character was returned.");
          renderForgedCharacter(null);
          return;
        }

        pendingForgedCharacter = character;
        pendingNarrativeText = narrativeText;
        pendingCharacterName = rawName || "";
        setForgeStatus("Preview ready. Pick a portrait, then finish character creation to save.");
        renderForgedCharacter(character);
        updateFinishCharacterButtonState();
      });
    });
  }

  if (finishCharacterBtn) {
    finishCharacterBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setForgeStatus("You need to be logged in to finish character creation.");
        return;
      }
      if (!pendingForgedCharacter || !pendingNarrativeText) {
        setForgeStatus("Forge a character from your transcript first.");
        return;
      }
      if (!hasSelectedPortrait()) {
        setForgeStatus("Choose a portrait before finishing character creation.");
        return;
      }

      let portraitUrl = null;
      try {
        portraitUrl = localStorage.getItem(PORTRAIT_STORAGE_KEY);
      } catch {
        portraitUrl = null;
      }

      setForgeStatus("Saving character to My Characters...");

      apiPost("/api/characters/forge", {
        username: currentUser,
        narrativeText: pendingNarrativeText,
        name: pendingCharacterName || null,
        portraitUrl,
        dryRun: false,
      }).then((result) => {
        if (!result.ok) {
          const msg = (result.data && result.data.error) ||
            "Could not save character. Please try again.";
          setForgeStatus(msg);
          return;
        }

        const character = result.data && result.data.character;
        if (!character) {
          setForgeStatus("Character saved, but response was missing details.");
          return;
        }

        pendingForgedCharacter = null;
        pendingNarrativeText = "";
        pendingCharacterName = "";
        if (forgeCharacterNameInput) forgeCharacterNameInput.value = "";
        setForgeStatus("Character added to My Characters.");
        renderForgedCharacter(character);
        updateFinishCharacterButtonState();

        // Jump to My Characters and open this new character's sheet
        showView("vault");
        renderVaultDetail(character);
      });
    });
  }

  if (vaultDeleteBtn) {
    vaultDeleteBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser || !activeCharacter) return;
      const confirmed = window.confirm(
        "Delete this character from your vault and all linked campaigns? This cannot be undone."
      );
      if (!confirmed) return;

      vaultDeleteStatus.textContent = "Deleting character...";
      fetch(`${BACKEND_BASE_URL}/api/characters/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, characterId: activeCharacter.id }),
      })
        .then((res) => res.json().then((data) => ({ res, data })).catch(() => ({ res, data: {} })))
        .then(({ res, data }) => {
          if (!res.ok || data.ok === false) {
            throw new Error(data.error || data.message || "Failed to delete character.");
          }
          vaultDeleteStatus.textContent = "Character deleted.";
          activeCharacter = null;
          vaultDetailView.hidden = true;
          vaultListView.hidden = false;
          loadVaultCharacters();
        })
        .catch((err) => {
          console.error("Failed to delete character", err);
          vaultDeleteStatus.textContent = err.message || "Error deleting character.";
        });
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const username = form.username.value.trim();
      const password = form.password.value;

      if (!username || !password) {
        setAuthMessage("Please enter username and password.");
        return;
      }

      setAuthMessage("Logging in...");

      apiPost("/api/login", { username, password }).then((result) => {
        if (!result.ok) {
          const msg = result.data && result.data.error;
          setAuthMessage(msg || "Invalid username or password.");
          return;
        }

        setCurrentUser(username);
        updateNav(username);
        if (profileUsernameEl) profileUsernameEl.textContent = username;
        setAuthMessage("");
        showView("home");
      });
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      console.log("[ADA DEBUG] Register form submitted");
      const form = event.currentTarget;
      const username = form.username.value.trim();
      const password = form.password.value;
      const passwordConfirm = form.passwordConfirm.value;

      if (!username || !password || !passwordConfirm) {
        setAuthMessage("Please fill in all fields.");
        return;
      }

      if (password !== passwordConfirm) {
        setAuthMessage("Passwords do not match.");
        return;
      }

      setAuthMessage("Creating account...");

      apiPost("/api/register", { username, password }).then((result) => {
        if (!result.ok) {
          const msg = result.data && result.data.error;
          if (result.status === 409) {
            setAuthMessage(msg || "That username is already taken.");
          } else {
            setAuthMessage(msg || "Could not create account.");
          }
          return;
        }

        setAuthMessage("Account created. Please log in.");
        showView("auth-login");
      });
    });
  }

  if (appNav) {
    appNav.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const view = target.getAttribute("data-view");
      if (!view) return;
      if (view === "home") {
        showView("home");
      } else if (view === "profile") {
        showView("profile");
      } else if (view === "campaigns") {
        activeCampaignId = null;
        activeCampaign = null;
        try {
          localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
        } catch {
          // ignore
        }
        showView("campaigns");
        loadCampaigns("all");
        loadAdventuresAndCharacters();
      } else if (view === "vault") {
        showView("vault");
      }
    });
  }

  if (vaultBackBtn) {
    vaultBackBtn.addEventListener("click", () => {
      vaultDetailView.hidden = true;
      vaultListView.hidden = false;
    });
  }

  if (vaultLinkBtn) {
    vaultLinkBtn.addEventListener("click", async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || !activeCharacter) return;
      const campaignId = vaultCampaignSelect.value;
      if (!campaignId) {
        vaultLinkStatus.textContent = "Please select a campaign first.";
        return;
      }
      vaultLinkStatus.textContent = "Linking character to campaign...";
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/campaigns/details`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            username: currentUser,
            action: "linkCharacter",
            characterId: activeCharacter.id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || data.message || "Failed to link character.");
        }
        vaultLinkStatus.textContent = "Character linked to campaign.";
        await loadVaultCharacters();
      } catch (err) {
        console.error("Failed to link character", err);
        vaultLinkStatus.textContent = err.message || "Error linking character.";
      }
    });
  }

  if (campaignBackBtn) {
    campaignBackBtn.addEventListener("click", () => {
      activeCampaignId = null;
      activeCampaign = null;
      try {
        localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
      } catch {
        // ignore
      }
      showView("campaigns");
      loadCampaigns("all");
    });
  }

  if (campaignDeleteBtn) {
    campaignDeleteBtn.addEventListener("click", () => {
      if (!activeCampaignId || !activeCampaign) return;
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const confirmed = window.confirm(
        "Delete this AI-driven solo campaign? This will remove it from your list. Characters remain intact.",
      );
      if (!confirmed) return;
      if (campaignActionStatusEl)
        campaignActionStatusEl.textContent = "Deleting campaign...";

      apiPost("/api/campaigns/details", {
        action: "deleteCampaign",
        campaignId: activeCampaignId,
        username: currentUser,
      }).then((result) => {
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not delete campaign.";
          if (campaignActionStatusEl) campaignActionStatusEl.textContent = msg;
          return;
        }

        if (campaignActionStatusEl)
          campaignActionStatusEl.textContent = "Campaign deleted.";
        activeCampaignId = null;
        activeCampaign = null;
        try {
          localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
        } catch {
          // ignore
        }
        showView("campaigns");
        loadCampaigns("all");
      });
    });
  }

  if (campaignCompleteBtn) {
    campaignCompleteBtn.addEventListener("click", () => {
      if (!activeCampaignId || !activeCampaign) return;
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const confirmed = window.confirm(
        "Mark this campaign as completed? This will award XP to all linked characters.",
      );
      if (!confirmed) return;

      if (campaignActionStatusEl)
        campaignActionStatusEl.textContent = "Completing campaign and awarding XP...";

      apiPost("/api/campaigns/details", {
        action: "completeCampaign",
        campaignId: activeCampaignId,
        username: currentUser,
      }).then((result) => {
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not complete campaign.";
          if (campaignActionStatusEl) campaignActionStatusEl.textContent = msg;
          return;
        }

        const xp = result.data && typeof result.data.xpAwarded === "number"
          ? result.data.xpAwarded
          : null;
        if (campaignActionStatusEl)
          campaignActionStatusEl.textContent = xp != null
            ? `Campaign completed. Awarded ${xp} XP.`
            : "Campaign completed.";

        // Refresh dashboard to update buttons + show any new state
        loadCampaignDetail(activeCampaignId);
      });
    });
  }

  if (campaignLeaveBtn) {
    campaignLeaveBtn.addEventListener("click", () => {
      if (!activeCampaignId || !activeCampaign) return;
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const confirmed = window.confirm(
        "Leave this campaign? You will be removed as a participant and your linked characters will be unlinked.",
      );
      if (!confirmed) return;
      if (campaignActionStatusEl)
        campaignActionStatusEl.textContent = "Leaving campaign...";

      apiPost("/api/campaigns/details", {
        action: "leaveCampaign",
        campaignId: activeCampaignId,
        username: currentUser,
      }).then((result) => {
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not leave campaign.";
          if (campaignActionStatusEl) campaignActionStatusEl.textContent = msg;
          return;
        }

        if (campaignActionStatusEl)
          campaignActionStatusEl.textContent = "You have left this campaign.";
        activeCampaignId = null;
        activeCampaign = null;
        try {
          localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
        } catch {
          // ignore
        }
        showView("campaigns");
        loadCampaigns("all");
      });
    });
  }

  campaignTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (!tab) return;
      setCampaignTab(tab);
    });
  });

  if (dialogueComposerEl) {
    dialogueComposerEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = dialogueTextInputEl ? dialogueTextInputEl.value.trim() : "";
      if (!text) return;
      handleDialoguePlayerInput(text, { source: "typing" });
    });
  }

  // Note: sending is now handled by the dialogue composer.

  if (campaignScriptGenerateBtn) {
    campaignScriptGenerateBtn.addEventListener("click", () => {
      if (!activeCampaignId) {
        if (campaignScriptStatusEl)
          campaignScriptStatusEl.textContent =
            "Open a campaign dashboard first to generate a script.";
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (campaignScriptStatusEl)
          campaignScriptStatusEl.textContent =
            "You need to be logged in to generate scripts.";
        return;
      }

      const prompt = campaignScriptPromptInput
        ? campaignScriptPromptInput.value.trim()
        : "";
      if (!prompt) {
        if (campaignScriptStatusEl)
          campaignScriptStatusEl.textContent =
            "Describe the situation or encounter you want first.";
        return;
      }

      if (campaignScriptStatusEl)
        campaignScriptStatusEl.textContent =
          "Generating an encounter script...";

      apiPost("/api/campaigns/details", {
        action: "addScript",
        campaignId: activeCampaignId,
        author: currentUser,
        prompt,
      }).then((result) => {
        if (!result.ok) {
          const msg = (result.data && result.data.error) ||
            "Could not generate script. Please try again.";
          if (campaignScriptStatusEl) campaignScriptStatusEl.textContent = msg;
          return;
        }

        const data = result.data || {};
        const scripts = Array.isArray(data.scripts)
          ? data.scripts
          : data.script
          ? [data.script]
          : [];
        renderCampaignScripts(scripts);
        if (campaignScriptStatusEl)
          campaignScriptStatusEl.textContent =
            "Encounter script added to your campaign.";
        if (campaignScriptPromptInput) campaignScriptPromptInput.value = "";
      });
    });
  }

  if (campaignCreateJournalsBtn) {
    campaignCreateJournalsBtn.addEventListener("click", () => {
      if (!activeCampaignId || !activeCampaign) return;
      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (campaignJournalsStatusEl)
          campaignJournalsStatusEl.textContent = "You need to be logged in to create journals.";
        return;
      }

      if (campaignJournalsStatusEl)
        campaignJournalsStatusEl.textContent = "Creating journals for each character...";

      apiPost("/api/campaigns/details", {
        action: "createPartyJournals",
        campaignId: activeCampaignId,
        username: currentUser,
      }).then((result) => {
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not create journals.";
          if (campaignJournalsStatusEl) campaignJournalsStatusEl.textContent = msg;
          return;
        }

        const data = result.data || {};
        const journals = Array.isArray(data.journals)
          ? data.journals
          : data.journal
          ? [data.journal]
          : [];

        renderCampaignJournals(journals);
        if (campaignJournalsStatusEl)
          campaignJournalsStatusEl.textContent =
            journals.length ? "Journals created." : "No journals were created.";
      });
    });
  }

  if (aiDmRollBtn) {
    aiDmRollBtn.addEventListener("click", () => {
      if (!activeCampaign || !isAIDmCampaign(activeCampaign)) return;

      const username = getCurrentUser();
      if (!username) {
        if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Log in to roll.";
        return;
      }

      // Only resolve a roll if ADA actually requested a check.
      const checkDescription = lastAiMechanics && lastAiMechanics.checkDescription
        ? String(lastAiMechanics.checkDescription).trim()
        : "";
      const dc = lastAiMechanics ? lastAiMechanics.dc : null;
      if (!checkDescription || checkDescription.toLowerCase() === "none" || !dc) {
        if (aiDmMechanicsEl)
          aiDmMechanicsEl.textContent = "No check to roll right now. Ask ADA what you do next.";
        return;
      }

      // Roll locally for transparency; send both dice so backend can pick based on adv/disadv.
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;

      if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Resolving roll...";

      apiPost("/api/ai-dm/resolve-check", {
        username,
        campaignId: activeCampaignId,
        roll1: r1,
        roll2: r2,
      }).then((result) => {
        if (!result.ok) {
          const msg = (result.data && result.data.error) || "Could not resolve check.";
          if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = msg;
          return;
        }

        const payload = result.data || {};
        const resolved = payload.result || {};
        const narrative = payload.narrative || "";
        const mechanics = payload.mechanics || null;
        const debug = payload.debug || null;

        const chosen = resolved.rolls && resolved.rolls.chosen ? resolved.rolls.chosen : r1;
        const total = typeof resolved.total === "number" ? resolved.total : null;
        const mode = resolved.rolls && resolved.rolls.mode ? resolved.rolls.mode : "none";
        const outcome = resolved.success ? "SUCCESS" : "FAILURE";
        const rollModeText = mode !== "none" ? ` (${mode})` : "";
        const rollLine =
          total != null
            ? `I attempt ${checkDescription} — roll${rollModeText}: ${chosen} (total ${total} vs DC ${dc}) → ${outcome}.`
            : `I attempt ${checkDescription} — roll${rollModeText}: ${chosen} → ${outcome}.`;

        appendAiDmLog("player", rollLine);

        if (narrative) appendAiDmLog("dm", narrative);

        lastAiMechanics = mechanics;

        if (mechanics && aiDmMechanicsEl) {
          const mDc = mechanics.dc;
          const mAbility = mechanics.ability;
          const mSkill = mechanics.skill;
          const mAdv = mechanics.advantage;
          const mDesc = mechanics.checkDescription;
          const mProgress = mechanics.progress;
          const pieces = [];
          if (mDesc && String(mDesc).trim()) pieces.push(String(mDesc).trim());
          if (mDc != null) pieces.push(`DC ${mDc}`);
          if (mAbility) pieces.push(String(mAbility).toUpperCase());
          if (mSkill) pieces.push(String(mSkill));
          if (mAdv === "advantage") pieces.push("(advantage)");
          if (mAdv === "disadvantage") pieces.push("(disadvantage)");
          if (mProgress && mProgress !== "stay") pieces.push(`(progress: ${mProgress})`);
          aiDmMechanicsEl.textContent =
            pieces.length ? `Check requested: ${pieces.join(" ")}` : "";
        } else if (aiDmMechanicsEl) {
          aiDmMechanicsEl.textContent = "";
        }

        const modelName =
          debug && debug.gemini && debug.gemini.model
            ? String(debug.gemini.model)
            : "";
        if (modelName && aiDmNoticeEl) {
          aiDmNoticeEl.hidden = false;
          aiDmNoticeEl.textContent =
            `ADA is acting as the Dungeon Master for this campaign. ` +
            `Type what your character does next and send it to continue the story. ` +
            `AI model: ${modelName}`;
        }
      }).catch((e) => {
        console.error("[ADA] resolve-check failed", e);
        if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Error resolving check.";
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Best-effort: stop any active speech capture so we don't keep updating UI after logout.
      try {
        isListening = false;
        if (recognition) recognition.stop();
      } catch {
        // ignore
      }

      // Clear app state that is tied to a logged-in user.
      activeCampaignId = null;
      activeCampaign = null;
      activeCharacter = null;
      activeCampaignCharacters = [];
      cachedPlayerSpeakerLabel = "You";

      try {
        localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
      } catch {
        // ignore
      }

      // Clear user-facing text areas / chat thread.
      if (transcriptEl) transcriptEl.value = "";
      if (campaignDialogueTranscriptEl) campaignDialogueTranscriptEl.value = "";
      if (dialogueContainerEl) dialogueContainerEl.innerHTML = "";
      if (dialogueTextInputEl) dialogueTextInputEl.value = "";

      clearCurrentUser();
      updateNav(null);
      setAuthMessage("");
      showView("auth-login");
    });
  }

  if (createCampaignForm) {
    createCampaignForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (campaignsMessage)
          campaignsMessage.textContent =
            "You need to be logged in to create a campaign.";
        return;
      }

      const name = campaignNameInput.value.trim();
      const rawParticipants = campaignParticipantsInput.value
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (!rawParticipants.includes(currentUser)) {
        rawParticipants.push(currentUser);
      }

      if (!name) {
        if (campaignsMessage)
          campaignsMessage.textContent =
            "Please give your campaign a name.";
        return;
      }

      if (campaignsMessage)
        campaignsMessage.textContent = "Creating campaign...";

      apiPost("/api/campaigns", {
        name,
        dm: currentUser,
        participants: rawParticipants,
      }).then((result) => {
        if (!result.ok) {
          if (
            result.status === 400 &&
            result.data &&
            result.data.error &&
            campaignsMessage
          ) {
            campaignsMessage.textContent = result.data.error;
          } else if (campaignsMessage) {
            campaignsMessage.textContent =
              "Could not create campaign. Please try again later.";
          }
          return;
        }

        campaignNameInput.value = "";
        campaignParticipantsInput.value = "";
        if (campaignsMessage) campaignsMessage.textContent = "Campaign created!";
        loadCampaigns("all");
      });
    });
  }

  if (campaignFilterAllBtn) {
    campaignFilterAllBtn.addEventListener("click", () => {
      loadCampaigns("all");
      loadAdventuresAndCharacters();
    });
  }
  if (campaignFilterDmBtn) {
    campaignFilterDmBtn.addEventListener("click", () => {
      loadCampaigns("dm");
      loadAdventuresAndCharacters();
    });
  }
  if (campaignFilterPlayerBtn) {
    campaignFilterPlayerBtn.addEventListener("click", () => {
      loadCampaigns("player");
      loadAdventuresAndCharacters();
    });
  }

  // Rules Lookup Event Listeners
  if (rulesLookupBtn) {
    rulesLookupBtn.addEventListener("click", performRulesLookup);
  }

  if (rulesLookupInput) {
    rulesLookupInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        performRulesLookup();
      }
    });
  }

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

  /**
   * Perform rules lookup by querying the backend
   */
  function performRulesLookup() {
    const query = rulesLookupInput.value.trim();

    if (!query) {
      if (rulesLookupMessage) {
        rulesLookupMessage.textContent = "Please enter a search query.";
      }
      return;
    }

    if (rulesLookupMessage) {
      rulesLookupMessage.textContent = "Searching...";
    }

    // Query the backend API
    apiPost("/api/srd/query", { query, k: 5 }).then((result) => {
      if (!result.ok) {
        if (rulesLookupMessage) {
          rulesLookupMessage.textContent =
            "Could not search rules. Please try again.";
        }
        return;
      }

      const data = result.data;
      rulesLookupState.results = data.results || [];
      rulesLookupState.currentIndex = 0;

      if (rulesLookupState.results.length === 0) {
        if (rulesLookupMessage) {
          rulesLookupMessage.textContent = "No results found for that query.";
        }
        rulesLookupResults.hidden = true;
        return;
      }

      displayRulesResult();
      if (rulesLookupMessage) {
        rulesLookupMessage.textContent = "";
      }
    });
  }

  /**
   * Display the current rules result
   */
  function displayRulesResult() {
    const result = rulesLookupState.results[rulesLookupState.currentIndex];

    if (!result) return;

    // Update title
    if (rulesResultTitle) {
      rulesResultTitle.textContent = result.title || "Unknown";
    }

    // Update text
    if (rulesResultText) {
      rulesResultText.textContent = result.text || "No content available.";
    }

    // Update source
    if (rulesResultSource) {
      const path = Array.isArray(result.path) ? result.path.join(" > ") : "";
      rulesResultSource.textContent = `Source: ${path || "D&D 5e SRD"}`;
    }

    // Update counter
    if (rulesLookupCounter) {
      rulesLookupCounter.textContent = `${rulesLookupState.currentIndex + 1} / ${rulesLookupState.results.length}`;
    }

    // Update navigation buttons
    if (rulesLookupPrevBtn) {
      rulesLookupPrevBtn.hidden = rulesLookupState.currentIndex === 0;
    }
    if (rulesLookupNextBtn) {
      rulesLookupNextBtn.hidden =
        rulesLookupState.currentIndex ===
        rulesLookupState.results.length - 1;
    }

    // Show results container
    rulesLookupResults.hidden = false;
  }
})();
