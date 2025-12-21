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
  const campaignTabButtons = Array.from(
    document.querySelectorAll(".campaign-tab-button")
  );
  const campaignTabPanels = Array.from(
    document.querySelectorAll(".campaign-tab-panel")
  );
  const campaignCharactersGrid = document.getElementById("campaignCharactersGrid");
  const campaignJournalsList = document.getElementById("campaignJournalsList");
  const campaignScriptsList = document.getElementById("campaignScriptsList");
  const campaignScriptPromptInput = document.getElementById("campaignScriptPrompt");
  const campaignScriptGenerateBtn = document.getElementById("campaignScriptGenerateBtn");
  const campaignScriptStatusEl = document.getElementById("campaignScriptStatus");
  const campaignDialogueStartBtn = document.getElementById("campaignDialogueStartBtn");
  const campaignDialogueStopBtn = document.getElementById("campaignDialogueStopBtn");
  const campaignDialogueStatusEl = document.getElementById("campaignDialogueStatus");
  const campaignDialogueTranscriptEl = document.getElementById("campaignDialogueTranscript");

  const vaultListView = document.getElementById("vaultListView");
  const vaultDetailView = document.getElementById("vaultDetailView");
  const vaultCharactersGrid = document.getElementById("vaultCharactersGrid");
  const vaultMessage = document.getElementById("vaultMessage");
  const vaultBackBtn = document.getElementById("vaultBackBtn");
  const vaultDetailName = document.getElementById("vaultDetailName");
  const vaultDetailMeta = document.getElementById("vaultDetailMeta");
  const vaultDetailPortrait = document.getElementById("vaultDetailPortrait");
  const vaultDetailConcept = document.getElementById("vaultDetailConcept");
  const vaultDetailAbilities = document.getElementById("vaultDetailAbilities");
  const vaultDetailMechanics = document.getElementById("vaultDetailMechanics");
  const vaultCampaignSelect = document.getElementById("vaultCampaignSelect");
  const vaultLinkBtn = document.getElementById("vaultLinkBtn");
  const vaultLinkStatus = document.getElementById("vaultLinkStatus");

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

  const PORTRAIT_STORAGE_KEY = "adaCurrentCharacterPortraitUrl";
  const CURRENT_USER_STORAGE_KEY = "adaCurrentUser";
  const ACTIVE_CAMPAIGN_STORAGE_KEY = "adaActiveCampaignId";

  let activeCampaignId = null;
  let activeCampaign = null;
  let activeCharacter = null;
  let cachedVaultCharacters = [];
  let cachedUserCampaigns = [];

  try {
    const storedCampaignId = localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
    if (storedCampaignId) {
      activeCampaignId = storedCampaignId;
    }
  } catch {
    // ignore storage issues
  }

  // Backend API base URL (Cloudflare Worker)
  const BACKEND_BASE_URL = "https://backend.ada-assistante.workers.dev";

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

  function setPortraitStatus(text) {
    if (!portraitStatusEl) return;
    portraitStatusEl.textContent = text || "";
  }

  function setForgeStatus(text) {
    if (!forgeStatusEl) return;
    forgeStatusEl.textContent = text || "";
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

    if (final) {
      lastFinal += final;
      const combinedFinal = lastFinal.trim();
      updateTranscript(combinedFinal, TranscriptMode.REPLACE);
      if (activeTranscriptContext === "dialogue") {
        logDialogueSnippet(final.trim(), combinedFinal);
      }
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
    }

    renderCampaignCharacters(characters);
    renderCampaignJournals(journals);
    renderCampaignScripts(scripts);
  }

  function openCampaignDashboard(campaign) {
    if (!campaign) return;
    activeCampaignId = campaign.id;
    activeCampaign = campaign;

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
        card.innerHTML = `
          <div class="vault-card__portrait" style="background-image: url('${(ch.portraitUrl || "").replace(/'/g, "&#39;")}')"></div>
          <div class="vault-card__name">${ch.name || "Unnamed Adventurer"}</div>
          <div class="vault-card__meta">${(ch.concept && ch.concept.summary) || "Mystery wanderer"}</div>
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
    vaultDetailConcept.textContent = character.concept?.summary || "No concept summary yet.";
    vaultDetailPortrait.style.backgroundImage = character.portraitUrl ? `url('${character.portraitUrl}')` : "none";

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

    populateVaultCampaignSelect(character);

    vaultListView.hidden = true;
    vaultDetailView.hidden = false;
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

      let portraitUrl = null;
      try {
        portraitUrl = localStorage.getItem(PORTRAIT_STORAGE_KEY);
      } catch {
        portraitUrl = null;
      }

      apiPost("/api/characters/forge", {
        username: currentUser,
        narrativeText,
        name: rawName || null,
        portraitUrl,
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

        setForgeStatus("Character forged. You can refine this later.");
        renderForgedCharacter(character);
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

  campaignTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (!tab) return;
      setCampaignTab(tab);
    });
  });

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

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
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
    campaignFilterAllBtn.addEventListener("click", () => loadCampaigns("all"));
  }
  if (campaignFilterDmBtn) {
    campaignFilterDmBtn.addEventListener("click", () => loadCampaigns("dm"));
  }
  if (campaignFilterPlayerBtn) {
    campaignFilterPlayerBtn.addEventListener("click", () =>
      loadCampaigns("player")
    );
  }
})();
