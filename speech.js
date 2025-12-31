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
  const viewForge = document.getElementById("viewForge");
  const viewHud = document.getElementById("viewHud");
  const switchToForgeBtn = document.getElementById("switchToForgeBtn");
  const switchToHudBtn = document.getElementById("switchToHudBtn");
  const extractionFeedEl = document.getElementById("extractionFeed");
  const autoPortraitsToggle = document.getElementById("autoPortraitsToggle");

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

  // GM Tactical Dashboard (Campaigns -> Script tab)
  const gmPartySummaryEl = document.getElementById("gmPartySummary");
  const gmPartyMembersEl = document.getElementById("gmPartyMembers");
  const gmEncounterSeedInput = document.getElementById("gmEncounterSeed");
  const gmEncounterGenerateBtn = document.getElementById("gmEncounterGenerateBtn");
  const gmEncounterStatusEl = document.getElementById("gmEncounterStatus");
  const gmEncounterResultsEl = document.getElementById("gmEncounterResults");
  const gmEncounterArchiveEl = document.getElementById("gmEncounterArchive");
  const gmFlavorSeedInput = document.getElementById("gmFlavorSeed");
  const gmFlavorGenerateBtn = document.getElementById("gmFlavorGenerateBtn");
  const gmFlavorSendToLogBtn = document.getElementById("gmFlavorSendToLogBtn");
  const gmFlavorStatusEl = document.getElementById("gmFlavorStatus");
  const gmFlavorOutputEl = document.getElementById("gmFlavorOutput");
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

  // Grand Library of Fate (Public Templates)
  const templatesList = document.getElementById("templatesList");
  const templatesMessage = document.getElementById("templatesMessage");
  const templateSearchInput = document.getElementById("templateSearchInput");
  const templateTagFilter = document.getElementById("templateTagFilter");
  const templateSortSelect = document.getElementById("templateSortSelect");
  const templateEligibleOnly = document.getElementById("templateEligibleOnly");

  const templateResultsCount = document.getElementById("templateResultsCount");
  const templateClearFiltersBtn = document.getElementById("templateClearFiltersBtn");

  const adventureSearchInput = document.getElementById("adventureSearchInput");
  const adventureSortSelect = document.getElementById("adventureSortSelect");
  const adventureEligibleOnly = document.getElementById("adventureEligibleOnly");

  const adventureResultsCount = document.getElementById("adventureResultsCount");
  const adventureClearFiltersBtn = document.getElementById("adventureClearFiltersBtn");

  const publishTemplateForm = document.getElementById("publishTemplateForm");
  const templateNameInput = document.getElementById("templateName");
  const templateCanonEventsEl = document.getElementById("templateCanonEvents");
  const addCanonEventBtn = document.getElementById("addCanonEventBtn");
  const publishTemplateStatusEl = document.getElementById("publishTemplateStatus");

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

  const PORTRAIT_STORAGE_KEY = "adaCurrentCharacterPortraitUrl";
  const CURRENT_USER_STORAGE_KEY = "adaCurrentUser";
  const ACTIVE_CAMPAIGN_STORAGE_KEY = "adaActiveCampaignId";
  const ACTIVE_CHARACTER_STORAGE_KEY = "adaActiveCharacterId";
  const POST_SELECT_TARGET_STORAGE_KEY = "adaPostSelectTarget";

  const CURRENT_PAGE = (() => {
    try {
      return String(document.body && document.body.dataset && document.body.dataset.page ? document.body.dataset.page : "spa");
    } catch {
      return "spa";
    }
  })();

  const MULTI_PAGE = CURRENT_PAGE !== "spa";

  function pageHref(page) {
    switch (page) {
      case "auth":
      case "auth-login":
      case "auth-register":
        return "index.html";
      case "forge":
        return "forge.html";
      case "hud":
        return "hud.html";
      case "vault":
        return "vault.html";
      case "library":
        return "library.html";
      case "campaigns":
      case "campaign-detail":
        return "campaigns.html";
      case "profile":
        return "profile.html";
      default:
        return null;
    }
  }

  // Library page creation mode toggle (Human / AI / Architect)
  const createModeHumanBtn = document.getElementById("createModeHumanBtn");
  const createModeAiBtn = document.getElementById("createModeAiBtn");
  const createModeArchitectBtn = document.getElementById("createModeArchitectBtn");
  const createModeHumanPanel = document.getElementById("createModeHumanPanel");
  const createModeAiPanel = document.getElementById("createModeAiPanel");
  const createModeArchitectPanel = document.getElementById("createModeArchitectPanel");

  function setLibraryCreateMode(mode) {
    if (createModeHumanPanel) createModeHumanPanel.hidden = mode !== "human";
    if (createModeAiPanel) createModeAiPanel.hidden = mode !== "ai";
    if (createModeArchitectPanel)
      createModeArchitectPanel.hidden = mode !== "architect";

    const setSelected = (btn, selected) => {
      if (!btn) return;
      try {
        btn.setAttribute("aria-selected", selected ? "true" : "false");
      } catch {
        // ignore
      }
    };
    setSelected(createModeHumanBtn, mode === "human");
    setSelected(createModeAiBtn, mode === "ai");
    setSelected(createModeArchitectBtn, mode === "architect");
  }

  function wireLibraryCreateModeToggle() {
    if (!createModeHumanBtn && !createModeAiBtn && !createModeArchitectBtn) return;

    if (createModeHumanBtn)
      createModeHumanBtn.addEventListener("click", () => setLibraryCreateMode("human"));
    if (createModeAiBtn)
      createModeAiBtn.addEventListener("click", () => {
        setLibraryCreateMode("ai");
        loadAdventuresAndCharacters();
      });
    if (createModeArchitectBtn)
      createModeArchitectBtn.addEventListener("click", () => {
        setLibraryCreateMode("architect");
        // Ensure builder is seeded
        if (templateCanonEventsEl && templateCanonEventsEl.children.length === 0) {
          createCanonEventRow();
        }
      });

    // Default
    setLibraryCreateMode("human");
  }

  function wireLibrarySearchAndFilters() {
    // Templates
    const rerenderTemplates = () => {
      updateTemplateTagOptions(cachedPublicTemplates);
      applyTemplateFiltersAndRender();
    };
    if (templateSearchInput) templateSearchInput.addEventListener("input", rerenderTemplates);
    if (templateTagFilter) templateTagFilter.addEventListener("change", rerenderTemplates);
    if (templateSortSelect) templateSortSelect.addEventListener("change", rerenderTemplates);
    if (templateEligibleOnly) templateEligibleOnly.addEventListener("change", rerenderTemplates);

    if (templateClearFiltersBtn)
      templateClearFiltersBtn.addEventListener("click", () => {
        if (templateSearchInput) templateSearchInput.value = "";
        if (templateTagFilter) templateTagFilter.value = "";
        if (templateSortSelect) templateSortSelect.value = "relevance";
        if (templateEligibleOnly) templateEligibleOnly.checked = false;
        rerenderTemplates();
      });

    // Adventures
    const rerenderAdventures = () => {
      applyAdventureFiltersAndRender(cachedAdventures, cachedAdventureCharacters);
    };
    if (adventureSearchInput) adventureSearchInput.addEventListener("input", rerenderAdventures);
    if (adventureSortSelect) adventureSortSelect.addEventListener("change", rerenderAdventures);
    if (adventureEligibleOnly) adventureEligibleOnly.addEventListener("change", rerenderAdventures);

    if (adventureClearFiltersBtn)
      adventureClearFiltersBtn.addEventListener("click", () => {
        if (adventureSearchInput) adventureSearchInput.value = "";
        if (adventureSortSelect) adventureSortSelect.value = "relevance";
        if (adventureEligibleOnly) adventureEligibleOnly.checked = false;
        rerenderAdventures();
      });
  }

  function navigateTo(page) {
    const href = pageHref(page);
    if (!href) return;
    // Avoid reloading the same page.
    if (href === (window.location && window.location.pathname ? window.location.pathname.split("/").pop() : "")) {
      return;
    }
    window.location.href = href;
  }

  function setPostSelectTarget(targetPage) {
    try {
      if (targetPage) {
        localStorage.setItem(POST_SELECT_TARGET_STORAGE_KEY, String(targetPage));
      } else {
        localStorage.removeItem(POST_SELECT_TARGET_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  function consumePostSelectTarget() {
    try {
      const t = localStorage.getItem(POST_SELECT_TARGET_STORAGE_KEY);
      if (t) localStorage.removeItem(POST_SELECT_TARGET_STORAGE_KEY);
      return t ? String(t) : null;
    } catch {
      return null;
    }
  }

  function emitAdaEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // ignore
    }
  }

  function notifyActiveCharacterChanged() {
    emitAdaEvent("ada:active-character-changed", { character: activeCharacter || null });
  }

  function notifyActiveCampaignChanged() {
    emitAdaEvent("ada:active-campaign-changed", {
      campaignId: activeCampaignId || null,
      campaign: activeCampaign || null,
    });
  }

  let activeCampaignId = null;
  let activeCampaign = null;
  let activeCharacter = null;
  let activeCampaignCharacters = [];
  let activeCampaignPartyStatus = null;
  let activeCampaignEncounters = [];
  let activeCampaignCanUseGmTools = false;
  let cachedPlayerSpeakerLabel = "You";

  let currentWorkspaceView = "forge"; // "forge" | "hud"
  let awaitingHudCharacterSelect = false;
  let lastAutoPortraitAt = 0;
  let lastAutoPortraitSignature = "";
  let extractionUpdateTimer = null;
  // Backend API base URL (Cloudflare Worker)
  // Automatically use localhost for development, production URL otherwise
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
  const BACKEND_BASE_URL = isDevelopment
    ? "http://localhost:8787"
    : "https://backend.ada-assistante.workers.dev";
  let cachedAdventures = [];
  let cachedAdventureCharacters = [];
  let cachedPublicTemplates = [];
  let cachedUserCampaigns = [];
  let cachedVaultCharacters = [];
  let lastAiMechanics = null;
  let pendingForgedCharacter = null;
  let pendingNarrativeText = "";
  let pendingCharacterName = "";
  let storedActiveCharacterId = null;

  try {
    const storedCampaignId = localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
    if (storedCampaignId) {
      activeCampaignId = storedCampaignId;
    }

    const storedCharId = localStorage.getItem(ACTIVE_CHARACTER_STORAGE_KEY);
    if (storedCharId) {
      storedActiveCharacterId = String(storedCharId);
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

  function setWorkspaceView(next) {
    const view = next === "hud" ? "hud" : "forge";
    currentWorkspaceView = view;

    if (viewForge) viewForge.hidden = view !== "forge";
    if (viewHud) viewHud.hidden = view !== "hud";

    if (switchToForgeBtn) {
      const selected = view === "forge";
      switchToForgeBtn.setAttribute("aria-selected", selected ? "true" : "false");
    }
    if (switchToHudBtn) {
      const selected = view === "hud";
      switchToHudBtn.setAttribute("aria-selected", selected ? "true" : "false");
    }
  }

  function setActiveCharacter(character, { persist = true } = {}) {
    activeCharacter = character || null;
    notifyActiveCharacterChanged();
    if (!persist) return;
    try {
      if (activeCharacter && activeCharacter.id) {
        localStorage.setItem(ACTIVE_CHARACTER_STORAGE_KEY, String(activeCharacter.id));
      } else {
        localStorage.removeItem(ACTIVE_CHARACTER_STORAGE_KEY);
      }
    } catch {
      // ignore storage issues
    }
  }

  function requestHudCharacterSelection(message) {
    awaitingHudCharacterSelect = true;
    if (message) {
      emitAdaEvent("ada:hud-message", { message: String(message) });
    }
    if (MULTI_PAGE) {
      setPostSelectTarget("hud");
    }
    showView("vault");
  }

  function hashStringToInt(str) {
    // small deterministic hash for auto-portrait seeds
    const s = String(str || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  function generatePortraits({ mode: generationMode } = {}) {
    const prompt = buildPortraitPrompt();
    if (!prompt) {
      setPortraitStatus("Add some transcript text first, then we can generate portraits from it.");
      return;
    }

    const modeLabel = generationMode === "auto" ? "Updating" : "Generating";
    setPortraitStatus(`${modeLabel} portraits…`);

    const baseSeed = generationMode === "auto"
      ? hashStringToInt(prompt) % 1_000_000_000
      : Math.floor(Math.random() * 1_000_000_000);

    portraitImgs.forEach((img, index) => {
      if (!img) return;
      const seed = baseSeed + index;
      const url = buildPortraitImageUrl(prompt, seed);
      img.hidden = false;
      img.src = url;
    });

    enablePortraitSelection();
  }

  function extractNarrativeGems(text) {
    const raw = String(text || "");
    const t = raw.toLowerCase();
    const gems = [];

    const classes = [
      "barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard","artificer"
    ];
    const races = [
      "human","elf","dwarf","halfling","gnome","half-elf","half elf","half-orc","half orc","tiefling","dragonborn","orc","goblin","goliath","aasimar"
    ];
    const backgrounds = [
      "acolyte","criminal","folk hero","noble","sage","soldier","urchin","entertainer","hermit","outlander","charlatan","guild artisan","sailor"
    ];

    const foundClass = classes.find((c) => t.includes(c));
    if (foundClass) gems.push({ kind: "Class", value: foundClass });

    const foundRace = races.find((r) => t.includes(r));
    if (foundRace) gems.push({ kind: "Race", value: foundRace.replace(/\b\w/g, (m) => m.toUpperCase()) });

    const foundBg = backgrounds.find((b) => t.includes(b));
    if (foundBg) gems.push({ kind: "Background", value: foundBg.replace(/\b\w/g, (m) => m.toUpperCase()) });

    // Alignment hint
    const align = t.match(/\b(lawful|neutral|chaotic)\s+(good|neutral|evil)\b/);
    if (align) {
      gems.push({ kind: "Alignment", value: `${align[1]} ${align[2]}`.replace(/\b\w/g, (m) => m.toUpperCase()) });
    }

    // A couple of narrative motifs that help the vibe feel "alive"
    const motifs = [
      { k: "Theme", rx: /\b(vengeance|redemption|oath|destiny|prophecy)\b/i },
      { k: "Gear", rx: /\b(dagger|rapier|longsword|bow|spellbook|staff|cloak)\b/i },
    ];
    motifs.forEach((m) => {
      const match = raw.match(m.rx);
      if (match) gems.push({ kind: m.k, value: match[1] });
    });

    // Dedupe by kind and value
    const seen = new Set();
    return gems
      .map((g) => ({ ...g, value: String(g.value || "").trim() }))
      .filter((g) => g.value)
      .filter((g) => {
        const key = `${g.kind}:${g.value.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  function renderExtractionFeed(text) {
    if (!extractionFeedEl) return;
    const gems = extractNarrativeGems(text);
    extractionFeedEl.innerHTML = "";
    gems.forEach((g) => {
      const li = document.createElement("li");
      li.className = "extraction__item";
      const span = document.createElement("span");
      span.className = "extraction__tag";
      span.innerHTML = `<b>Detected ${g.kind}:</b> ${String(g.value)}`;
      li.appendChild(span);
      extractionFeedEl.appendChild(li);
    });
  }

  function scheduleExtractionUpdate(text) {
    if (!extractionFeedEl) return;
    if (extractionUpdateTimer) window.clearTimeout(extractionUpdateTimer);
    extractionUpdateTimer = window.setTimeout(() => {
      renderExtractionFeed(text);
    }, 160);
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

    // Forge extras: extraction feed + auto portraits.
    if (target === transcriptEl) {
      scheduleExtractionUpdate(target.value || "");

      const wantsAuto = !!(autoPortraitsToggle && autoPortraitsToggle.checked);
      if (wantsAuto && isListening) {
        const signature = (target.value || "").trim().slice(0, 280);
        const now = Date.now();
        // Throttle auto-portrait refreshes so we don't hammer the image endpoint.
        if (
          signature.length >= 40 &&
          (now - lastAutoPortraitAt) > 6500 &&
          signature !== lastAutoPortraitSignature
        ) {
          lastAutoPortraitAt = now;
          lastAutoPortraitSignature = signature;
          generatePortraits({ mode: "auto" });
        }
      }
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
    // view: "auth-login" | "auth-register" | "forge" | "hud" | "home" | "profile" | "campaigns" | "campaign-detail" | "vault"
    // ("home" is kept as a backwards-compatible alias for "forge")
    let next = view === "home" ? "forge" : view;

    if (next === "hud" && !activeCharacter) {
      awaitingHudCharacterSelect = true;
      next = "vault";
    }

    // Multi-page mode: only navigate when the target page is a different document.
    // This keeps same-page toggles working (e.g. login <-> register on index.html).
    if (MULTI_PAGE) {
      const href = pageHref(next);
      const currentHref = window.location && window.location.pathname
        ? window.location.pathname.split("/").pop()
        : "";
      if (href && href !== currentHref) {
        navigateTo(next);
        return;
      }
      // fall through for internal view toggles (e.g. auth-login/auth-register, campaign-detail)
    }

    const isAuthView = next === "auth-login" || next === "auth-register";
    const isWorkspaceView = next === "forge" || next === "hud";
    const isCampaignView = next === "campaigns" || next === "campaign-detail";
    const isVaultView = next === "vault";

    if (authSection) authSection.hidden = !isAuthView;
    if (loginView) loginView.hidden = next !== "auth-login";
    if (registerView) registerView.hidden = next !== "auth-register";
    if (homeSection) homeSection.hidden = !isWorkspaceView;
    if (profileSection) profileSection.hidden = next !== "profile";
    if (campaignsSection) campaignsSection.hidden = !isCampaignView;

    if (isWorkspaceView) {
      setWorkspaceView(next);
      if (next === "hud") {
        notifyActiveCharacterChanged();
      }
    }
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
      if (next === "campaigns") {
        campaignsListView.hidden = false;
        campaignDetailView.hidden = true;
      } else if (next === "campaign-detail") {
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
      generatePortraits({ mode: "manual" });
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

  function normText(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function characterIsUnlinked(ch) {
    const ids = Array.isArray(ch?.campaignIds)
      ? ch.campaignIds.map((cid) => String(cid || "").trim()).filter(Boolean)
      : [];
    return ids.length === 0;
  }

  function templateSearchBlob(t) {
    const tags = safeArray(t?.templateTags || t?.tags).map((x) => String(x || "").trim());
    const canonTitles = safeArray(t?.canonTimeline).map((ev) => `${ev?.title || ""} ${ev?.description || ""}`);
    return normText([
      t?.name,
      t?.creatorUsername,
      t?.dm,
      t?.templateSummary,
      ...tags,
      ...canonTitles,
    ].join(" \n "));
  }

  function scoreRelevance(haystack, query) {
    const q = normText(query);
    if (!q) return 0;
    const h = normText(haystack);
    if (!h) return 0;
    const terms = q.split(" ").filter(Boolean);
    let score = 0;
    for (const term of terms) {
      if (h.includes(term)) score += 1;
    }
    // Small boost for exact phrase match.
    if (h.includes(q)) score += 2;
    return score;
  }

  function updateTemplateTagOptions(templates) {
    if (!templateTagFilter) return;
    const current = String(templateTagFilter.value || "");
    const tags = new Set();
    safeArray(templates).forEach((t) => {
      safeArray(t?.templateTags || t?.tags).forEach((tag) => {
        const clean = String(tag || "").trim();
        if (clean) tags.add(clean);
      });
    });
    const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b));

    templateTagFilter.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All tags";
    templateTagFilter.appendChild(allOpt);
    sorted.forEach((tag) => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      templateTagFilter.appendChild(opt);
    });

    // Try to restore previous selection.
    if (current && sorted.includes(current)) templateTagFilter.value = current;
  }

  function applyTemplateFiltersAndRender() {
    if (!templatesList) return;
    const templates = Array.isArray(cachedPublicTemplates) ? cachedPublicTemplates : [];
    const query = templateSearchInput ? templateSearchInput.value : "";
    const tag = templateTagFilter ? String(templateTagFilter.value || "") : "";
    const sortMode = templateSortSelect ? String(templateSortSelect.value || "relevance") : "relevance";
    const eligibleOnly = templateEligibleOnly ? Boolean(templateEligibleOnly.checked) : false;

    const totalCount = templates.length;
    const anyFilter = Boolean((query && String(query).trim()) || tag || eligibleOnly);
    const canClear = Boolean(anyFilter || sortMode !== "relevance");
    if (templateClearFiltersBtn) templateClearFiltersBtn.disabled = !canClear;

    const eligibleChars = getEligibleTemplateCharacters();

    const filtered = templates
      .map((t) => {
        const blob = templateSearchBlob(t);
        const score = scoreRelevance(blob, query);
        return { t, blob, score };
      })
      .filter(({ t, blob, score }) => {
        if (query && score <= 0) return false;
        if (tag) {
          const tags = safeArray(t?.templateTags || t?.tags).map((x) => String(x || "").trim());
          if (!tags.includes(tag)) return false;
        }
        if (eligibleOnly) {
          return eligibleChars.length > 0;
        }
        return Boolean(blob || t);
      });

    filtered.sort((a, b) => {
      if (sortMode === "newest") {
        const ad = Date.parse(a.t?.createdAt || "") || 0;
        const bd = Date.parse(b.t?.createdAt || "") || 0;
        return bd - ad;
      }
      if (sortMode === "canon") {
        const ac = Array.isArray(a.t?.canonTimeline) ? a.t.canonTimeline.length : 0;
        const bc = Array.isArray(b.t?.canonTimeline) ? b.t.canonTimeline.length : 0;
        return bc - ac;
      }
      if (sortMode === "architect") {
        const an = String(a.t?.creatorUsername || a.t?.dm || "");
        const bn = String(b.t?.creatorUsername || b.t?.dm || "");
        return an.localeCompare(bn) || String(a.t?.name || "").localeCompare(String(b.t?.name || ""));
      }
      if (sortMode === "title") {
        return String(a.t?.name || "").localeCompare(String(b.t?.name || ""));
      }
      // relevance default
      if (b.score !== a.score) return b.score - a.score;
      const bd = Date.parse(b.t?.createdAt || "") || 0;
      const ad = Date.parse(a.t?.createdAt || "") || 0;
      return bd - ad;
    });

    const finalTemplates = filtered.map((x) => x.t);
    renderPublicTemplates(finalTemplates);

    if (templateResultsCount) {
      templateResultsCount.textContent = `Showing ${finalTemplates.length} of ${totalCount}`;
    }

    if (templatesMessage && !finalTemplates.length) {
      // Avoid overriding the real empty-state (no templates published).
      if (totalCount > 0 && anyFilter) {
        templatesMessage.textContent = "No templates match your filters.";
      }
    }
  }

  function adventureSearchBlob(adv) {
    return normText([adv?.title, adv?.summary, adv?.difficulty, adv?.id].join(" \n "));
  }

  function getEligibleAdventureCharactersFor(adv, characters) {
    const chars = Array.isArray(characters) ? characters : [];
    const levelMin = adv?.levelMin ?? 1;
    const levelMax = adv?.levelMax ?? levelMin;
    return chars.filter((ch) => {
      if (!characterIsUnlinked(ch)) return false;
      const lvl = computeCharacterTotalLevel(ch);
      return lvl >= levelMin && lvl <= levelMax;
    });
  }

  function applyAdventureFiltersAndRender(adventures, characters) {
    if (!adventuresList) return;
    const query = adventureSearchInput ? adventureSearchInput.value : "";
    const sortMode = adventureSortSelect ? String(adventureSortSelect.value || "relevance") : "relevance";
    const eligibleOnly = adventureEligibleOnly ? Boolean(adventureEligibleOnly.checked) : false;

    const totalCount = safeArray(adventures).length;
    const anyFilter = Boolean((query && String(query).trim()) || eligibleOnly);
    const canClear = Boolean(anyFilter || sortMode !== "relevance");
    if (adventureClearFiltersBtn) adventureClearFiltersBtn.disabled = !canClear;

    const items = safeArray(adventures)
      .map((adv) => {
        const blob = adventureSearchBlob(adv);
        const score = scoreRelevance(blob, query);
        const eligible = getEligibleAdventureCharactersFor(adv, characters);
        return { adv, blob, score, eligible };
      })
      .filter(({ score, eligible }) => {
        if (query && score <= 0) return false;
        if (eligibleOnly && (!eligible || eligible.length === 0)) return false;
        return true;
      });

    items.sort((a, b) => {
      if (sortMode === "title") {
        return String(a.adv?.title || "").localeCompare(String(b.adv?.title || ""));
      }
      if (sortMode === "level") {
        const aMin = a.adv?.levelMin ?? 1;
        const bMin = b.adv?.levelMin ?? 1;
        const aMax = a.adv?.levelMax ?? aMin;
        const bMax = b.adv?.levelMax ?? bMin;
        return aMin - bMin || aMax - bMax || String(a.adv?.title || "").localeCompare(String(b.adv?.title || ""));
      }
      // relevance default
      if (b.score !== a.score) return b.score - a.score;
      return String(a.adv?.title || "").localeCompare(String(b.adv?.title || ""));
    });

    renderAdventures(items.map((x) => x.adv), characters);
    if (adventureResultsCount) {
      adventureResultsCount.textContent = `Showing ${items.length} of ${totalCount}`;
    }

    if (adventuresMessage && items.length === 0) {
      // Avoid overriding the real empty-state (no adventures published).
      if (totalCount > 0 && anyFilter) {
        adventuresMessage.textContent = "No adventures match your filters.";
      }
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

      applyAdventureFiltersAndRender(adventures, characters);

      // Templates use the same character pool; refresh selects once characters are known.
      if (templatesList && Array.isArray(cachedPublicTemplates) && cachedPublicTemplates.length) {
        applyTemplateFiltersAndRender();
      }
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
          const unlinked = characterIsUnlinked(ch);
          const opt = document.createElement("option");
          opt.value = ch.id;
          opt.textContent = `${ch.name || "Unnamed"} (Lv ${lvl})`;
          if (!unlinked) {
            opt.disabled = true;
            opt.textContent += " – already linked to a campaign";
          } else if (!meets) {
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
          const data = result.data || {};
          status.textContent = "Adventure started. Opening campaign...";
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

  function getEligibleTemplateCharacters() {
    const chars = Array.isArray(cachedAdventureCharacters)
      ? cachedAdventureCharacters
      : [];
    return chars.filter((ch) => {
      const ids = Array.isArray(ch?.campaignIds)
        ? ch.campaignIds.map((cid) => String(cid || "").trim()).filter(Boolean)
        : [];
      return ids.length === 0;
    });
  }

  function renderPublicTemplates(templates) {
    if (!templatesList) return;
    templatesList.innerHTML = "";

    if (!Array.isArray(templates) || templates.length === 0) {
      if (templatesMessage)
        templatesMessage.textContent =
          "No Master Templates have been published yet.";
      return;
    }

    if (templatesMessage) templatesMessage.textContent = "";

    const eligibleChars = getEligibleTemplateCharacters();

    templates.forEach((t) => {
      const card = document.createElement("article");
      card.className = "template-card";

      const header = document.createElement("div");
      header.className = "template-card__header";

      const title = document.createElement("h4");
      title.className = "template-card__title";
      title.textContent = t.name || "Untitled template";

      const meta = document.createElement("p");
      meta.className = "template-card__meta text-muted";
      const creator = t.creatorUsername || t.dm || "Unknown Architect";
      const canonCount = Array.isArray(t.canonTimeline) ? t.canonTimeline.length : 0;
      meta.textContent = `Architect: ${creator} · Canon Events: ${canonCount}`;

      header.appendChild(title);
      header.appendChild(meta);
      card.appendChild(header);

      const controls = document.createElement("div");
      controls.className = "template-card__controls";

      const select = document.createElement("select");
      select.className = "template-card__select";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = eligibleChars.length
        ? "Choose a character (must be unlinked)"
        : "No eligible characters (unlink one first)";
      select.appendChild(placeholder);

      eligibleChars.forEach((ch) => {
        const opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = ch.name || "Unnamed";
        select.appendChild(opt);
      });

      const joinBtn = document.createElement("button");
      joinBtn.type = "button";
      joinBtn.className = "btn btn--primary btn--small";
      joinBtn.textContent = "Join template";
      joinBtn.disabled = !eligibleChars.length;

      const status = document.createElement("span");
      status.className = "status";
      status.textContent = "";

      joinBtn.addEventListener("click", async () => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          status.textContent = "Log in to start a run.";
          return;
        }
        const characterId = select.value;
        if (!characterId) {
          status.textContent = "Choose a character first.";
          return;
        }
        status.textContent = "Instantiating private run...";
        const result = await apiPost("/api/templates/instantiate", {
          username: currentUser,
          templateId: t.id,
          characterId,
        });
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not start template run.";
          status.textContent = msg;
          return;
        }
        status.textContent = "Run created. Opening campaign...";
        const campaign = result.data && result.data.campaign;
        if (campaign) {
          openCampaignDashboard(campaign);
          setCampaignTab("dialogue");
        }
      });

      controls.appendChild(select);
      controls.appendChild(joinBtn);
      controls.appendChild(status);
      card.appendChild(controls);

      templatesList.appendChild(card);
    });
  }

  async function loadPublicTemplates() {
    if (!templatesList) return;
    if (templatesMessage) templatesMessage.textContent = "Loading templates...";
    const result = await apiGet("/api/templates/public");
    if (!result.ok) {
      if (templatesMessage)
        templatesMessage.textContent =
          "Could not load the Grand Library. Please try again later.";
      return;
    }
    const templates =
      result.data && Array.isArray(result.data.templates)
        ? result.data.templates
        : [];
    cachedPublicTemplates = templates;
    updateTemplateTagOptions(templates);
    applyTemplateFiltersAndRender();
  }

  function createCanonEventRow({ title = "", description = "", nudgeIdeas = "" } = {}) {
    if (!templateCanonEventsEl) return;
    const row = document.createElement("div");
    row.className = "canon-event";

    row.innerHTML = `
      <div class="field">
        <label>Event title</label>
        <input type="text" class="canon-event__title" value="${String(title).replace(/"/g, "&quot;")}" placeholder="A door opens in the stacks" required />
      </div>
      <div class="field">
        <label>Event description</label>
        <textarea class="canon-event__description output__text" rows="3" placeholder="What must happen, no matter what?" required>${String(description)}</textarea>
      </div>
      <div class="field">
        <label>Nudge Ideas (optional, one per line)</label>
        <textarea class="canon-event__nudges output__text" rows="2" placeholder="A messenger interrupts\nA locked gate forces a detour\nAn NPC begs for help">${String(
          nudgeIdeas
        )}</textarea>
      </div>
      <div class="canon-event__actions">
        <button type="button" class="btn btn--secondary btn--small canon-event__remove">Remove</button>
      </div>
    `;

    const removeBtn = row.querySelector(".canon-event__remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        row.remove();
      });
    }

    templateCanonEventsEl.appendChild(row);
  }

  function collectCanonEventsFromBuilder() {
    if (!templateCanonEventsEl) return [];
    const rows = Array.from(templateCanonEventsEl.querySelectorAll(".canon-event"));
    return rows
      .map((row) => {
        const title = row.querySelector(".canon-event__title")?.value?.trim() || "";
        const description = row
          .querySelector(".canon-event__description")
          ?.value?.trim() || "";
        const nudgeIdeasText = row.querySelector(".canon-event__nudges")?.value || "";
        const nudgeIdeas = String(nudgeIdeasText)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return { title, description, nudgeIdeas };
      })
      .filter((ev) => ev.title && ev.description);
  }

  function isAIDmCampaign(campaign) {
    if (!campaign) return false;
    return campaign.dmIsAI === true || campaign.mode === "ai-solo";
  }

  function setGmToolsVisibility({ canUse }) {
    const gmTabBtn = campaignTabButtons.find(
      (b) => b && b.getAttribute && b.getAttribute("data-tab") === "script"
    );
    const gmTabPanel = campaignTabPanels.find(
      (p) => p && p.getAttribute && p.getAttribute("data-tab") === "script"
    );

    activeCampaignCanUseGmTools = !!canUse;

    if (gmTabBtn) {
      gmTabBtn.hidden = !canUse;
      gmTabBtn.disabled = !canUse;
      gmTabBtn.style.display = canUse ? "" : "none";
      gmTabBtn.setAttribute("aria-disabled", canUse ? "false" : "true");
      if (!canUse) {
        gmTabBtn.classList.remove("campaign-tab-button--active");
        gmTabBtn.removeAttribute("aria-current");
      }
    }
    if (!canUse && gmTabPanel) {
      gmTabPanel.hidden = true;
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

    const isHiddenHand = activeCampaign && activeCampaign.mode === "template-run";

    const trimmed = (text || "").trim();
    if (!trimmed) return;

    if (dialogueSendBtn) dialogueSendBtn.disabled = true;
    if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Talking to ADA...";

    // Ensure we serialize turns so responses stay in order.
    aiDmTurnQueue = aiDmTurnQueue.then(async () => {
      const result = await apiPost(isHiddenHand ? "/api/hidden-hand/turn" : "/api/ai-dm/turn", {
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
      const mechanics = isHiddenHand ? null : payload.mechanics || null;
      const canon = isHiddenHand ? payload.canon || null : null;
      const debug = payload.debug || null;
      lastAiMechanics = mechanics;

      if (narrative) {
        appendMessage("dm", narrative);
      }

      if (isHiddenHand) {
        if (aiDmRollBtn) aiDmRollBtn.disabled = true;
        if (aiDmMechanicsEl) {
          const resolved = canon && Array.isArray(canon.resolvedEventIds)
            ? canon.resolvedEventIds.length
            : 0;
          const total = Array.isArray(activeCampaign.canonTimeline)
            ? activeCampaign.canonTimeline.length
            : null;
          aiDmMechanicsEl.textContent =
            total != null
              ? `Canon progress: ${resolved}/${total}`
              : resolved
              ? `Canon progress: ${resolved} resolved`
              : "";
        }
      } else if (mechanics && aiDmMechanicsEl) {
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
        aiDmNoticeEl.textContent = isHiddenHand
          ? `ADA (the Hidden Hand) is guiding this Master Template run. ` +
            `Stay on course—canon is calling. ` +
            `AI model: ${modelName}`
          : `ADA is acting as the Dungeon Master for this campaign. ` +
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
        "Session Log is empty. Generate encounters or flavor above, then send your favorites here.";
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

  function renderGmPartyStatus(partyStatus) {
    if (!gmPartySummaryEl && !gmPartyMembersEl) return;

    if (!partyStatus || typeof partyStatus !== "object") {
      if (gmPartySummaryEl) gmPartySummaryEl.textContent = "Party status unavailable.";
      if (gmPartyMembersEl) gmPartyMembersEl.innerHTML = "";
      return;
    }

    const memberCount = Number(partyStatus.memberCount) || 0;
    const totalLevel = Number(partyStatus.totalLevel) || 0;
    const avgLevel = typeof partyStatus.averageLevel === "number" ? partyStatus.averageLevel : Number(partyStatus.averageLevel) || 0;
    const hpCur = Number(partyStatus.hp && partyStatus.hp.current) || 0;
    const hpMax = Number(partyStatus.hp && partyStatus.hp.max) || 0;
    const manaCur = Number(partyStatus.manaSlots && partyStatus.manaSlots.current) || 0;
    const manaMax = Number(partyStatus.manaSlots && partyStatus.manaSlots.max) || 0;

    if (gmPartySummaryEl) {
      gmPartySummaryEl.textContent =
        memberCount === 0
          ? "No linked party members yet. Link characters from My Characters."
          : `Party: ${memberCount} members · Total level ${totalLevel} (avg ${avgLevel}) · HP ${hpCur}/${hpMax} · Slots ${manaCur}/${manaMax}`;
    }

    if (gmPartyMembersEl) {
      gmPartyMembersEl.innerHTML = "";
      const members = Array.isArray(partyStatus.members) ? partyStatus.members : [];
      members.forEach((m) => {
        const chip = document.createElement("span");
        chip.className = "gm-chip";
        const name = m && m.name ? String(m.name) : "Adventurer";
        const cls = m && m.classSummary ? String(m.classSummary) : "";
        const lvl = m && Number.isFinite(Number(m.level)) ? Number(m.level) : 0;
        const hp = m && m.hp ? `${m.hp.current}/${m.hp.max}` : "?/?";
        const slots = m && m.manaSlots ? `${m.manaSlots.current}/${m.manaSlots.max}` : "?/?";
        chip.textContent = `${name}${cls ? ` (${cls})` : ""} · L${lvl} · HP ${hp} · Slots ${slots}`;
        gmPartyMembersEl.appendChild(chip);
      });
    }
  }

  function buildEncounterOptionText(option) {
    const id = option && option.id ? String(option.id).trim() : "?";
    const title = option && option.title ? String(option.title).trim() : "Encounter";
    const difficulty = option && option.difficulty ? String(option.difficulty).trim() : "";
    const type = option && option.type ? String(option.type).trim() : "";

    const opposition = Array.isArray(option && option.opposition)
      ? option.opposition
          .map((o) => {
            const name = o && o.name ? String(o.name) : "Opposition";
            const count = Number.isFinite(Number(o && o.count)) ? Number(o.count) : null;
            const notes = o && o.notes ? String(o.notes) : "";
            return `- ${name}${count != null ? ` x${count}` : ""}${notes ? ` — ${notes}` : ""}`;
          })
          .join("\n")
      : "";

    const scaling = option && option.scaling ? option.scaling : null;
    const easier = scaling && scaling.easier ? String(scaling.easier) : "";
    const harder = scaling && scaling.harder ? String(scaling.harder) : "";

    const lines = [
      `${id}. ${title}${difficulty ? ` (${difficulty}${type ? ` · ${type}` : ""})` : type ? ` (${type})` : ""}`,
      option && option.hook ? `\nHook: ${String(option.hook)}` : "",
      option && option.setup ? `\nSetup: ${String(option.setup)}` : "",
      opposition ? `\nOpposition:\n${opposition}` : "",
      option && option.twist ? `\nTwist: ${String(option.twist)}` : "",
      option && option.tactics ? `\nTactics: ${String(option.tactics)}` : "",
      easier || harder ? `\nScaling:\n- Easier: ${easier || "(n/a)"}\n- Harder: ${harder || "(n/a)"}` : "",
      option && option.rewards ? `\nRewards: ${String(option.rewards)}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  function buildEncounterQuickViewText({ option, monster }) {
    const sb = monster && monster.statBlock ? monster.statBlock : null;
    if (!sb) return "";

    const header = [
      sb.name ? String(sb.name) : (monster.name ? String(monster.name) : "Creature"),
      sb.size && sb.type ? `${sb.size} ${sb.type}` : (sb.type ? String(sb.type) : ""),
      sb.alignment ? String(sb.alignment) : "",
    ].filter(Boolean).join(" · ");

    const ac = sb.ac != null ? `AC ${sb.ac}` : "";
    const hp = sb.hp && (sb.hp.max != null || sb.hp.current != null)
      ? `HP ${sb.hp.max != null ? sb.hp.max : "?"}`
      : (sb.hp != null ? `HP ${sb.hp}` : "");
    const speed = sb.speed ? `Speed ${String(sb.speed)}` : "";
    const basics = [ac, hp, speed].filter(Boolean).join(" · ");

    const ability = sb.abilityScores && typeof sb.abilityScores === "object" ? sb.abilityScores : null;
    const abilityLine = ability
      ? `STR ${ability.str ?? "?"}  DEX ${ability.dex ?? "?"}  CON ${ability.con ?? "?"}  INT ${ability.int ?? "?"}  WIS ${ability.wis ?? "?"}  CHA ${ability.cha ?? "?"}`
      : "";

    const traits = Array.isArray(sb.traits) ? sb.traits.map((t) => `• ${t.name}: ${t.text}`).join("\n") : "";
    const actions = Array.isArray(sb.actions) ? sb.actions.map((a) => `• ${a.name}: ${a.text}`).join("\n") : "";

    return [
      header,
      basics,
      abilityLine,
      traits ? `\nTraits:\n${traits}` : "",
      actions ? `\nActions:\n${actions}` : "",
    ].filter(Boolean).join("\n");
  }

  function renderEncounterResults(options) {
    if (!gmEncounterResultsEl) return;
    gmEncounterResultsEl.innerHTML = "";

    if (!Array.isArray(options) || options.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No encounters generated yet.";
      gmEncounterResultsEl.appendChild(empty);
      return;
    }

    options.forEach((opt) => {
      const card = document.createElement("article");
      card.className = "gm-option-card";

      const header = document.createElement("div");
      header.className = "gm-option-card__header";

      const title = document.createElement("h4");
      title.className = "gm-option-card__title";
      const label = opt && opt.id ? String(opt.id).trim() : "?";
      const t = opt && opt.title ? String(opt.title).trim() : `Encounter ${label}`;
      title.textContent = t;

      const meta = document.createElement("div");
      meta.className = "gm-option-card__meta";
      const diff = opt && opt.difficulty ? String(opt.difficulty).trim() : "";
      const kind = opt && opt.type ? String(opt.type).trim() : "";
      const mode = opt && opt.intentMode ? String(opt.intentMode).trim() : "";
      meta.textContent = [`Option ${label}`, diff, kind, mode ? `Mode: ${mode}` : ""].filter(Boolean).join(" · ");

      header.appendChild(title);
      header.appendChild(meta);

      const body = document.createElement("div");
      body.className = "gm-option-card__body";
      // Keep the main body concise (the full sheet lives in Quick View).
      const shortLines = [];
      if (opt && opt.hook) shortLines.push(`Hook: ${String(opt.hook)}`);
      if (opt && opt.setup) shortLines.push(`Setup: ${String(opt.setup)}`);
      if (opt && opt.oppositionSummary) shortLines.push(`Opposition: ${String(opt.oppositionSummary)}`);
      body.textContent = shortLines.length ? shortLines.join("\n\n") : buildEncounterOptionText(opt);

      const gmNotes = document.createElement("details");
      const gmNotesSummary = document.createElement("summary");
      gmNotesSummary.textContent = "GM Notes";
      gmNotes.appendChild(gmNotesSummary);
      const notesBlock = document.createElement("div");
      notesBlock.className = "gm-statblock";
      const notesTitle = document.createElement("div");
      notesTitle.className = "gm-statblock__title";
      notesTitle.textContent = "Notes";
      const notesLine = document.createElement("div");
      notesLine.className = "gm-statblock__line";
      const lines = [];
      if (opt && opt.twist) lines.push(`Twist: ${String(opt.twist)}`);
      if (opt && opt.tactics) lines.push(`Tactics: ${String(opt.tactics)}`);
      if (opt && opt.scaling) {
        if (opt.scaling.easier) lines.push(`Scaling (easier): ${String(opt.scaling.easier)}`);
        if (opt.scaling.harder) lines.push(`Scaling (harder): ${String(opt.scaling.harder)}`);
      }
      if (opt && opt.rewards) lines.push(`Rewards: ${String(opt.rewards)}`);
      notesLine.textContent = lines.join("\n\n");
      notesBlock.appendChild(notesTitle);
      notesBlock.appendChild(notesLine);
      gmNotes.appendChild(notesBlock);

      const quickView = document.createElement("details");
      const quickSummary = document.createElement("summary");
      quickSummary.textContent = "Quick View: Threat Scale + Monster Sheets";
      quickView.appendChild(quickSummary);

      const threatScale = opt && opt.threatScale ? opt.threatScale : null;
      if (threatScale && (Array.isArray(threatScale.dialUp) || Array.isArray(threatScale.dialDown))) {
        const ts = document.createElement("div");
        ts.className = "gm-statblock";
        const titleEl = document.createElement("div");
        titleEl.className = "gm-statblock__title";
        titleEl.textContent = "Threat Scale";
        const lineEl = document.createElement("div");
        lineEl.className = "gm-statblock__line";
        const up = Array.isArray(threatScale.dialUp) ? threatScale.dialUp.map((s) => `+ ${s}`).join("\n") : "";
        const down = Array.isArray(threatScale.dialDown) ? threatScale.dialDown.map((s) => `- ${s}`).join("\n") : "";
        lineEl.textContent = [up ? `Dial Up:\n${up}` : "", down ? `Dial Down:\n${down}` : ""].filter(Boolean).join("\n\n");
        ts.appendChild(titleEl);
        ts.appendChild(lineEl);
        quickView.appendChild(ts);
      }

      const monsters = Array.isArray(opt && opt.monsters) ? opt.monsters : [];
      monsters.forEach((m) => {
        const monsterDetails = document.createElement("details");
        const monsterSummary = document.createElement("summary");
        const name = m && m.name ? String(m.name) : "Monster";
        const count = Number.isFinite(Number(m && m.count)) ? Number(m.count) : null;
        monsterSummary.textContent = `${name}${count != null ? ` x${count}` : ""}`;
        monsterDetails.appendChild(monsterSummary);

        const sbWrap = document.createElement("div");
        sbWrap.className = "gm-statblock";

        const sbTitle = document.createElement("div");
        sbTitle.className = "gm-statblock__title";
        sbTitle.textContent = name;

        const meta = document.createElement("div");
        meta.className = "gm-statblock__meta";
        const tier = opt && opt.difficulty ? String(opt.difficulty) : "";
        meta.textContent = [tier ? `Tier: ${tier}` : "", m && m.role ? `Role: ${m.role}` : ""].filter(Boolean).join(" · ");

        const line = document.createElement("div");
        line.className = "gm-statblock__line";
        line.textContent = buildEncounterQuickViewText({ option: opt, monster: m });

        sbWrap.appendChild(sbTitle);
        if (meta.textContent) sbWrap.appendChild(meta);
        sbWrap.appendChild(line);
        monsterDetails.appendChild(sbWrap);
        quickView.appendChild(monsterDetails);
      });

      const actions = document.createElement("div");
      actions.className = "gm-option-card__actions";

      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "btn btn--primary btn--small";
      sendBtn.textContent = "Send to Session Log";
      sendBtn.addEventListener("click", () => {
        const currentUser = getCurrentUser();
        if (!activeCampaignId || !currentUser) return;

        const scriptTitle = `${t} (${label}${diff ? ` · ${diff}` : ""})`;
        const scriptBody = buildEncounterOptionText(opt);
        saveCampaignScript({ author: currentUser, title: scriptTitle, body: scriptBody });
      });

      actions.appendChild(sendBtn);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(gmNotes);
      card.appendChild(quickView);
      card.appendChild(actions);

      gmEncounterResultsEl.appendChild(card);
    });
  }

  function renderEncounterArchive(encounters) {
    if (!gmEncounterArchiveEl) return;
    gmEncounterArchiveEl.innerHTML = "";

    if (!Array.isArray(encounters) || encounters.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No archived encounter bundles yet.";
      gmEncounterArchiveEl.appendChild(empty);
      return;
    }

    const sorted = encounters.slice().sort((a, b) => {
      const ad = Date.parse(a && a.createdAt ? a.createdAt : "");
      const bd = Date.parse(b && b.createdAt ? b.createdAt : "");
      return (bd || 0) - (ad || 0);
    });

    sorted.forEach((bundle) => {
      const card = document.createElement("div");
      card.className = "gm-archive-card";

      const seed = bundle && bundle.seed ? String(bundle.seed) : "";
      const createdAt = new Date(bundle && bundle.createdAt ? bundle.createdAt : Date.now()).toLocaleString();
      const mode = bundle && bundle.intentMode ? String(bundle.intentMode) : "balanced";
      const meta = document.createElement("div");
      meta.className = "gm-archive-card__meta";
      meta.textContent = `${createdAt} · Mode: ${mode}${seed ? ` · Seed: ${seed}` : ""}`;

      const actions = document.createElement("div");
      actions.className = "gm-archive-card__actions";

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn btn--secondary btn--small";
      loadBtn.textContent = "Load options";
      loadBtn.addEventListener("click", () => {
        const options = bundle && Array.isArray(bundle.options) ? bundle.options : [];
        renderEncounterResults(options);
        if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = "Loaded archived bundle.";
      });

      actions.appendChild(loadBtn);

      card.appendChild(meta);
      card.appendChild(actions);
      gmEncounterArchiveEl.appendChild(card);
    });
  }

  function renderFlavorOutput(text) {
    if (!gmFlavorOutputEl) return;
    const t = text && String(text).trim() ? String(text).trim() : "";
    gmFlavorOutputEl.textContent = t;

    if (gmFlavorSendToLogBtn) {
      gmFlavorSendToLogBtn.disabled = !t;
    }
  }

  function saveCampaignScript({ author, title, body }) {
    if (!activeCampaignId) return;

    return apiPost("/api/campaigns/details", {
      action: "saveScript",
      campaignId: activeCampaignId,
      author,
      title,
      body,
    }).then((result) => {
      if (!result.ok) {
        const msg = (result.data && (result.data.error || result.data.message)) || "Could not save to Session Log.";
        if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = msg;
        if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = msg;
        return;
      }

      const data = result.data || {};
      const scripts = Array.isArray(data.scripts) ? data.scripts : data.script ? [data.script] : [];
      renderCampaignScripts(scripts);

      if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = "Saved to Session Log.";
      if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = "Saved to Session Log.";
    });
  }

  async function callGmTool(toolType, context) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { ok: false, status: 401, data: { error: "You need to be logged in." } };
    }
    if (!activeCampaignId) {
      return { ok: false, status: 400, data: { error: "Open a campaign dashboard first." } };
    }

    if (!activeCampaignCanUseGmTools) {
      return {
        ok: false,
        status: 403,
        data: { error: "GM Tools are available only to the campaign's DM (and not in AI-DM campaigns)." },
      };
    }

    const safeTool = String(toolType || "").trim().toLowerCase();
    if (safeTool !== "encounter" && safeTool !== "flavor") {
      return { ok: false, status: 400, data: { error: "Unknown GM tool." } };
    }

    return apiPost("/api/gm/tool", {
      username: currentUser,
      campaignId: activeCampaignId,
      toolType: safeTool,
      context: context && typeof context === "object" ? context : {},
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
    const partyStatus = data.partyStatus || null;
    const encounters = Array.isArray(data.encounters) ? data.encounters : [];
    const journals = Array.isArray(data.journals) ? data.journals : [];
    const scripts = Array.isArray(data.scripts) ? data.scripts : [];

    activeCampaignCharacters = characters;
    activeCampaignPartyStatus = partyStatus;
    activeCampaignEncounters = encounters;
    renderGmPartyStatus(partyStatus);
    renderEncounterArchive(encounters);
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
      if (aiDmRollBtn) aiDmRollBtn.disabled = isAi && campaign.mode === "template-run";
      if (aiDmMechanicsEl) {
        if (isAi && campaign.mode === "template-run") {
          const resolved = Array.isArray(campaign.resolvedCanonEventIds)
            ? campaign.resolvedCanonEventIds.length
            : 0;
          const total = Array.isArray(campaign.canonTimeline)
            ? campaign.canonTimeline.length
            : null;
          aiDmMechanicsEl.textContent =
            total != null ? `Canon progress: ${resolved}/${total}` : "";
        } else {
          aiDmMechanicsEl.textContent = "";
        }
      }

      // Configure delete/leave buttons based on campaign type and user role
      const isDm = campaign.dm === currentUser;
      const isParticipant =
        Array.isArray(campaign.participants) &&
        campaign.participants.includes(currentUser);

      // GM Tools permissions: DM-only and never available for AI-DM campaigns.
      const canUseGmTools = isDm && !isAi;
      setGmToolsVisibility({ canUse: canUseGmTools });
      if (!canUseGmTools) {
        // Ensure we don't land on a hidden tab.
        setCampaignTab("characters");
      }

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

    // Chronicle notes are handled by the HUD module.
    notifyActiveCampaignChanged();

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

  async function loadVaultCharacters({ silent = false } = {}) {
    const user = getCurrentUser();
    if (!user) return;
    if (!silent) {
      vaultMessage.textContent = "Loading your characters...";
      vaultCharactersGrid.innerHTML = "";
    }
    try {
      const result = await apiGet(`/api/characters?user=${encodeURIComponent(user)}`);
      if (!result.ok) {
        throw new Error((result.data && result.data.error) || "Failed to load characters");
      }
      const data = result.data || {};
      const characters = Array.isArray(data.characters) ? data.characters : [];
      cachedVaultCharacters = characters;

      // If we have a persisted active character, restore it as soon as the vault list is known.
      if (!activeCharacter && storedActiveCharacterId && characters.length) {
        const restored = characters.find((c) => String(c.id) === String(storedActiveCharacterId));
        if (restored) {
          setActiveCharacter(restored, { persist: false });
        }
      }

      if (silent) {
        return;
      }
      if (!characters.length) {
        vaultMessage.textContent = "No characters yet. Forge one from the Character Forge to get started.";
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
      if (!silent) {
        vaultMessage.textContent = err.message || "Error loading characters.";
      }
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
    setActiveCharacter(character);
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

    // If the user was trying to enter the Session HUD, selecting a character
    // should return them there.
    if (MULTI_PAGE) {
      const target = consumePostSelectTarget();
      if (target === "hud") {
        navigateTo("hud");
        return;
      }
    }

    if (awaitingHudCharacterSelect) {
      awaitingHudCharacterSelect = false;
      showView("hud");
    }
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
  if (MULTI_PAGE) {
    if (!initialUser) {
      updateNav(null);
      // If the user is not logged in, only the auth page should be accessible.
      if (CURRENT_PAGE !== "auth") {
        navigateTo("auth-login");
        return;
      }
      showView("auth-login");
    } else {
      updateNav(initialUser);
      if (profileUsernameEl) profileUsernameEl.textContent = initialUser;

      // If already logged in and they hit the auth page, send them to the Forge.
      if (CURRENT_PAGE === "auth") {
        navigateTo("forge");
        return;
      }

      // Best-effort restoration of the previously active character.
      // Safe on non-vault pages because silent mode doesn't touch vault DOM.
      loadVaultCharacters({ silent: true }).then(() => {
        if (CURRENT_PAGE === "hud") {
          notifyActiveCharacterChanged();
          notifyActiveCampaignChanged();
        }
      });

      // Per-page bootstrapping.
      if (CURRENT_PAGE === "vault") {
        loadVaultCharacters();
        loadUserCampaignsForVault();
      } else if (CURRENT_PAGE === "library") {
        wireLibraryCreateModeToggle();
        wireLibrarySearchAndFilters();
        loadPublicTemplates();
        loadAdventuresAndCharacters();
        // Seed the canon builder with one empty event for convenience.
        if (templateCanonEventsEl && templateCanonEventsEl.children.length === 0) {
          createCanonEventRow();
        }
      } else if (CURRENT_PAGE === "campaigns") {
        loadCampaigns("all");
        if (activeCampaignId) {
          // Load the last active campaign (if any) when landing on the campaigns page.
          loadCampaignDetail(activeCampaignId);
        }
      } else if (CURRENT_PAGE === "profile") {
        refreshProfileFromStorage();
      } else if (CURRENT_PAGE === "forge") {
        // No-op: forge page initializes via element-guarded listeners.
      }
    }
  } else {
    // Legacy SPA mode (kept for backwards compatibility)
    if (initialUser) {
      updateNav(initialUser);
      if (profileUsernameEl) profileUsernameEl.textContent = initialUser;
      showView("forge");
      loadVaultCharacters({ silent: true });
    } else {
      updateNav(null);
      showView("auth-login");
    }
  }

  if (switchToForgeBtn) {
    switchToForgeBtn.addEventListener("click", () => {
      showView("forge");
    });
  }

  if (switchToHudBtn) {
    switchToHudBtn.addEventListener("click", () => {
      showView("hud");
    });
  }

  if (transcriptEl) {
    transcriptEl.addEventListener("input", () => {
      scheduleExtractionUpdate(transcriptEl.value || "");
    });
    // Initial render
    scheduleExtractionUpdate(transcriptEl.value || "");
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
      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) return;

      // Use event delegation so clicks work even if the user clicks on nested
      // elements inside the nav button (icons, spans, etc.).
      const btn = rawTarget.closest("[data-view]");
      if (!(btn instanceof HTMLElement)) return;
      const view = btn.getAttribute("data-view");
      if (!view) return;
      if (view === "forge") {
        showView("forge");
      } else if (view === "hud") {
        // If no active character is set yet, showView will route to the vault.
        showView("hud");
      } else if (view === "home") {
        // legacy
        showView("forge");
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
        notifyActiveCampaignChanged();
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

        const relinkedFrom = Array.isArray(data.relinkedFrom)
          ? data.relinkedFrom.map((cid) => String(cid || '').trim()).filter(Boolean)
          : [];
        if (relinkedFrom.length) {
          const fromLabels = relinkedFrom.map((cid) => {
            const match = Array.isArray(cachedUserCampaigns)
              ? cachedUserCampaigns.find((c) => String(c.id) === String(cid))
              : null;
            const name = match && match.name ? match.name : '';
            return name ? name : cid;
          });
          vaultLinkStatus.textContent = `Character linked to campaign. Moved from: ${fromLabels.join(", ")}.`;
        } else {
          vaultLinkStatus.textContent = "Character linked to campaign.";
        }

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
      notifyActiveCampaignChanged();
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

  if (gmEncounterGenerateBtn) {
    gmEncounterGenerateBtn.addEventListener("click", async () => {
      if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = "Consulting the oracle...";
      if (gmEncounterResultsEl) gmEncounterResultsEl.innerHTML = "";

      const seed = gmEncounterSeedInput ? gmEncounterSeedInput.value.trim() : "";

      const result = await callGmTool("encounter", {
        seed,
        // The backend computes partyStatus authoritatively, but this can help prompt continuity.
        partyStatus: activeCampaignPartyStatus,
      });

      if (!result.ok) {
        const msg = (result.data && (result.data.error || result.data.message)) || "Could not generate encounters.";
        if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = msg;
        return;
      }

      const data = result.data || {};
      if (data.partyStatus) {
        activeCampaignPartyStatus = data.partyStatus;
        renderGmPartyStatus(data.partyStatus);
      }
      if (data.encounterBundle) {
        // Optimistically add to archive without reloading campaign details.
        activeCampaignEncounters = Array.isArray(activeCampaignEncounters)
          ? [data.encounterBundle, ...activeCampaignEncounters]
          : [data.encounterBundle];
        renderEncounterArchive(activeCampaignEncounters);
      }
      const options = data.result && Array.isArray(data.result.options) ? data.result.options : [];
      renderEncounterResults(options);
      if (gmEncounterStatusEl) gmEncounterStatusEl.textContent = options.length ? "Three options ready." : "No options returned.";
    });
  }

  if (gmFlavorGenerateBtn) {
    gmFlavorGenerateBtn.addEventListener("click", async () => {
      const seed = gmFlavorSeedInput ? gmFlavorSeedInput.value.trim() : "";
      if (!seed) {
        if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = "Add a seed first (place, NPC, object, omen, etc.).";
        return;
      }

      if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = "Weaving flavor...";
      renderFlavorOutput("");

      const result = await callGmTool("flavor", { seed });
      if (!result.ok) {
        const msg = (result.data && (result.data.error || result.data.message)) || "Could not generate flavor.";
        if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = msg;
        return;
      }

      const data = result.data || {};
      if (data.partyStatus) {
        activeCampaignPartyStatus = data.partyStatus;
        renderGmPartyStatus(data.partyStatus);
      }
      const text = data.result && typeof data.result.text === "string" ? data.result.text : "";
      renderFlavorOutput(text);
      if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = text ? "Flavor ready." : "No text returned.";
    });
  }

  if (gmFlavorSendToLogBtn) {
    gmFlavorSendToLogBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser || !activeCampaignId) return;
      const seed = gmFlavorSeedInput ? gmFlavorSeedInput.value.trim() : "";
      const body = gmFlavorOutputEl ? gmFlavorOutputEl.textContent : "";
      const cleanBody = body && String(body).trim() ? String(body).trim() : "";
      if (!cleanBody) {
        if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = "Nothing to send yet.";
        return;
      }

      if (gmFlavorStatusEl) gmFlavorStatusEl.textContent = "Saving to Session Log...";
      saveCampaignScript({
        author: currentUser,
        title: seed ? `Flavor: ${seed}` : "Flavor snippet",
        body: cleanBody,
      });
    });
  }

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

        const createdCampaign = result.data && result.data.campaign;
        // If campaign creation happens in the Library tab, jump to My Campaigns and open it.
        if (MULTI_PAGE && CURRENT_PAGE === "library" && createdCampaign && createdCampaign.id) {
          try {
            localStorage.setItem(ACTIVE_CAMPAIGN_STORAGE_KEY, String(createdCampaign.id));
          } catch {
            // ignore
          }
          activeCampaignId = String(createdCampaign.id);
          activeCampaign = createdCampaign;
          navigateTo("campaign-detail");
          return;
        }

        campaignNameInput.value = "";
        campaignParticipantsInput.value = "";
        if (campaignsMessage) campaignsMessage.textContent = "Campaign created!";
        loadCampaigns("all");
      });
    });
  }

  if (addCanonEventBtn) {
    addCanonEventBtn.addEventListener("click", () => {
      createCanonEventRow();
    });
  }

  if (publishTemplateForm) {
    publishTemplateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (publishTemplateStatusEl)
          publishTemplateStatusEl.textContent =
            "You need to be logged in to publish a template.";
        return;
      }

      const name = templateNameInput ? templateNameInput.value.trim() : "";
      const canonTimeline = collectCanonEventsFromBuilder();

      if (!name) {
        if (publishTemplateStatusEl)
          publishTemplateStatusEl.textContent = "Please name your template.";
        return;
      }
      if (!canonTimeline.length) {
        if (publishTemplateStatusEl)
          publishTemplateStatusEl.textContent =
            "Add at least one Canon Event before publishing.";
        return;
      }

      if (publishTemplateStatusEl)
        publishTemplateStatusEl.textContent = "Publishing to the Library...";

      const result = await apiPost("/api/templates/create", {
        username: currentUser,
        name,
        canonTimeline,
      });

      if (!result.ok) {
        const msg =
          (result.data && (result.data.error || result.data.message)) ||
          "Could not publish template.";
        if (publishTemplateStatusEl) publishTemplateStatusEl.textContent = msg;
        return;
      }

      if (publishTemplateStatusEl)
        publishTemplateStatusEl.textContent = "Published!";
      if (templateNameInput) templateNameInput.value = "";
      if (templateCanonEventsEl) templateCanonEventsEl.innerHTML = "";
      createCanonEventRow();

      // Refresh library
      loadPublicTemplates();
    });
  }

  if (campaignFilterAllBtn) {
    campaignFilterAllBtn.addEventListener("click", () => {
      loadCampaigns("all");
    });
  }
  if (campaignFilterDmBtn) {
    campaignFilterDmBtn.addEventListener("click", () => {
      loadCampaigns("dm");
    });
  }
  if (campaignFilterPlayerBtn) {
    campaignFilterPlayerBtn.addEventListener("click", () => {
      loadCampaigns("player");
    });
  }

  // Expose a small, stable API for page modules (e.g., HUD).
  (function exposeAdaApi() {
    const root = window;
    const ada = root.ADA && typeof root.ADA === "object" ? root.ADA : {};

    ada.config = ada.config && typeof ada.config === "object" ? ada.config : {};
    ada.config.BACKEND_BASE_URL = BACKEND_BASE_URL;

    ada.storageKeys = {
      CURRENT_USER: CURRENT_USER_STORAGE_KEY,
      ACTIVE_CAMPAIGN_ID: ACTIVE_CAMPAIGN_STORAGE_KEY,
      ACTIVE_CHARACTER_ID: ACTIVE_CHARACTER_STORAGE_KEY,
      POST_SELECT_TARGET: POST_SELECT_TARGET_STORAGE_KEY,
    };

    ada.getCurrentUser = getCurrentUser;
    ada.getActiveCampaignId = () => activeCampaignId;
    ada.getActiveCharacter = () => activeCharacter;
    ada.setActiveCharacter = setActiveCharacter;
    ada.requestHudCharacterSelection = requestHudCharacterSelection;
    ada.navigateTo = navigateTo;
    ada.showView = showView;
    ada.callGmTool = callGmTool;

    root.ADA = ada;
  })();
})();
