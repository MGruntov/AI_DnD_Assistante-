import { authHeaders, clearAuthToken, setAuthToken } from "./js/api.js";
import { apiGetJson, apiPostJson } from "./js/api-client.js";
import { generateCharacter, generateCharacterWithSimilarity } from "./js/character-generator.js";
import { renderCharacterSheetHTML } from "./js/character-sheet-renderer.js";
import { searchDecisionsByPrompt } from "./js/decision-matcher.js";

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
  const campaignsMessageList = document.getElementById("campaignsMessageList");
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
  const campaignProgressMeta = document.getElementById("campaignProgressMeta");
  const campaignXpRewardEl = document.getElementById("campaignXpReward");
  const campaignCheckpointProgressEl = document.getElementById("campaignCheckpointProgress");
  const campaignCheckpointDetailsEl = document.getElementById("campaignCheckpointDetails");
  const campaignCheckpointListEl = document.getElementById("campaignCheckpointList");
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

  // Campaign Lobby Chat (OOC)
  const campaignLobbyChatThread = document.getElementById("campaignLobbyChatThread");
  const campaignLobbyChatInput = document.getElementById("campaignLobbyChatInput");
  const campaignLobbyChatSendBtn = document.getElementById("campaignLobbyChatSendBtn");
  const campaignLobbyChatComposer = document.getElementById("campaignLobbyChatComposer");
  const campaignLobbyChatStatus = document.getElementById("campaignLobbyChatStatus");
  const campaignPendingNotice = document.getElementById("campaignPendingNotice");
  const campaignGmQueue = document.getElementById("campaignGmQueue");
  const campaignPendingList = document.getElementById("campaignPendingList");

  // Studio publish to Hall
  const publishCampaignForm = document.getElementById("publishCampaignForm");
  const publishCampaignSelect = document.getElementById("publishCampaignSelect");
  const publishTemplateSummary = document.getElementById("publishTemplateSummary");
  const publishTemplateTags = document.getElementById("publishTemplateTags");
  const publishCampaignStatus = document.getElementById("publishCampaignStatus");
  // Studio publish to AI Sagas
  const publishAdventureForm = document.getElementById("publishAdventureForm");
  const adventureTitleInput = document.getElementById("adventureTitle");
  const adventureSummaryInput = document.getElementById("adventureSummary");
  const adventureDifficultySelect = document.getElementById("adventureDifficulty");
  const adventureLevelMinInput = document.getElementById("adventureLevelMin");
  const adventureLevelMaxInput = document.getElementById("adventureLevelMax");
  const adventurePrimerInput = document.getElementById("adventurePrimer");
  const adventureCheckpointsInput = document.getElementById("adventureCheckpoints");
  const adventureVictoryInput = document.getElementById("adventureVictory");
  const adventureDefeatInput = document.getElementById("adventureDefeat");
  const adventureTagsInput = document.getElementById("adventureTags");
  const publishAdventureStatus = document.getElementById("publishAdventureStatus");
  const campaignAiPlayerPrompt = document.getElementById("campaignAiPlayerPrompt");
  const aiPlayerPromptField = document.getElementById("aiPlayerPromptField");

  // Human Lobbies page
  const lobbiesList = document.getElementById("lobbiesList");
  const lobbiesMessage = document.getElementById("lobbiesMessage");
  const lobbyDetail = document.getElementById("lobbyDetail");
  const lobbyDetailTitle = document.getElementById("lobbyDetailTitle");
  const lobbyDetailMeta = document.getElementById("lobbyDetailMeta");
  const lobbyDiscordLink = document.getElementById("lobbyDiscordLink");
  const lobbyJoinBtn = document.getElementById("lobbyJoinBtn");
  const lobbyJoinStatus = document.getElementById("lobbyJoinStatus");
  const lobbyPendingNotice = document.getElementById("lobbyPendingNotice");
  const lobbyChatThread = document.getElementById("lobbyChatThread");
  const lobbyChatInput = document.getElementById("lobbyChatInput");
  const lobbyChatSendBtn = document.getElementById("lobbyChatSendBtn");
  const lobbyChatStatus = document.getElementById("lobbyChatStatus");
  const lobbyGmQueue = document.getElementById("lobbyGmQueue");
  const lobbyPendingList = document.getElementById("lobbyPendingList");

  // Studio page enhancements
  const campaignIsPublicLobbyToggle = document.getElementById("campaignIsPublicLobby");
  const campaignHasAiPlayersToggle = document.getElementById("campaignHasAiPlayers");
  const campaignWorldThemeInput = document.getElementById("campaignWorldTheme");
  const campaignDiscordLinkInput = document.getElementById("campaignDiscordLink");
  const studioScenarioList = document.getElementById("studioScenarioList");
  const studioScenarioMessage = document.getElementById("studioScenarioMessage");

  // Studio panel toggles (Worlds / Hall / AI Sagas)
  const studioPanelWorldsBtn = document.getElementById("studioPanelWorldsBtn");
  const studioPanelHallBtn = document.getElementById("studioPanelHallBtn");
  const studioPanelSagasBtn = document.getElementById("studioPanelSagasBtn");
  const studioPanelWorlds = document.getElementById("studioPanelWorlds");
  const studioPanelHall = document.getElementById("studioPanelHall");
  const studioPanelSagas = document.getElementById("studioPanelSagas");

  let activeLobbyId = null;

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
  const completeJourneyBtn = document.getElementById("completeJourneyBtn");
  const aiDmMechanicsEl = document.getElementById("aiDmMechanics");
  const aiDmQuotaHintEl = document.getElementById("aiDmQuotaHint");
  const aiDmPoiPanelEl = document.getElementById("aiDmPointsOfInterest");
  const aiDmPoiListEl = document.getElementById("aiDmPointsOfInterestList");

  // Shadow Arbiter debug sidebar (AI-solo canonTimeline)
  const aiDmLayoutEl = document.getElementById("aiDmLayout");
  const arbiterSidebarEl = document.getElementById("arbiterSidebar");
  const arbiterAnswerBadgeEl = document.getElementById("arbiterAnswerBadge");
  const arbiterMetaEl = document.getElementById("arbiterMeta");
  const arbiterPromptEl = document.getElementById("arbiterPrompt");

  const adventuresList = document.getElementById("adventuresList");
  const adventuresMessage = document.getElementById("adventuresMessage");

  // AI Sagas page extras
  const sagaFeaturedTitle = document.getElementById("sagaFeaturedTitle");
  const sagaFeaturedSummary = document.getElementById("sagaFeaturedSummary");
  const sagaFeaturedSelect = document.getElementById("sagaFeaturedSelect");
  const sagaFeaturedBeginBtn = document.getElementById("sagaFeaturedBeginBtn");
  const sagaFeaturedStatus = document.getElementById("sagaFeaturedStatus");
  const sagasNewestList = document.getElementById("sagasNewestList");
  const sagasPopularList = document.getElementById("sagasPopularList");
  const sagasLegendaryList = document.getElementById("sagasLegendaryList");

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

  // Hall of Records pillar selector
  const hallPillarTemplatesBtn = document.getElementById("hallPillarTemplatesBtn");
  const hallPillarScenariosBtn = document.getElementById("hallPillarScenariosBtn");
  const hallPillarLoreBtn = document.getElementById("hallPillarLoreBtn");
  const hallPillarHint = document.getElementById("hallPillarHint");
  const hallPillarTitle = document.getElementById("hallPillarTitle");
  const hallPillarDescription = document.getElementById("hallPillarDescription");

  let selectedHallPillar = "templates"; // templates | scenarios | lore

  // Onboarding Gate (post-login)
  const quickstartKnightBtn = document.getElementById("quickstartKnightBtn");
  const quickstartMageBtn = document.getElementById("quickstartMageBtn");
  const quickstartRogueBtn = document.getElementById("quickstartRogueBtn");
  const onboardingToForgeBtn = document.getElementById("onboardingToForgeBtn");
  const onboardingArchitectPassBtn = document.getElementById("onboardingArchitectPassBtn");
  const onboardingStatusEl = document.getElementById("onboardingStatus");

  const IS_ARCHITECT_STORAGE_KEY = "adaIsArchitect";
  const STUDIO_PANEL_STORAGE_KEY = "adaStudioPanel";

  // The backend returns an app-level quota object we can display precisely.
  // (Provider quotas are opaque; this is the only "messages remaining" number we can guarantee.)
  const DEFAULT_GEMINI_QUOTA_HINT = "Messages left today: —";
  let activeGeminiQuotaHint = DEFAULT_GEMINI_QUOTA_HINT;

  function formatAiQuotaHint(quota, providerHint) {
    const q = quota && typeof quota === "object" ? quota : null;
    const limit = q && Number.isFinite(Number(q.limit)) ? Number(q.limit) : null;
    const remaining = q && Number.isFinite(Number(q.remaining)) ? Number(q.remaining) : null;
    const resetsAt = q && q.resetsAt ? String(q.resetsAt) : "";

    let base = "";
    if (limit != null && remaining != null) {
      let resetLabel = "";
      if (resetsAt) {
        const t = new Date(resetsAt);
        if (!Number.isNaN(t.getTime())) {
          resetLabel = ` (resets ${t.toLocaleString()})`;
        }
      }
      base = `Messages left today: ${Math.max(0, remaining)}/${Math.max(1, limit)}${resetLabel}`;
    }

    const extra = String(providerHint || "").trim();
    if (base && extra) return `${base} — ${extra}`;
    if (base) return base;
    return extra || DEFAULT_GEMINI_QUOTA_HINT;
  }

  function isArchitect() {
    try {
      return localStorage.getItem(IS_ARCHITECT_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function setArchitect(flag) {
    try {
      if (flag) localStorage.setItem(IS_ARCHITECT_STORAGE_KEY, "true");
      else localStorage.removeItem(IS_ARCHITECT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function setOnboardingStatus(text) {
    if (!onboardingStatusEl) return;
    onboardingStatusEl.textContent = text || "";
  }

  function setStudioPanel(panelKey) {
    if (!studioPanelWorlds || !studioPanelHall || !studioPanelSagas) return;

    const key = String(panelKey || "worlds").toLowerCase();
    const isWorlds = key === "worlds";
    const isHall = key === "hall";
    const isSagas = key === "sagas";

    studioPanelWorlds.hidden = !isWorlds;
    studioPanelHall.hidden = !isHall;
    studioPanelSagas.hidden = !isSagas;

    const setBtnState = (btn, pressed) => {
      if (!btn) return;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      btn.classList.toggle("btn--primary", !!pressed);
      btn.classList.toggle("btn--secondary", !pressed);
    };

    setBtnState(studioPanelWorldsBtn, isWorlds);
    setBtnState(studioPanelHallBtn, isHall);
    setBtnState(studioPanelSagasBtn, isSagas);

    try {
      localStorage.setItem(STUDIO_PANEL_STORAGE_KEY, isHall ? "hall" : isSagas ? "sagas" : "worlds");
    } catch {
      // ignore
    }
  }

  function quickstartPortraitSvg(kind) {
    const accent = "#E01C29";
    const gold = "#F3CB70";
    const ink = "#1E1712";
    const title = kind === "knight" ? "Knight" : kind === "mage" ? "Mage" : "Rogue";
    const glyph = kind === "knight" ? "⚔" : kind === "mage" ? "✦" : "🗡";
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FEFEFE"/>
      <stop offset="1" stop-color="#FBF6EC"/>
    </linearGradient>
    <radialGradient id="seal" cx="30%" cy="25%" r="80%">
      <stop offset="0" stop-color="${gold}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.10"/>
    </radialGradient>
  </defs>
  <rect width="256" height="256" rx="18" fill="url(#bg)"/>
  <rect x="14" y="14" width="228" height="228" rx="16" fill="url(#seal)" stroke="${accent}" stroke-opacity="0.55"/>
  <circle cx="128" cy="108" r="44" fill="#ffffff" fill-opacity="0.70" stroke="${ink}" stroke-opacity="0.25"/>
  <path d="M70 212c12-38 40-58 58-58s46 20 58 58" fill="#ffffff" fill-opacity="0.65" stroke="${ink}" stroke-opacity="0.22"/>
  <text x="128" y="118" text-anchor="middle" font-family="Cinzel, serif" font-size="44" fill="${ink}" fill-opacity="0.78">${glyph}</text>
  <text x="128" y="46" text-anchor="middle" font-family="Cinzel, serif" font-size="18" fill="${ink}" fill-opacity="0.75">${title}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  // Studio panel switching (only runs when the Studio panels exist)
  if (studioPanelWorlds && studioPanelHall && studioPanelSagas) {
    let initialPanel = "worlds";
    try {
      const stored = localStorage.getItem(STUDIO_PANEL_STORAGE_KEY);
      if (stored) initialPanel = String(stored);
    } catch {
      // ignore
    }

    // Default to Worlds if stored is invalid
    if (!/^(worlds|hall|sagas)$/i.test(initialPanel)) initialPanel = "worlds";
    setStudioPanel(initialPanel);

    if (studioPanelWorldsBtn) {
      studioPanelWorldsBtn.addEventListener("click", () => setStudioPanel("worlds"));
    }
    if (studioPanelHallBtn) {
      studioPanelHallBtn.addEventListener("click", () => setStudioPanel("hall"));
    }
    if (studioPanelSagasBtn) {
      studioPanelSagasBtn.addEventListener("click", () => setStudioPanel("sagas"));
    }
  }

  async function createQuickstartCharacter(archetype) {
    const user = getCurrentUser();
    if (!user) {
      setOnboardingStatus("Please log in again.");
      navigateTo("auth-login");
      return;
    }

    setOnboardingStatus("Forging your hero…");

    const defs = {
      knight: {
        name: "Quickstart Knight",
        narrativeText: "A stalwart knight, sworn to uphold oaths and shield the innocent. Fighter." ,
        portraitUrl: quickstartPortraitSvg("knight"),
      },
      mage: {
        name: "Quickstart Mage",
        narrativeText: "A disciplined mage of the old towers, hungry for secrets. Wizard.",
        portraitUrl: quickstartPortraitSvg("mage"),
      },
      rogue: {
        name: "Quickstart Rogue",
        narrativeText: "A clever rogue of the back alleys and shadowed courts. Rogue.",
        portraitUrl: quickstartPortraitSvg("rogue"),
      },
    };

    const d = defs[archetype];
    if (!d) {
      setOnboardingStatus("Unknown archetype.");
      return;
    }

    const result = await apiPost("/api/characters/forge", {
      username: user,
      narrativeText: d.narrativeText,
      name: d.name,
      portraitUrl: d.portraitUrl,
    });

    if (!result.ok) {
      const msg = (result.data && (result.data.error || result.data.message)) || "Could not create quickstart hero.";
      setOnboardingStatus(msg);
      return;
    }

    const ch = result.data && result.data.character;
    if (ch && ch.id) {
      setActiveCharacter(ch);
      try {
        if (ch.portraitUrl) localStorage.setItem(PORTRAIT_STORAGE_KEY, String(ch.portraitUrl));
      } catch {
        // ignore
      }
    }

    setOnboardingStatus("Hero created. Opening the Portal…");
    navigateTo("portal");
  }

  // Portal Hub
  const portalSoloBtn = document.getElementById("portalSoloBtn");
  const portalLobbiesBtn = document.getElementById("portalLobbiesBtn");
  const portalStudioBtn = document.getElementById("portalStudioBtn");

  function wireOnboardingGate() {
    if (quickstartKnightBtn) quickstartKnightBtn.addEventListener("click", () => createQuickstartCharacter("knight"));
    if (quickstartMageBtn) quickstartMageBtn.addEventListener("click", () => createQuickstartCharacter("mage"));
    if (quickstartRogueBtn) quickstartRogueBtn.addEventListener("click", () => createQuickstartCharacter("rogue"));

    if (onboardingToForgeBtn)
      onboardingToForgeBtn.addEventListener("click", () => {
        // After forging a character, steer them to the Portal (via vault detail).
        if (MULTI_PAGE) setPostSelectTarget("portal");
        navigateTo("forge");
      });

    if (onboardingArchitectPassBtn)
      onboardingArchitectPassBtn.addEventListener("click", () => {
        setArchitect(true);
        navigateTo("portal");
      });
  }

  function wirePortalHub() {
    if (portalSoloBtn) portalSoloBtn.addEventListener("click", () => navigateTo("sagas"));
    if (portalLobbiesBtn) portalLobbiesBtn.addEventListener("click", () => navigateTo("lobbies"));
    if (portalStudioBtn) portalStudioBtn.addEventListener("click", () => navigateTo("studio"));
  }

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
  const vaultDetailSheet = document.getElementById("vaultDetailSheet");
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
  // Portrait image generation provider settings.
  //
  // Why:
  // - We used to hardcode Pollinations.
  // - Some deployments prefer other providers (e.g. Nanobanana).
  //
  // How:
  // - Set localStorage key `adaPortraitImageProvider` to: "pollinations" | "nanobanana" | "custom".
  // - Optionally set `adaPortraitImageUrlTemplate` to a URL template that contains:
  //     {prompt}  (URL-encoded prompt)
  //     {seed}    (seed number)
  //   Example (Pollinations):
  //     https://image.pollinations.ai/prompt/{prompt}?seed={seed}
  //   Example (Nanobanana):
  //     <put your Nanobanana image URL template here>
  const PORTRAIT_IMAGE_PROVIDER_STORAGE_KEY = "adaPortraitImageProvider";
  const PORTRAIT_IMAGE_URL_TEMPLATE_STORAGE_KEY = "adaPortraitImageUrlTemplate";

  const DEFAULT_PORTRAIT_IMAGE_PROVIDER = "pollinations";
  const PORTRAIT_IMAGE_PROVIDER_DEFAULT_TEMPLATES = {
    pollinations: "https://image.pollinations.ai/prompt/{prompt}?seed={seed}",
    // NOTE: Nanobanana URL formats vary by account/product.
    // Configure via localStorage `adaPortraitImageUrlTemplate`.
    nanobanana: "",
    custom: "",
  };

  const PORTRAIT_DEBUG_STORAGE_KEY = "adaPortraitDebug";

  function isPortraitDebugEnabled() {
    try {
      const v = String(localStorage.getItem(PORTRAIT_DEBUG_STORAGE_KEY) || "").trim().toLowerCase();
      return v === "1" || v === "true" || v === "yes" || v === "on";
    } catch {
      return false;
    }
  }

  function portraitDebugLog(...args) {
    if (!isPortraitDebugEnabled()) return;
    try {
      console.debug("[ADA][portrait]", ...args);
    } catch {
      // ignore
    }
  }
  const CURRENT_USER_STORAGE_KEY = "adaCurrentUser";
  const ACTIVE_CAMPAIGN_STORAGE_KEY = "adaActiveCampaignId";
  const ACTIVE_CHARACTER_STORAGE_KEY = "adaActiveCharacterId";
  const POST_SELECT_TARGET_STORAGE_KEY = "adaPostSelectTarget";

  function getPortraitImageProvider() {
    try {
      const v = localStorage.getItem(PORTRAIT_IMAGE_PROVIDER_STORAGE_KEY);
      return (v || "").trim() || DEFAULT_PORTRAIT_IMAGE_PROVIDER;
    } catch {
      return DEFAULT_PORTRAIT_IMAGE_PROVIDER;
    }
  }

  function getPortraitImageUrlTemplate(provider) {
    // Prefer explicit template set by the user.
    try {
      const v = localStorage.getItem(PORTRAIT_IMAGE_URL_TEMPLATE_STORAGE_KEY);
      if (v && String(v).trim()) return String(v).trim();
    } catch {
      // ignore
    }
    return PORTRAIT_IMAGE_PROVIDER_DEFAULT_TEMPLATES[String(provider || "").toLowerCase()] || "";
  }

  function applyUrlTemplate(template, { encodedPrompt, seed }) {
    const t = String(template || "");
    if (!t) return "";
    // Keep replacements minimal and predictable.
    return t
      .split("{prompt}").join(String(encodedPrompt))
      .split("{seed}").join(encodeURIComponent(String(seed)));
  }

  function buildPortraitImageCandidates(prompt, seed) {
    const encodedPrompt = encodeURIComponent(prompt);
    const provider = String(getPortraitImageProvider() || "").toLowerCase();

    const pollinations = applyUrlTemplate(
      getPortraitImageUrlTemplate("pollinations"),
      { encodedPrompt, seed }
    );

    // If Pollinations is selected, don't add a fallback (it already *is* the fallback).
    if (provider === "pollinations") {
      return { primaryUrl: pollinations, fallbackUrl: "" };
    }

    // nanobanana/custom: try configured template first.
    // If not configured and provider is nanobanana, default to our backend Worker route
    // that calls Gemini (keeps API keys off the client).
    const primaryTemplate = getPortraitImageUrlTemplate(provider);
    let primaryUrl = primaryTemplate
      ? applyUrlTemplate(primaryTemplate, { encodedPrompt, seed })
      : "";

    if (!primaryUrl && provider === "nanobanana") {
      // This endpoint is served by the backend Worker.
      primaryUrl = `${BACKEND_BASE_URL}/api/portraits/generate?prompt=${encodedPrompt}&seed=${encodeURIComponent(String(seed))}`;
    }

    return { primaryUrl, fallbackUrl: pollinations };
  }

  function setImageSrcWithFallback(img, { primaryUrl, fallbackUrl }, debugMeta) {
    if (!img) return;

    // Always clear any previous handlers from earlier generations.
    img.onerror = null;

    // If we don't have a primary URL, go straight to fallback.
    if (!primaryUrl) {
      portraitDebugLog("no primary URL; using fallback", { ...debugMeta, fallbackUrl });
      img.src = fallbackUrl || "";
      return;
    }

    // Attach a one-shot fallback handler.
    // Important: avoid infinite loops if the fallback also fails.
    img.dataset.adaPortraitFallbackTried = "0";
    img.onerror = () => {
      const alreadyTried = img.dataset.adaPortraitFallbackTried === "1";
      if (alreadyTried) return;
      img.dataset.adaPortraitFallbackTried = "1";

      portraitDebugLog("primary failed; falling back", { ...debugMeta, primaryUrl, fallbackUrl });

      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        img.src = fallbackUrl;
      }
    };

    // Trigger the primary request.
    portraitDebugLog("attempting primary image", { ...debugMeta, primaryUrl, fallbackUrl });
    img.src = primaryUrl;
  }

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
      case "onboarding":
        return "onboarding.html";
      case "portal":
        return "portal.html";
      case "sagas":
        return "sagas.html";
      case "lobbies":
        return "lobbies.html";
      case "studio":
        return "studio.html";
      case "hall":
        return "hall.html";
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

  function persistActiveCampaignId(campaignId) {
    try {
      if (campaignId) {
        localStorage.setItem(ACTIVE_CAMPAIGN_STORAGE_KEY, String(campaignId));
      } else {
        localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  function openCampaignFromAnyPage(campaign) {
    if (!campaign || !campaign.id) return;

    // In multi-page mode, campaign dashboard lives on campaigns.html.
    if (MULTI_PAGE && CURRENT_PAGE !== "campaigns") {
      persistActiveCampaignId(campaign.id);
      navigateTo("campaigns");
      return;
    }

    openCampaignDashboard(campaign);
  }

  function setHallPillar(pillar) {
    const next = pillar === "scenarios" || pillar === "lore" ? pillar : "templates";
    selectedHallPillar = next;

    const setPressed = (btn, pressed) => {
      if (!btn) return;
      try {
        btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      } catch {
        // ignore
      }
    };

    setPressed(hallPillarTemplatesBtn, next === "templates");
    setPressed(hallPillarScenariosBtn, next === "scenarios");
    setPressed(hallPillarLoreBtn, next === "lore");

    if (hallPillarHint) {
      hallPillarHint.textContent = `Showing: ${next === "templates" ? "Master Templates" : next === "scenarios" ? "Community Scenarios" : "World Lore"}`;
    }
    if (hallPillarTitle) {
      hallPillarTitle.textContent = next === "templates" ? "Master Templates" : next === "scenarios" ? "Community Scenarios" : "World Lore";
    }
    if (hallPillarDescription) {
      hallPillarDescription.textContent =
        next === "templates"
          ? "Structured world baselines authored by Architects."
          : next === "scenarios"
            ? "Lore-rich adventure seeds and story arcs published by the community."
            : "Atmospheric descriptions of legendary places and myths.";
    }

    // Re-render using current filters.
    if (CURRENT_PAGE === "hall") {
      updateTemplateTagOptions(cachedPublicTemplates);
      applyTemplateFiltersAndRender();
    }
  }

  function wireHallPillars() {
    if (!hallPillarTemplatesBtn && !hallPillarScenariosBtn && !hallPillarLoreBtn) return;
    if (hallPillarTemplatesBtn) hallPillarTemplatesBtn.addEventListener("click", () => setHallPillar("templates"));
    if (hallPillarScenariosBtn) hallPillarScenariosBtn.addEventListener("click", () => setHallPillar("scenarios"));
    if (hallPillarLoreBtn) hallPillarLoreBtn.addEventListener("click", () => setHallPillar("lore"));
    setHallPillar(selectedHallPillar);
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
  // 
  // IMPORTANT:
  // - When the frontend is opened on localhost (e.g. Live Server), most users still expect
  //   to hit the deployed Worker backend.
  // - Local Worker dev (http://localhost:8787) should be opt-in to avoid "Network error"
  //   when no dev server is running.
  
  // BACKEND OPTIONS - Choose one:
  // Option 1: ev713's personal backend (fresh database, your own resources)
  //const PROD_BACKEND_BASE_URL = "https://backend.ev713-backend.workers.dev";
  // Option 2: Original shared backend (has all user data, requires owner's account to deploy)
  const PROD_BACKEND_BASE_URL = "https://backend.ada-assistante.workers.dev";
  
  const LOCAL_WORKER_BACKEND_BASE_URL = "http://localhost:8787";

  function resolveBackendBaseUrl() {
    // Optional override: localStorage key or ?backend=... query param.
    // Examples:
    // - ?backend=local  -> http://localhost:8787
    // - ?backend=https://your-worker.example.com
    try {
      const params = new URLSearchParams(window.location.search || "");
      const q = String(params.get("backend") || "").trim();
      if (q) {
        const v = q.toLowerCase() === "local" ? LOCAL_WORKER_BACKEND_BASE_URL : q;
        localStorage.setItem("adaBackendBaseUrl", v);
      }
    } catch {
      // ignore
    }

    try {
      const stored = String(localStorage.getItem("adaBackendBaseUrl") || "").trim();
      if (stored) return stored;
    } catch {
      // ignore
    }

    const host = String(window.location.hostname || "").toLowerCase();
    const port = String(window.location.port || "");
    const isWorkerDev = (host === "localhost" || host === "127.0.0.1") && port === "8787";

    // If you're literally viewing the site from the Worker dev server, use same-origin.
    if (isWorkerDev) return "";

    // Default to production backend.
    return PROD_BACKEND_BASE_URL;
  }

  const BACKEND_BASE_URL = resolveBackendBaseUrl();
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
    el.textContent = text || "";
  }

  function computePlayerSpeakerLabel({ characters, username }) {
    const u = (username || "").trim();
    const list = Array.isArray(characters) ? characters : [];
    const owned = list.filter((ch) => String(ch && ch.owner ? ch.owner : "").trim() === u);
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
    // Let the interactive builder control its own finish button state
    try {
      if (window && window.__interactiveForgeActive) return;
    } catch {
      // ignore
    }
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
      img.hidden = false;
      const candidates = buildPortraitImageCandidates(prompt, seed);
      setImageSrcWithFallback(img, candidates, {
        slot: index,
        seed,
        provider: String(getPortraitImageProvider() || "").toLowerCase(),
      });
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
      scheduleDecisionSearch(text);
    }, 160);
  }

  let decisionSearchTimer = null;
  let lastDecisionMatches = null;

  function scheduleDecisionSearch(text) {
    if (decisionSearchTimer) window.clearTimeout(decisionSearchTimer);
    decisionSearchTimer = window.setTimeout(async () => {
      // Only search if we have meaningful text
      if (!text || text.trim().length < 20) {
        lastDecisionMatches = null;
        return;
      }
      
      console.log('[forge] Searching for decisions matching narrative...');
      const result = await searchDecisionsByPrompt(BACKEND_BASE_URL, text, 15);
      console.log('[forge] Search result:', result);
      
      if (result.ok && result.results && result.results.length > 0) {
        lastDecisionMatches = result.results;
        console.log('[forge] ✓ Found decision matches:', {
          count: result.results.length,
          totalDecisions: result.totalDecisions,
          topMatch: result.results[0],
        });
      } else {
        console.warn('[forge] Decision search failed:', result.error || result);
        lastDecisionMatches = null;
      }
    }, 500); // Slightly longer delay than extraction to not hammer backend
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
  function appendMessage(sender, text, opts = {}) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    const s = String(sender || "").toLowerCase();
    if (s === "dm" || s === "ada" || s === "ai") {
      appendAiDmLog("dm", trimmed, opts);
      return;
    }
    if (s === "player" || s === "you") {
      appendAiDmLog("player", trimmed, opts);
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
    const lines = raw.split(/\r?\n/);

    const currentUserLower = (currentUser || "").toLowerCase();
    const playerLabelLower = (playerLabel || "").toLowerCase();

    const messages = [];
    let current = null;

    function speakerRole(speaker) {
      const s = String(speaker || "").trim().toLowerCase();
      if (s === "ada" || s === "dm" || s === "dungeon master") return "dm";
      if (
        s === "you" ||
        (playerLabelLower && s === playerLabelLower) ||
        (currentUserLower && s === currentUserLower)
      ) {
        return "player";
      }
      return "other";
    }

    function flushCurrent() {
      if (!current) return;
      const text = String(current.text || "").trim();
      if (text) {
        const msg = { role: current.role, speaker: current.speaker, text };
        if (Array.isArray(current.pointsOfInterest) && current.pointsOfInterest.length) {
          msg.pointsOfInterest = current.pointsOfInterest;
        }
        messages.push(msg);
      }
      current = null;
    }

    lines.forEach((line) => {
      const rawLine = typeof line === "string" ? line : "";

      // POI metadata line: attach to the current DM message (preferred), otherwise to the last DM message.
      const poiMatch = rawLine.match(/^\s*\[POI\]\s*(\[[\s\S]*\])\s*$/);
      if (poiMatch && poiMatch[1]) {
        let parsed = [];
        try {
          const arr = JSON.parse(String(poiMatch[1] || ""));
          if (Array.isArray(arr)) parsed = arr;
        } catch {
          parsed = [];
        }
        const poi = parsed.map((p) => String(p || "").trim()).filter(Boolean).slice(0, 8);
        if (poi.length) {
          if (current && current.role === "dm") {
            current.pointsOfInterest = poi;
          } else {
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i] && messages[i].role === "dm") {
                messages[i].pointsOfInterest = poi;
                break;
              }
            }
          }
        }
        return;
      }

      const m = rawLine.match(/^([A-Za-z0-9_\-\s]{1,40}):\s*(.*)$/);
      if (m) {
        // New speaker turn.
        flushCurrent();
        const speaker = String(m[1] || "").trim();
        const body = String(m[2] || "");
        current = { speaker, role: speakerRole(speaker), text: body, pointsOfInterest: null };
        return;
      }

      // Continuation line (including blank lines) belongs to the current speaker if present.
      if (current) {
        if (rawLine.trim().length === 0) {
          current.text = `${current.text}\n`;
        } else {
          current.text = current.text ? `${current.text}\n${rawLine}` : rawLine;
        }
        return;
      }

      // No current speaker yet: treat as neutral transcript/system line.
      const trimmed = rawLine.trim();
      if (trimmed) messages.push({ role: "system", speaker: "Transcript", text: trimmed });
    });

    flushCurrent();
    return messages;
  }

  function renderCampaignDialogueThread(transcript) {
    if (!dialogueContainerEl) return;
    const currentUser = getCurrentUser();
    const messages = parseCampaignDialogueTranscript(transcript, currentUser, cachedPlayerSpeakerLabel);
    dialogueContainerEl.innerHTML = "";

    function hasInlineRollMarker(text) {
      return /\[\s*Roll\s*:\s*[^\]]+\]/i.test(String(text || ""));
    }

    function renderBodyWithInlineRolls(bodyEl, text) {
      const raw = String(text || "");
      const rx = /\[\s*Roll\s*:\s*([^\]]+?)\s*\]/gi;
      let last = 0;
      let m;
      while ((m = rx.exec(raw))) {
        const before = raw.slice(last, m.index);
        if (before) bodyEl.appendChild(document.createTextNode(before));

        const inside = String(m[1] || "").trim();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--primary btn--small";
        btn.textContent = inside ? `Quick Roll: ${inside}` : "Quick Roll";
        btn.addEventListener("click", () => {
          btn.disabled = true;
          try {
            resolveAiDmPendingCheck();
          } finally {
            // If resolution fails, re-enable after a short moment so the player isn't stuck.
            window.setTimeout(() => {
              // Only re-enable if the backend didn't clear the check (best-effort UX).
              const desc = lastAiMechanics && lastAiMechanics.checkDescription ? String(lastAiMechanics.checkDescription).trim() : "";
              const dc = lastAiMechanics ? lastAiMechanics.dc : null;
              if (desc && desc.toLowerCase() !== "none" && dc) btn.disabled = false;
            }, 900);
          }
        });
        bodyEl.appendChild(btn);

        last = rx.lastIndex;
      }
      const after = raw.slice(last);
      if (after) bodyEl.appendChild(document.createTextNode(after));
    }

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
      if (msg.role === "dm") {
        meta.textContent = activeGeminiQuotaHint
          ? `${msg.speaker} · ${activeGeminiQuotaHint}`
          : msg.speaker;
      } else {
        meta.textContent = msg.speaker;
      }

      const body = document.createElement("div");
      body.className = "chat-msg__body";
      if (msg.role === "dm" && hasInlineRollMarker(msg.text)) {
        body.textContent = "";
        renderBodyWithInlineRolls(body, msg.text);
      } else {
        body.textContent = msg.text;
      }

      bubble.appendChild(meta);
      bubble.appendChild(body);


      // Contextual Action HUD: render Points of Interest as buttons under the DM bubble.
      const poi = msg && Array.isArray(msg.pointsOfInterest) ? msg.pointsOfInterest : null;
      if (msg.role === "dm" && poi && poi.length) {
		const STUCK_FIX_POI = "Force arrival at next landmark";
        const poiWrap = document.createElement("div");
        poiWrap.className = "chat-msg__poi";
        poi.slice(0, 8).forEach((p) => {
          const label = String(p || "").trim();
          if (!label) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "poi-button";
		  if (label === STUCK_FIX_POI) btn.classList.add("btn--stuck-fix");
          btn.textContent = label;
          btn.addEventListener("click", () => {
            if (!dialogueTextInputEl) return;
            if (dialogueTextInputEl.disabled) return;
			const inputText = label === STUCK_FIX_POI ? STUCK_FIX_POI : label;
            dialogueTextInputEl.value = inputText;
            try {
              dialogueTextInputEl.focus();
            } catch {
              // ignore
            }
			handleDialoguePlayerInput(inputText, { source: "poi" });
          });
          poiWrap.appendChild(btn);
        });
        bubble.appendChild(poiWrap);
      }

      dialogueContainerEl.appendChild(bubble);
    });

    // If the latest message contains an inline check marker, hide the global Roll button.
    // (This keeps flow inside the narrative.)
    const lastMsg = messages.length ? messages[messages.length - 1] : null;
    const hideGlobalRoll = !!(lastMsg && lastMsg.role === "dm" && hasInlineRollMarker(lastMsg.text));
    if (aiDmRollBtn) aiDmRollBtn.hidden = hideGlobalRoll;

    dialogueContainerEl.scrollTop = dialogueContainerEl.scrollHeight;
  }

  function renderAiDmCampaignProgress({ campaign, ai }) {
    const isAi = campaign && isAIDmCampaign(campaign);
    if (!campaignProgressMeta) return;

    if (!isAi) {
      campaignProgressMeta.hidden = true;
      if (campaignCheckpointDetailsEl) campaignCheckpointDetailsEl.hidden = true;
      return;
    }

    const xpReward = (campaign && campaign.xpReward != null) ? campaign.xpReward : ai && ai.xpReward != null ? ai.xpReward : null;
    const checkpointIndex = (campaign && campaign.checkpointIndex != null) ? campaign.checkpointIndex : ai && ai.checkpointIndex != null ? ai.checkpointIndex : null;
    const checkpointTotal = (campaign && campaign.checkpointTotal != null) ? campaign.checkpointTotal : ai && ai.checkpointTotal != null ? ai.checkpointTotal : null;

    if (campaignXpRewardEl) {
      campaignXpRewardEl.textContent = xpReward != null ? `${xpReward} XP` : "—";
    }
    if (campaignCheckpointProgressEl) {
      const plotFinished = !!(ai && ai.isPlotFinished);
      if (checkpointIndex != null && checkpointTotal != null) {
        const current = Math.min(Math.max(0, Number(checkpointIndex) + 1), Number(checkpointTotal));
        campaignCheckpointProgressEl.textContent = plotFinished
          ? `✓ ${checkpointTotal}/${checkpointTotal}`
          : `${current}/${checkpointTotal}`;
      } else {
        campaignCheckpointProgressEl.textContent = plotFinished ? "✓" : "—";
      }
    }

    campaignProgressMeta.hidden = false;

    const checkpoints = ai && Array.isArray(ai.checkpoints) ? ai.checkpoints : null;
    if (campaignCheckpointDetailsEl && campaignCheckpointListEl) {
      if (checkpoints && checkpoints.length > 0) {
        campaignCheckpointDetailsEl.hidden = false;
        campaignCheckpointListEl.innerHTML = "";
        const idx = checkpointIndex != null ? Number(checkpointIndex) : 0;
        checkpoints.forEach((cp, i) => {
          const li = document.createElement("li");
          li.className = "checkpoint-item";
          if (i < idx) li.classList.add("checkpoint-item--done");
          if (i === idx) li.classList.add("checkpoint-item--current");
          li.textContent = String(cp || "").trim() || `Checkpoint ${i + 1}`;
          campaignCheckpointListEl.appendChild(li);
        });
      } else {
        campaignCheckpointDetailsEl.hidden = true;
      }
    }
  }

  function renderAiDmPointsOfInterest(points, { isStuck } = {}) {
    if (!aiDmPoiPanelEl || !aiDmPoiListEl) return;
  const STUCK_FIX_POI = "Force arrival at next landmark";

  const list = Array.isArray(points) ? points.map((p) => String(p || "").trim()).filter(Boolean) : [];
  const shouldShowStuckFix = Boolean(isStuck) || list.includes(STUCK_FIX_POI);

  if (!shouldShowStuckFix) {
      // Points of Interest are normally rendered as contextual buttons inside the DM chat bubble.
      // Keep the legacy panel hidden to avoid duplicate UI.
      aiDmPoiPanelEl.hidden = true;
      aiDmPoiListEl.innerHTML = "";
      return;
  }

  aiDmPoiPanelEl.hidden = false;
  aiDmPoiListEl.innerHTML = "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn--stuck-fix";
  btn.textContent = STUCK_FIX_POI;
  btn.addEventListener("click", () => {
    if (dialogueTextInputEl && !dialogueTextInputEl.disabled) {
      dialogueTextInputEl.value = STUCK_FIX_POI;
      try {
        dialogueTextInputEl.focus();
      } catch {
        // ignore
      }
    }
    handleDialoguePlayerInput(STUCK_FIX_POI, { source: "poi" });
  });
  aiDmPoiListEl.appendChild(btn);
  }

  function renderShadowArbiterDebug(debug) {
    if (!arbiterSidebarEl || !arbiterAnswerBadgeEl || !arbiterMetaEl || !arbiterPromptEl) return;

    // If the container exists, keep the layout sensible even when data is missing.
    function setLayoutSolo(isSolo) {
      if (!aiDmLayoutEl) return;
      if (isSolo) aiDmLayoutEl.classList.add("ai-dm__layout--solo");
      else aiDmLayoutEl.classList.remove("ai-dm__layout--solo");
    }

    const d = debug && typeof debug === "object" ? debug : null;
    const prompt = d && typeof d.prompt === "string" ? d.prompt : "";
    const answer = d && (d.answer === "YES" || d.answer === "NO") ? d.answer : null;
    const canonEventTitle = d && typeof d.canonEventTitle === "string" ? d.canonEventTitle : "";
    const canonEventId = d && typeof d.canonEventId === "string" ? d.canonEventId : "";
    const at = d && typeof d.at === "string" ? d.at : "";
    const canonEventSuccessCondition = d && typeof d.canonEventSuccessCondition === "string" ? d.canonEventSuccessCondition : "";
    const canonEventNudgeIdeas = d && Array.isArray(d.canonEventNudgeIdeas) ? d.canonEventNudgeIdeas : [];

    const hasAnything = !!prompt || !!answer || !!canonEventTitle || !!canonEventId;
    // For now, always show the panel when present so the user has feedback.
    arbiterSidebarEl.hidden = false;
    setLayoutSolo(false);
    arbiterPromptEl.value = prompt || "";

    const when = at ? new Date(at) : null;
    const whenLabel = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : "";
    const titleBits = [canonEventTitle, canonEventId ? `[${canonEventId}]` : ""]
      .filter(Boolean)
      .join(" ");
    arbiterMetaEl.textContent = hasAnything
      ? [titleBits, whenLabel].filter(Boolean).join(" · ")
      : "No Shadow Arbiter prompt received yet (canonTimeline may be disabled for this adventure, or the server isn't returning arbiterDebug).";

    arbiterAnswerBadgeEl.classList.remove("arbiter-badge--yes", "arbiter-badge--no");
    if (answer === "YES") {
      arbiterAnswerBadgeEl.textContent = "YES";
      arbiterAnswerBadgeEl.classList.add("arbiter-badge--yes");
    } else if (answer === "NO") {
      arbiterAnswerBadgeEl.textContent = "NO";
      arbiterAnswerBadgeEl.classList.add("arbiter-badge--no");
    } else {
      arbiterAnswerBadgeEl.textContent = "—";
    }

    // --- Arbiter Transparency UI: Current Objective + Hint ---
    const objectiveId = "arbiterObjective";
    const hintId = "arbiterHint";
    let objectiveEl = document.getElementById(objectiveId);
    if (!objectiveEl) {
      objectiveEl = document.createElement("div");
      objectiveEl.id = objectiveId;
      objectiveEl.className = "arbiter-objective";
      arbiterPromptEl.insertAdjacentElement("beforebegin", objectiveEl);
    }

    objectiveEl.innerHTML = "";
    const objectiveTitleEl = document.createElement("div");
    objectiveTitleEl.className = "arbiter-objective__title";
    objectiveTitleEl.textContent = "Current Objective";
    const objectiveBodyEl = document.createElement("div");
    objectiveBodyEl.className = "arbiter-objective__body";
    objectiveBodyEl.textContent = String(canonEventSuccessCondition || "").trim() || "—";
    objectiveEl.appendChild(objectiveTitleEl);
    objectiveEl.appendChild(objectiveBodyEl);

    let hintEl = document.getElementById(hintId);
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.id = hintId;
      hintEl.className = "arbiter-hint";
      arbiterPromptEl.insertAdjacentElement("beforebegin", hintEl);
    }

    const answerIsNo = answer === "NO";
    const ideas = canonEventNudgeIdeas
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!answerIsNo || ideas.length === 0) {
      hintEl.hidden = true;
      hintEl.innerHTML = "";
    } else {
      hintEl.hidden = false;
      hintEl.innerHTML = "";

      const hintBtn = document.createElement("button");
      hintBtn.type = "button";
      hintBtn.className = "arbiter-hint__btn";
      hintBtn.textContent = "Hint";

      const hintTextEl = document.createElement("div");
      hintTextEl.className = "arbiter-hint__text";
      hintTextEl.hidden = true;

      hintBtn.addEventListener("click", () => {
        const shouldShow = hintTextEl.hidden;
        if (shouldShow) {
          const idx = Math.floor(Math.random() * ideas.length);
          hintTextEl.textContent = ideas[idx] || "—";
        }
        hintTextEl.hidden = !shouldShow;
        hintBtn.textContent = shouldShow ? "Hide hint" : "Hint";
      });

      hintEl.appendChild(hintBtn);
      hintEl.appendChild(hintTextEl);
    }
  }

  function setGeminiQuotaHint(hint) {
    const resolved = String(hint || "").trim() || DEFAULT_GEMINI_QUOTA_HINT;
    activeGeminiQuotaHint = resolved;
    if (aiDmQuotaHintEl) {
      aiDmQuotaHintEl.hidden = false;
      aiDmQuotaHintEl.textContent = resolved;
    }
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
    return apiPostJson(BACKEND_BASE_URL, path, payload);
  }

  function humanizeWorldTheme(theme) {
    const t = String(theme ?? "").trim();
    return t.length ? t : "Unspecified world";
  }

  function setLobbyStatus(text) {
    if (!lobbyJoinStatus) return;
    lobbyJoinStatus.textContent = text || "";
  }

  function setLobbyChatStatus(text) {
    if (!lobbyChatStatus) return;
    lobbyChatStatus.textContent = text || "";
  }

  function renderLobbyChat(messages) {
    if (!lobbyChatThread) return;
    lobbyChatThread.innerHTML = "";
    const list = Array.isArray(messages) ? messages : [];
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No OOC messages yet.";
      lobbyChatThread.appendChild(empty);
      return;
    }
    list.forEach((m) => {
      const wrap = document.createElement("div");
      wrap.className = "lobby-chat__msg";
      const meta = document.createElement("div");
      meta.className = "lobby-chat__msg-meta";
      const when = m && m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
      meta.textContent = `${m?.author || "Unknown"}${when ? ` · ${when}` : ""}`;
      const body = document.createElement("div");
      body.textContent = String(m?.text || "");
      wrap.appendChild(meta);
      wrap.appendChild(body);
      lobbyChatThread.appendChild(wrap);
    });
    lobbyChatThread.scrollTop = lobbyChatThread.scrollHeight;
  }

  async function loadLobbyDetails(lobbyId) {
    const user = getCurrentUser();
    if (!user || !lobbyId) return;

    setLobbyStatus("Loading lobby…");
    const res = await apiGet(`/api/lobbies/details?campaignId=${encodeURIComponent(lobbyId)}&user=${encodeURIComponent(user)}`);
    if (!res.ok) {
      setLobbyStatus((res.data && res.data.error) || "Could not load lobby.");
      return;
    }

    const campaign = res.data && res.data.campaign;
    const access = res.data && res.data.access;
    const discordLink = res.data && res.data.discordLink;
    const chat = res.data && res.data.lobbyChat;
    const pending = res.data && res.data.pendingParticipants;

    if (lobbyDetailTitle) lobbyDetailTitle.textContent = campaign?.name || "Lobby";
    if (lobbyDetailMeta) {
      const theme = humanizeWorldTheme(campaign?.worldTheme);
      const discordAvailable = Boolean(discordLink) || Boolean(campaign?.hasDiscordLink);
      lobbyDetailMeta.textContent = `GM: ${campaign?.dm || "Unknown"} · ${theme} · Discord: ${discordAvailable ? "available" : "none"}`;
    }

    if (lobbyDiscordLink) {
      if (discordLink) {
        lobbyDiscordLink.hidden = false;
        lobbyDiscordLink.href = String(discordLink);
      } else {
        lobbyDiscordLink.hidden = true;
        lobbyDiscordLink.href = "#";
      }
    }

    const status = access && access.status ? String(access.status) : "none";
    const canManage = !!(access && access.canManage);
    const isPending = status === "pending";
    const isParticipant = status === "participant";
    const canChat = canManage || isPending || isParticipant;

    if (lobbyPendingNotice) lobbyPendingNotice.hidden = !isPending;
    if (lobbyJoinBtn) {
      if (isParticipant) {
        lobbyJoinBtn.textContent = "Joined";
        lobbyJoinBtn.disabled = true;
      } else if (isPending) {
        lobbyJoinBtn.textContent = "Pending…";
        lobbyJoinBtn.disabled = true;
      } else {
        lobbyJoinBtn.textContent = "Request to Join";
        lobbyJoinBtn.disabled = false;
      }
    }

    if (lobbyGmQueue) lobbyGmQueue.hidden = !canManage;
    if (canManage && lobbyPendingList) {
      lobbyPendingList.innerHTML = "";
      const list = Array.isArray(pending) ? pending : [];
      if (!list.length) {
        const p = document.createElement("p");
        p.className = "text-muted";
        p.textContent = "No pending participants.";
        lobbyPendingList.appendChild(p);
      } else {
        list.forEach((u) => {
          const row = document.createElement("div");
          row.className = "lobby-queue__row";
          const label = document.createElement("div");
          label.textContent = String(u);

          const actions = document.createElement("div");
          actions.style.display = "inline-flex";
          actions.style.gap = "8px";

          const approve = document.createElement("button");
          approve.type = "button";
          approve.className = "btn btn--primary btn--small";
          approve.textContent = "Approve";
          approve.addEventListener("click", async () => {
            approve.disabled = true;
            const r = await apiPost("/api/lobbies/approve", { gmUsername: user, campaignId: lobbyId, username: u });
            if (!r.ok) {
              approve.disabled = false;
              setLobbyStatus((r.data && r.data.error) || "Failed to approve.");
              return;
            }
            setLobbyStatus("Approved.");
            loadLobbyDetails(lobbyId);
          });

          const reject = document.createElement("button");
          reject.type = "button";
          reject.className = "btn btn--secondary btn--small";
          reject.textContent = "Reject";
          reject.addEventListener("click", async () => {
            reject.disabled = true;
            const r = await apiPost("/api/lobbies/reject", { gmUsername: user, campaignId: lobbyId, username: u });
            if (!r.ok) {
              reject.disabled = false;
              setLobbyStatus((r.data && r.data.error) || "Failed to reject.");
              return;
            }
            setLobbyStatus("Rejected.");
            loadLobbyDetails(lobbyId);
          });

          actions.appendChild(approve);
          actions.appendChild(reject);

          row.appendChild(label);
          row.appendChild(actions);
          lobbyPendingList.appendChild(row);
        });
      }
    }

    renderLobbyChat(chat);

    if (lobbyChatInput) lobbyChatInput.disabled = !canChat;
    if (lobbyChatSendBtn) lobbyChatSendBtn.disabled = !canChat;
    setLobbyStatus("");
  }

  async function joinLobby(lobbyId) {
    const user = getCurrentUser();
    if (!user || !lobbyId) return;
    setLobbyStatus("Requesting to join…");
    const res = await apiPost("/api/lobbies/join", { username: user, campaignId: lobbyId });
    if (!res.ok) {
      setLobbyStatus((res.data && res.data.error) || "Could not request to join.");
      return;
    }
    setLobbyStatus("Requested. Waiting for GM approval…");
    loadLobbyDetails(lobbyId);
  }

  async function loadPublicLobbies() {
    if (!lobbiesList) return;
    if (lobbiesMessage) lobbiesMessage.textContent = "Loading lobbies…";
    lobbiesList.innerHTML = "";

    const res = await apiGet("/api/lobbies/public");
    if (!res.ok) {
      if (lobbiesMessage) lobbiesMessage.textContent = (res.data && res.data.error) || "Could not load lobbies.";
      return;
    }

    const lobbies = res.data && Array.isArray(res.data.lobbies) ? res.data.lobbies : [];
    if (!lobbies.length) {
      if (lobbiesMessage) lobbiesMessage.textContent = "No public lobbies yet.";
      return;
    }
    if (lobbiesMessage) lobbiesMessage.textContent = "";

    lobbies.forEach((c) => {
      const card = document.createElement("div");
      card.className = "lobby-card";

      const left = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "lobby-card__title";
      title.textContent = c.name || "Lobby";
      const meta = document.createElement("p");
      meta.className = "lobby-card__meta";
      {
        const theme = humanizeWorldTheme(c.worldTheme);
        const discordAvailable = Boolean(c.hasDiscordLink) || Boolean(String(c.discordLink || "").trim());
        meta.textContent = `GM: ${c.dm || "Unknown"} · ${theme} · Discord: ${discordAvailable ? "available" : "none"}`;
      }
      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.style.display = "inline-flex";
      right.style.gap = "10px";
      right.style.flexWrap = "wrap";

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn--secondary btn--small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", () => {
        activeLobbyId = c.id;
        if (lobbyDetail) lobbyDetail.hidden = false;
        loadLobbyDetails(c.id);
      });

      right.appendChild(viewBtn);
      card.appendChild(left);
      card.appendChild(right);
      lobbiesList.appendChild(card);
    });
  }

  async function sendLobbyChat() {
    const user = getCurrentUser();
    const lobbyId = activeLobbyId;
    if (!user || !lobbyId) return;
    const text = lobbyChatInput ? String(lobbyChatInput.value || "").trim() : "";
    if (!text) return;
    setLobbyChatStatus("Sending…");
    if (lobbyChatSendBtn) lobbyChatSendBtn.disabled = true;
    const res = await apiPost("/api/lobbies/chat/send", { campaignId: lobbyId, username: user, text });
    if (lobbyChatSendBtn) lobbyChatSendBtn.disabled = false;
    if (!res.ok) {
      setLobbyChatStatus((res.data && res.data.error) || "Failed to send.");
      return;
    }
    if (lobbyChatInput) lobbyChatInput.value = "";
    setLobbyChatStatus("");
    loadLobbyDetails(lobbyId);
  }

  async function loadStudioScenarios() {
    if (!studioScenarioList) return;
    studioScenarioList.innerHTML = "";
    if (studioScenarioMessage) studioScenarioMessage.textContent = "Loading scenarios…";

    const res = await apiGet("/api/templates/public");
    if (!res.ok) {
      if (studioScenarioMessage) studioScenarioMessage.textContent = "Could not load Hall scenarios.";
      return;
    }
    const templates = res.data && Array.isArray(res.data.templates) ? res.data.templates : [];
    if (!templates.length) {
      if (studioScenarioMessage) studioScenarioMessage.textContent = "No Hall templates yet.";
      return;
    }
    if (studioScenarioMessage) studioScenarioMessage.textContent = "";

    templates.slice(0, 12).forEach((t) => {
      const row = document.createElement("div");
      row.className = "studio-scenario";
      const left = document.createElement("div");
      const title = document.createElement("h4");
      title.style.margin = "0 0 6px";
      title.textContent = t.name || "Template";
      const meta = document.createElement("p");
      meta.className = "text-muted";
      meta.style.margin = "0";
      meta.textContent = `Architect: ${t.creatorUsername || t.dm || "Unknown"}`;
      left.appendChild(title);
      left.appendChild(meta);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--primary btn--small";
      btn.textContent = "Clone";
      btn.addEventListener("click", async () => {
        const user = getCurrentUser();
        if (!user) return;
        btn.disabled = true;
        if (studioScenarioMessage) studioScenarioMessage.textContent = "Cloning scenario…";
        const r = await apiPost("/api/scenarios/clone", { username: user, templateId: t.id });
        btn.disabled = false;
        if (!r.ok) {
          if (studioScenarioMessage) studioScenarioMessage.textContent = (r.data && r.data.error) || "Could not clone.";
          return;
        }
        if (studioScenarioMessage) studioScenarioMessage.textContent = "Scenario cloned. See My Active Worlds.";
        loadCampaigns("all");
      });

      row.appendChild(left);
      row.appendChild(btn);
      studioScenarioList.appendChild(row);
    });
  }

  function getCurrentUser() {
    try {
      return localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function getCampaignsStatusEl() {
    // Studio uses a separate status line for the campaign list.
    return campaignsMessageList || campaignsMessage;
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
    const { primaryUrl, fallbackUrl } = buildPortraitImageCandidates(prompt, seed);
    return primaryUrl || fallbackUrl || "";
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

    forgedCharacterEl.hidden = false;
    
    // Use the shared renderer so automatic and interactive forge show the same format
    const sheetHTML = renderCharacterSheetHTML(character, { compact: false });
    
    const title = document.createElement("h3");
    title.className = "forge__result-title";
    const { concept } = character;
    const classes = concept?.classSummary || "";
    title.textContent = concept?.race
      ? `${concept.race} ${classes || "Adventurer"}`
      : classes || "Forged Adventurer";

    forgedCharacterEl.innerHTML = "";
    forgedCharacterEl.appendChild(title);
    
    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = sheetHTML;
    forgedCharacterEl.appendChild(contentDiv);
  }

  async function apiGet(path) {
    return apiGetJson(BACKEND_BASE_URL, path);
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
        // Hall pillar filter (best-effort via tags).
        if (CURRENT_PAGE === "hall") {
          const tags = safeArray(t?.templateTags || t?.tags).map((x) => String(x || "").trim().toLowerCase());
          const isScenario = tags.includes("community-scenario") || tags.includes("scenario") || tags.includes("communityscenario");
          const isLore = tags.includes("world-lore") || tags.includes("worldlore") || tags.includes("lore");
          if (selectedHallPillar === "scenarios" && !isScenario) return false;
          if (selectedHallPillar === "lore" && !isLore) return false;
          if (selectedHallPillar === "templates" && (isScenario || isLore)) return false;
        }

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

  function buildCharacterSelectOptions({ selectEl, characters, levelMin, levelMax }) {
    if (!selectEl) return { hasEligible: false };
    selectEl.innerHTML = "";
    const list = Array.isArray(characters) ? characters : [];
    const userHasCharacters = list.length > 0;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = userHasCharacters ? "Choose a character" : "Create a character first";
    selectEl.appendChild(placeholder);

    let hasEligible = false;
    if (userHasCharacters) {
      list.forEach((ch) => {
        const lvl = computeCharacterTotalLevel(ch);
        const meets = lvl >= (levelMin ?? 1) && lvl <= (levelMax ?? lvl);
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
        selectEl.appendChild(opt);
      });
    }
    return { hasEligible };
  }

  function startSoloAdventure({ adventureId, characterId, statusEl }) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      if (statusEl) statusEl.textContent = "Log in to begin.";
      return;
    }
    if (!adventureId || !characterId) {
      if (statusEl) statusEl.textContent = "Choose a character first.";
      return;
    }
    if (statusEl) statusEl.textContent = "Starting solo run…";

    // Starting a fresh AI-solo run; clear any previous dialogue UI state
    if (campaignDialogueTranscriptEl) campaignDialogueTranscriptEl.value = "";
    if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "";

    apiPost("/api/ai-campaigns/start", {
      username: currentUser,
      characterId,
      adventureId,
    }).then((result) => {
      if (!result.ok) {
        const msg = (result.data && result.data.error) || "Could not start adventure.";
        if (statusEl) statusEl.textContent = msg;
        return;
      }
      const data = result.data || {};
      const campaign = data.campaign;
      if (statusEl) statusEl.textContent = "Adventure started. Opening campaign…";
      if (campaign) {
        openCampaignFromAnyPage(campaign);
      }
    });
  }

  function createAdventureCard(adv, characters) {
    const userHasCharacters = Array.isArray(characters) && characters.length > 0;

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
    const { hasEligible } = buildCharacterSelectOptions({
      selectEl: select,
      characters,
      levelMin: adv.levelMin,
      levelMax: adv.levelMax,
    });

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "btn btn--primary btn--small";
    startBtn.textContent = CURRENT_PAGE === "sagas" ? "Begin" : "Start solo run";
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
      startSoloAdventure({ adventureId: adv.id, characterId: selectedId, statusEl: status });
    });

    controls.appendChild(select);
    controls.appendChild(startBtn);
    controls.appendChild(status);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(summary);
    card.appendChild(controls);
    return card;
  }

  function renderSagasCategorized(adventures, characters) {
    const hasLedgerContainers = !!(sagasNewestList && sagasPopularList && sagasLegendaryList);
    if (!hasLedgerContainers) {
      renderAdventures(adventures, characters);
      return;
    }

    const list = Array.isArray(adventures) ? adventures : [];
    const chars = Array.isArray(characters) ? characters : [];

    // Featured quest: prefer RED_CLOAK if present.
    const featured = list.find((a) => String(a?.id || "") === "RED_CLOAK") || list[0] || null;
    if (sagaFeaturedTitle) sagaFeaturedTitle.textContent = featured ? `Featured Quest: ${featured.title || "Saga"}` : "Featured Quest";
    if (sagaFeaturedSummary) sagaFeaturedSummary.textContent = featured?.summary || "";

    if (sagaFeaturedSelect) {
      const { hasEligible } = buildCharacterSelectOptions({
        selectEl: sagaFeaturedSelect,
        characters: chars,
        levelMin: featured?.levelMin,
        levelMax: featured?.levelMax,
      });
      if (sagaFeaturedBeginBtn) sagaFeaturedBeginBtn.disabled = !featured || !hasEligible;
    }

    if (sagaFeaturedBeginBtn) {
      sagaFeaturedBeginBtn.onclick = () => {
        if (!featured) return;
        const characterId = sagaFeaturedSelect ? sagaFeaturedSelect.value : "";
        startSoloAdventure({ adventureId: featured.id, characterId, statusEl: sagaFeaturedStatus });
      };
    }

    // Simple categorization heuristics.
    const isLegendary = (adv) => {
      const diff = String(adv?.difficulty || "").toLowerCase();
      const lm = adv?.levelMin ?? 1;
      return diff.includes("deadly") || diff.includes("hard") || diff.includes("legend") || lm >= 10;
    };

    const newest = list.slice(0, 6);
    const popular = list.slice(0, 6);
    const legendary = list.filter(isLegendary).slice(0, 6);

    const fill = (container, items) => {
      if (!container) return;
      container.innerHTML = "";
      if (!items.length) {
        const p = document.createElement("p");
        p.className = "text-muted";
        p.textContent = "No sagas in this category yet.";
        container.appendChild(p);
        return;
      }
      items.forEach((adv) => container.appendChild(createAdventureCard(adv, chars)));
    };

    fill(sagasNewestList, newest);
    fill(sagasPopularList, popular);
    fill(sagasLegendaryList, legendary);

    if (adventuresList) adventuresList.hidden = true;
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

    const filteredAdventures = items.map((x) => x.adv);
    if (CURRENT_PAGE === "sagas" && sagasNewestList && sagasPopularList && sagasLegendaryList) {
      renderSagasCategorized(filteredAdventures, characters);
    } else {
      renderAdventures(filteredAdventures, characters);
    }
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

    adventures.forEach((adv) => {
      adventuresList.appendChild(createAdventureCard(adv, characters));
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

  function appendAiDmLog(role, text, opts = {}) {
    if (!text) return;
    const playerLabel = cachedPlayerSpeakerLabel || "You";
    const prefix = role === "dm" ? "ADA: " : `${playerLabel}: `;
    const current = campaignDialogueTranscriptEl
      ? campaignDialogueTranscriptEl.value.trim()
      : "";
    const poiRaw = opts && Array.isArray(opts.pointsOfInterest) ? opts.pointsOfInterest : null;
    const poi = poiRaw
      ? poiRaw.map((p) => String(p || "").trim()).filter(Boolean).slice(0, 8)
      : [];

    let entry = `${prefix}${text.trim()}`;
    // Persist POIs as a metadata line that our transcript parser can attach to this DM message.
    if (role === "dm" && poi.length > 0) {
      try {
        entry += `\n[POI] ${JSON.stringify(poi)}`;
      } catch {
        // ignore stringify failures
      }
    }
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
        const data = result && result.data ? result.data : {};
        // The UI shows a friendly message, but keep the technical detail available in the console
        // so we can tell whether the upstream Gemini/Gemma request was hit (and what it returned).
        const detail = data && (data.detail || data.debugDetail || data.upstreamDetail);
        const aiModel = data && data.aiModel ? data.aiModel : null;
        if (detail) {
          console.warn("[ADA] AI call failed", {
            status: result.status,
            error: data.error || data.message || null,
            detail,
            aiModel,
          });
        } else {
          console.warn("[ADA] AI call failed", {
            status: result.status,
            error: data && (data.error || data.message) ? (data.error || data.message) : null,
            aiModel,
          });
        }

        const msg =
          (data && (data.error || data.message)) ||
          "ADA could not respond right now.";
        if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = msg;
        return;
      }

      const payload = result.data || {};
      function sanitizeAiDmNarrative(rawText) {
        const t = String(rawText || "");
        if (!t.trim()) return "";
        const lines = t.split(/\r?\n/);
        const stopAt = lines.findIndex((line) => {
          return /^\s*(\[?mechanics\]?\s*[:\]]\s*)$/i.test(line) ||
            /^\s*(check|dc|ability|skill|advantage|progress|points\s*of\s*interest|pointsOfInterest)\s*[:\-]/i.test(line);
        });
        const kept = stopAt >= 0 ? lines.slice(0, stopAt) : lines;
        return kept.join("\n").trim();
      }

      const narrative = sanitizeAiDmNarrative(payload.narrative || payload.text || "");
      const mechanics = isHiddenHand ? null : payload.mechanics || null;
      const canon = isHiddenHand ? payload.canon || null : null;
      const debug = payload.debug || null;
      lastAiMechanics = mechanics;

      // Shadow Arbiter debug sidebar is only relevant for AI-DM (not Hidden Hand template-runs).
      if (!isHiddenHand) {
        renderShadowArbiterDebug(payload.arbiterDebug || null);
      } else {
        renderShadowArbiterDebug(null);
      }

      // Quota hint: show exact remaining messages from backend quota.
      setGeminiQuotaHint(formatAiQuotaHint(payload.quota || null, payload.quotaHint || ""));

      // If the backend returns updated campaign metadata (xp/checkpoints/status), merge it into the active campaign.
      const campaignPatch = payload.campaignPatch && typeof payload.campaignPatch === "object" ? payload.campaignPatch : null;
      if (campaignPatch && activeCampaign && typeof activeCampaign === "object") {
        Object.assign(activeCampaign, campaignPatch);
        renderAiDmCampaignProgress({ campaign: activeCampaign, ai: payload.ai || null });
      }

      // Points of interest: persisted with ADA's response so they can be rendered as buttons in the chat.
      const poi = mechanics && Array.isArray(mechanics.pointsOfInterest) ? mechanics.pointsOfInterest : null;
      renderAiDmPointsOfInterest(poi, { isStuck: payload.isStuck === true });

      if (narrative) {
        appendMessage("dm", narrative, { pointsOfInterest: poi });
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
        payload && payload.aiModel && payload.aiModel.model
          ? String(payload.aiModel.model)
          : debug && debug.gemini && debug.gemini.model
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
    const ai = data.ai || null;
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
        const xpReward = campaign.xpReward != null ? campaign.xpReward : ai && ai.xpReward != null ? ai.xpReward : null;
        const xpLabel = xpReward != null ? ` · Possible XP: ${xpReward}` : "";
        campaignDetailMeta.textContent = `${role} · Created ${created}${othersLabel}${xpLabel}`;
      }

      const isAi = isAIDmCampaign(campaign);
      if (aiDmNoticeEl) aiDmNoticeEl.hidden = !isAi;
      if (aiDmPanelEl) aiDmPanelEl.hidden = !isAi;

      // Dialogue-tab journey completion button: AI-solo only.
      const isAiSolo = isAi && campaign.mode === "ai-solo";
      const plotFinished = !!(ai && ai.isPlotFinished);
      const journeyCompleted = isAiSolo && ai && ai.status === "completed";
      if (completeJourneyBtn) {
        completeJourneyBtn.hidden = !(isAiSolo && plotFinished);
        completeJourneyBtn.disabled = !(isAiSolo && plotFinished) || journeyCompleted;
        completeJourneyBtn.textContent = journeyCompleted ? "Journey completed" : "Complete Journey";
      }

      if (isAi) {
        setGeminiQuotaHint(DEFAULT_GEMINI_QUOTA_HINT);
        renderAiDmCampaignProgress({ campaign, ai });
        // POIs are produced per-turn; the campaign details payload may not have them.
        renderAiDmPointsOfInterest(null);

        // Shadow Arbiter debug sidebar (prompt + YES/NO) – only meaningful for AI-solo.
        if (isAiSolo) {
          renderShadowArbiterDebug(ai && ai.arbiterDebug ? ai.arbiterDebug : null);
        } else {
          // Hide/collapse if not AI-solo.
          if (arbiterSidebarEl) arbiterSidebarEl.hidden = true;
          if (aiDmLayoutEl) aiDmLayoutEl.classList.add("ai-dm__layout--solo");
        }
      } else {
        renderAiDmCampaignProgress({ campaign: null, ai: null });
        renderAiDmPointsOfInterest(null);

        if (arbiterSidebarEl) arbiterSidebarEl.hidden = true;
        if (aiDmLayoutEl) aiDmLayoutEl.classList.add("ai-dm__layout--solo");
      }
      if (dialogueTextInputEl) dialogueTextInputEl.disabled = journeyCompleted;
      if (dialogueSendBtn) dialogueSendBtn.disabled = journeyCompleted;
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

      // Configure delete/leave buttons based on campaign type and user role.
      // NOTE: the DM is always a participant (even if not duplicated in participants[]).
      const isDm = campaign.dm === currentUser;
      const isParticipant =
        isDm ||
        (Array.isArray(campaign.participants) &&
          campaign.participants.includes(currentUser));

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

        // AI-solo: completion is determined by reaching the final checkpoint.
        // We still provide a "Complete campaign" button as a finalize/unlock step
        // (not an XP-award step), because it can also fix metadata drift.
        const aiCheckpointIndex = ai && ai.checkpointIndex != null ? Number(ai.checkpointIndex) : null;
        const aiCheckpointTotal = ai && ai.checkpointTotal != null ? Number(ai.checkpointTotal) : null;
        const reachedFinishLine =
          alreadyCompleted ||
          (ai && ai.isPlotFinished) ||
          (aiCheckpointIndex != null && aiCheckpointTotal != null
            ? aiCheckpointIndex >= Math.max(0, aiCheckpointTotal - 1)
            : false);

        const canSeeComplete = isParticipant && (isAi || isDm);
        const canClickComplete = isAi
          ? reachedFinishLine
          : (!alreadyCompleted && isDm && isParticipant);

        campaignCompleteBtn.hidden = !canSeeComplete;
        campaignCompleteBtn.disabled = !canClickComplete;
        // Keep the label stable, but hint the reason when disabled for AI.
        if (isAi) {
          campaignCompleteBtn.textContent = canClickComplete ? "Complete campaign" : "Complete campaign (finish journey to unlock)";
        } else {
          campaignCompleteBtn.textContent = "Complete campaign";
        }
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

      // Lobby Chat & Approval Queue
      const lobbyChat = Array.isArray(campaign.lobbyChat) ? campaign.lobbyChat : [];
      const pendingParticipants = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
      const isPending = pendingParticipants.includes(currentUser);

      renderLobbyChatMessages(lobbyChat, currentUser);

      if (campaignPendingNotice) {
        campaignPendingNotice.hidden = !isPending;
      }

      if (campaignGmQueue) {
        campaignGmQueue.hidden = !isDm || pendingParticipants.length === 0;
        if (isDm && pendingParticipants.length > 0) {
          renderPendingApprovals(pendingParticipants);
        }
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

    const statusEl = getCampaignsStatusEl();
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
        isDm ||
        (Array.isArray(c.participants) && c.participants.includes(currentUser));
      if (!isParticipant) return false;
      if (filter === "dm") return isDm;
      if (filter === "player") return !isDm;
      return true;
    });

    if (filtered.length === 0) {
      if (statusEl) {
        if (filter === "dm") {
          statusEl.textContent =
            "You're not a DM in any campaigns yet.";
        } else if (filter === "player") {
          statusEl.textContent =
            "You're not listed as a player in any campaigns yet.";
        } else {
          statusEl.textContent = "No campaigns yet.";
        }
      }
      return;
    }

    if (statusEl) statusEl.textContent = "";

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
    const statusEl = getCampaignsStatusEl();
    if (!currentUser) {
      if (statusEl) statusEl.textContent =
          "You need to be logged in to see campaigns.";
      if (campaignsList) campaignsList.innerHTML = "";
      return;
    }

    if (statusEl) statusEl.textContent = "Loading campaigns...";
    if (campaignsList) campaignsList.innerHTML = "";

    const result = await apiGet(
      `/api/campaigns?user=${encodeURIComponent(currentUser)}`
    );
    if (!result.ok) {
      if (statusEl) statusEl.textContent =
          "Could not load campaigns. Please try again later.";
      return;
    }

    const campaigns =
      result.data && Array.isArray(result.data.campaigns)
        ? result.data.campaigns
        : [];
    renderCampaigns(campaigns, filter, currentUser);

    // Also populate the publish campaign dropdown if on studio page
    if (publishCampaignSelect && CURRENT_PAGE === "studio") {
      populatePublishCampaignSelect(campaigns, currentUser);
    }
  }

  function populatePublishCampaignSelect(campaigns, currentUser) {
    if (!publishCampaignSelect) return;
    
    // Clear existing options except the first placeholder
    while (publishCampaignSelect.options.length > 1) {
      publishCampaignSelect.remove(1);
    }

    const eligibleCampaigns = campaigns.filter(c => {
      // Can only publish campaigns where user is DM and it's not already a template
      return c.dm === currentUser && !c.isTemplate && Array.isArray(c.canonTimeline) && c.canonTimeline.length > 0;
    });

    if (eligibleCampaigns.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No eligible campaigns (must have Canon Events)";
      opt.disabled = true;
      publishCampaignSelect.appendChild(opt);
      return;
    }

    eligibleCampaigns.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      publishCampaignSelect.appendChild(opt);
    });
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

    // Unified sheet display (matches the Forge formatting).
    if (vaultDetailSheet) {
      vaultDetailSheet.innerHTML = renderCharacterSheetHTML(character, { compact: false });
    }

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
      if (target === "portal") {
        navigateTo("portal");
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
          headers: authHeaders({ "Content-Type": "application/json" }),
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

      // If already logged in and they hit the auth page, send them to the Portal.
      if (CURRENT_PAGE === "auth") {
        navigateTo("portal");
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
      } else if (CURRENT_PAGE === "onboarding") {
        wireOnboardingGate();
      } else if (CURRENT_PAGE === "portal") {
        wirePortalHub();
      } else if (CURRENT_PAGE === "sagas") {
        wireLibrarySearchAndFilters();
        loadAdventuresAndCharacters();
      } else if (CURRENT_PAGE === "lobbies") {
        if (lobbyDetail) lobbyDetail.hidden = true;
        if (lobbyChatInput) lobbyChatInput.disabled = true;
        if (lobbyChatSendBtn) lobbyChatSendBtn.disabled = true;

        if (lobbyJoinBtn)
          lobbyJoinBtn.addEventListener("click", () => {
            if (!activeLobbyId) {
              setLobbyStatus("Select a lobby first.");
              return;
            }
            joinLobby(activeLobbyId);
          });

        if (lobbyChatSendBtn) lobbyChatSendBtn.addEventListener("click", () => sendLobbyChat());
        if (lobbyChatInput)
          lobbyChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendLobbyChat();
            }
          });

        loadPublicLobbies();
      } else if (CURRENT_PAGE === "studio") {
        loadCampaigns("all");
        loadStudioScenarios();
      } else if (CURRENT_PAGE === "hall") {
        wireHallPillars();
        wireLibrarySearchAndFilters();
        loadPublicTemplates();
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

  // Forge mode selection handlers
  function showForgeMode(mode) {
    const modeSelection = document.getElementById("forgeModeSelection");
    const autoPanel = document.getElementById("autoForgePanel");
    const manualPanel = document.getElementById("manualForgePanel");
    const interactivePanel = document.getElementById("interactiveForgePanel");
    
    if (modeSelection) modeSelection.style.display = mode === null ? "block" : "none";
    if (autoPanel) autoPanel.style.display = mode === "auto" ? "block" : "none";
    if (manualPanel) manualPanel.style.display = mode === "manual" ? "block" : "none";
    if (interactivePanel) interactivePanel.style.display = "none";
  }

  const autoForgeBtn = document.getElementById("autoForgeBtn");
  const manualForgeBtn = document.getElementById("manualForgeBtn");
  const backToModeBtn = document.getElementById("backToModeBtn");
  const backToModeBtn2 = document.getElementById("backToModeBtn2");

  if (autoForgeBtn) {
    autoForgeBtn.addEventListener("click", () => {
      showForgeMode("auto");
      renderForgedCharacter(null);
      setForgeStatus("");
    });
  }

  if (manualForgeBtn) {
    manualForgeBtn.addEventListener("click", () => {
      showForgeMode("manual");
    });
  }

  if (backToModeBtn) {
    backToModeBtn.addEventListener("click", () => {
      showForgeMode(null);
    });
  }

  if (backToModeBtn2) {
    backToModeBtn2.addEventListener("click", () => {
      showForgeMode(null);
    });
  }

  if (forgeCharacterBtn) {
    forgeCharacterBtn.addEventListener("click", async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setForgeStatus("You need to be logged in to create a character.");
        renderForgedCharacter(null);
        return;
      }

      // Get form values
      const forgeClassSelect = document.getElementById("forgeClassSelect");
      const forgeLevelSelect = document.getElementById("forgeLevelSelect");
      const forgeRaceSelect = document.getElementById("forgeRaceSelect");
      const forgeCharacterLevelInput = document.getElementById("forgeCharacterLevel");
      
      const selectedClass = forgeClassSelect ? forgeClassSelect.value : "fighter";
      // Use the new level input field if available, otherwise fall back to old select
      const selectedLevel = forgeCharacterLevelInput 
        ? parseInt(forgeCharacterLevelInput.value) || 5
        : (forgeLevelSelect ? parseInt(forgeLevelSelect.value) : 1);
      const selectedRace = forgeRaceSelect && forgeRaceSelect.value ? forgeRaceSelect.value : undefined;
      
      const rawName = forgeCharacterNameInput && forgeCharacterNameInput.value
        ? forgeCharacterNameInput.value.trim()
        : "";

      // Check if we have decision matches to use for semantic generation
      if (lastDecisionMatches && lastDecisionMatches.length > 0) {
        setForgeStatus(`Forging ${selectedClass} (Level ${selectedLevel}) aligned with your narrative...`);
      } else {
        setForgeStatus(`Generating ${selectedClass} (Level ${selectedLevel})...`);
      }
      renderForgedCharacter(null);

      try {
        // Generate character using decision tree with optional semantic alignment
        const character = lastDecisionMatches && lastDecisionMatches.length > 0
          ? await generateCharacterWithSimilarity({
              characterClass: selectedClass,
              level: selectedLevel,
              race: selectedRace,
              decisionMatches: lastDecisionMatches
            })
          : await generateCharacter({
              characterClass: selectedClass,
              level: selectedLevel,
              race: selectedRace
            });
        
        // Set username and name
        character.username = currentUser;
        character.name = rawName || `${character.race} ${character.classes[0].name}`;
        
        // Include the user's narrative transcript
        const currentTranscript = transcriptEl ? (transcriptEl.value || "") : "";
        character.narrativeText = currentTranscript;
        
        if (!character) {
          setForgeStatus("Generation failed. Please try again.");
          renderForgedCharacter(null);
          return;
        }

        pendingForgedCharacter = character;
        pendingNarrativeText = currentTranscript;
        pendingCharacterName = rawName || "";
        setForgeStatus("Preview ready. Pick a portrait, then finish character creation to save.");
        renderForgedCharacter(character);
        updateFinishCharacterButtonState();
      } catch (error) {
        console.error('Character generation error:', error);
        setForgeStatus(error.message || "Could not generate character. Please try again.");
        renderForgedCharacter(null);
      }
    });
  }

  if (finishCharacterBtn) {
    finishCharacterBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setForgeStatus("You need to be logged in to finish character creation.");
        return;
      }
      if (!pendingForgedCharacter) {
        setForgeStatus("Generate a character first.");
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

      // Get form values for re-generation
      const forgeClassSelect = document.getElementById("forgeClassSelect");
      const forgeLevelSelect = document.getElementById("forgeLevelSelect");
      const forgeRaceSelect = document.getElementById("forgeRaceSelect");
      
      const selectedClass = forgeClassSelect ? forgeClassSelect.value : "fighter";
      const selectedLevel = forgeLevelSelect ? parseInt(forgeLevelSelect.value) : 1;
      const selectedRace = forgeRaceSelect && forgeRaceSelect.value ? forgeRaceSelect.value : undefined;

      apiPost("/api/characters/generate-random", {
        username: currentUser,
        class: selectedClass,
        level: selectedLevel,
        race: selectedRace,
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
        headers: authHeaders({ "Content-Type": "application/json" }),
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

        // New auth flow returns a token; keep username-based storage for backward compatibility.
        const token = result.data && result.data.token;
        if (token) setAuthToken(token);

        setCurrentUser(username);
        updateNav(username);
        if (profileUsernameEl) profileUsernameEl.textContent = username;
        setAuthMessage("");
        showView("onboarding");
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
          headers: authHeaders({ "Content-Type": "application/json" }),
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

      const isAi = isAIDmCampaign(activeCampaign);
      const confirmed = window.confirm(
        isAi
          ? "Finalize this AI saga as completed? This will unlock your character so you can start a new saga."
          : "Mark this campaign as completed? This will award XP to all linked characters.",
      );
      if (!confirmed) return;

      if (campaignActionStatusEl)
        campaignActionStatusEl.textContent = isAi
          ? "Finalizing AI saga..."
          : "Completing campaign and awarding XP...";

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
        const unlinked = result.data && Array.isArray(result.data.unlinkedCharacterIds)
          ? result.data.unlinkedCharacterIds.length
          : 0;

        if (campaignActionStatusEl) {
          if (isAi) {
            campaignActionStatusEl.textContent = unlinked
              ? `Saga finalized. Unlinked ${unlinked} character(s) for your next run.`
              : "Saga finalized.";
          } else {
            campaignActionStatusEl.textContent = xp != null
              ? `Campaign completed. Awarded ${xp} XP.`
              : "Campaign completed.";
          }
        }

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

    function resolveAiDmPendingCheck() {
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
        const aiError = payload.aiError ? String(payload.aiError) : "";

		// Quota hint: show exact remaining messages from backend quota.
		setGeminiQuotaHint(formatAiQuotaHint(payload.quota || null, payload.quotaHint || ""));

        // If the backend returns updated campaign metadata (xp/checkpoints/status), merge it into the active campaign.
        const campaignPatch = payload.campaignPatch && typeof payload.campaignPatch === "object" ? payload.campaignPatch : null;
        if (campaignPatch && activeCampaign && typeof activeCampaign === "object") {
          Object.assign(activeCampaign, campaignPatch);
          renderAiDmCampaignProgress({ campaign: activeCampaign, ai: payload.ai || null });
        }

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

        // Points of interest: persisted with ADA's response so they can be rendered as buttons in the chat.
        const poi = mechanics && Array.isArray(mechanics.pointsOfInterest) ? mechanics.pointsOfInterest : null;
        renderAiDmPointsOfInterest(poi, { isStuck: payload.isStuck === true });

        if (narrative) appendAiDmLog("dm", narrative, { pointsOfInterest: poi });

        lastAiMechanics = mechanics;

        if (aiError && aiDmMechanicsEl) {
          aiDmMechanicsEl.textContent = aiError;
        } else if (mechanics && aiDmMechanicsEl) {
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
          payload && payload.aiModel && payload.aiModel.model
            ? String(payload.aiModel.model)
            : debug && debug.gemini && debug.gemini.model
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
    }

    aiDmRollBtn.addEventListener("click", () => resolveAiDmPendingCheck());
  }

  if (completeJourneyBtn) {
    completeJourneyBtn.addEventListener("click", () => {
      if (!activeCampaignId || !activeCampaign) return;
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      // Only AI-solo journeys support this; template-run uses a different canon pipeline.
      if (!isAIDmCampaign(activeCampaign) || activeCampaign.mode !== "ai-solo") {
        if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Complete Journey is only available for AI solo sagas.";
        return;
      }

      const confirmed = window.confirm(
        "Complete the journey? This will close the AI story thread (you can still archive/complete the campaign afterward)."
      );
      if (!confirmed) return;

      if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = "Completing journey...";

      apiPost("/api/campaigns/details", {
        action: "completeJourney",
        campaignId: activeCampaignId,
        username: currentUser,
      }).then((result) => {
        if (!result.ok) {
          const msg =
            (result.data && (result.data.error || result.data.message)) ||
            "Could not complete journey.";
          if (aiDmMechanicsEl) aiDmMechanicsEl.textContent = msg;
          return;
        }

        if (aiDmMechanicsEl) {
          aiDmMechanicsEl.textContent =
            "Journey completed. You can now use 'Complete campaign' to finalize rewards and unlock your character.";
        }

        loadCampaignDetail(activeCampaignId);
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

      // Clear JWT session.
      clearAuthToken();

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
        isPublicLobby: campaignIsPublicLobbyToggle ? Boolean(campaignIsPublicLobbyToggle.checked) : false,
        hasAiPlayers: campaignHasAiPlayersToggle ? Boolean(campaignHasAiPlayersToggle.checked) : false,
        aiPlayerPrompt: campaignAiPlayerPrompt ? String(campaignAiPlayerPrompt.value || "").trim() : "",
        worldTheme: campaignWorldThemeInput ? String(campaignWorldThemeInput.value || "").trim() : "",
        discordLink: campaignDiscordLinkInput ? String(campaignDiscordLinkInput.value || "").trim() : "",
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
        if (campaignIsPublicLobbyToggle) campaignIsPublicLobbyToggle.checked = false;
        if (campaignHasAiPlayersToggle) campaignHasAiPlayersToggle.checked = false;
        if (campaignAiPlayerPrompt) campaignAiPlayerPrompt.value = "";
        if (aiPlayerPromptField) aiPlayerPromptField.hidden = true;
        if (campaignWorldThemeInput) campaignWorldThemeInput.value = "";
        if (campaignDiscordLinkInput) campaignDiscordLinkInput.value = "";
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

  // Toggle AI Player Prompt field visibility in Studio
  if (campaignHasAiPlayersToggle && aiPlayerPromptField) {
    campaignHasAiPlayersToggle.addEventListener("change", () => {
      aiPlayerPromptField.hidden = !campaignHasAiPlayersToggle.checked;
    });
  }

  // Publish Campaign to Hall of Records (Studio)
  if (publishCampaignForm) {
    publishCampaignForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (publishCampaignStatus) publishCampaignStatus.textContent = "Please log in.";
        return;
      }

      const campaignId = publishCampaignSelect ? publishCampaignSelect.value : "";
      const summary = publishTemplateSummary ? publishTemplateSummary.value.trim() : "";
      const tags = publishTemplateTags ? publishTemplateTags.value.trim() : "";

      if (!campaignId) {
        if (publishCampaignStatus) publishCampaignStatus.textContent = "Please select a campaign.";
        return;
      }

      if (publishCampaignStatus) publishCampaignStatus.textContent = "Publishing to Hall...";

      const result = await apiPost("/api/templates/publish", {
        username: currentUser,
        campaignId,
        templateSummary: summary,
        templateTags: tags,
      });

      if (!result.ok) {
        const msg = (result.data && (result.data.error || result.data.message)) || "Could not publish.";
        if (publishCampaignStatus) publishCampaignStatus.textContent = msg;
        return;
      }

      if (publishCampaignStatus) publishCampaignStatus.textContent = "Published to Hall of Records!";
      if (publishCampaignSelect) publishCampaignSelect.value = "";
      if (publishTemplateSummary) publishTemplateSummary.value = "";
      if (publishTemplateTags) publishTemplateTags.value = "";
    });
  }

  // Publish Solo Adventure to AI Sagas (Studio)
  if (publishAdventureForm) {
    publishAdventureForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        if (publishAdventureStatus) publishAdventureStatus.textContent = "Please log in.";
        return;
      }

      const title = adventureTitleInput ? String(adventureTitleInput.value || "").trim() : "";
      const summary = adventureSummaryInput ? String(adventureSummaryInput.value || "").trim() : "";
      const difficulty = adventureDifficultySelect
        ? String(adventureDifficultySelect.value || "Normal")
        : "Normal";
      const levelMin = adventureLevelMinInput
        ? Number.parseInt(String(adventureLevelMinInput.value || "1"), 10)
        : 1;
      const levelMax = adventureLevelMaxInput
        ? Number.parseInt(String(adventureLevelMaxInput.value || String(levelMin || 1)), 10)
        : levelMin;
      const primer = adventurePrimerInput ? String(adventurePrimerInput.value || "").trim() : "";
      const checkpointsText = adventureCheckpointsInput
        ? String(adventureCheckpointsInput.value || "")
        : "";
      const victoryText = adventureVictoryInput ? String(adventureVictoryInput.value || "") : "";
      const defeatText = adventureDefeatInput ? String(adventureDefeatInput.value || "") : "";
      const tagsText = adventureTagsInput ? String(adventureTagsInput.value || "") : "";

      if (!title || !summary) {
        if (publishAdventureStatus) publishAdventureStatus.textContent = "Please provide a title and summary.";
        return;
      }

      const checkpoints = checkpointsText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      const victoryConditions = victoryText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const defeatConditions = defeatText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = tagsText
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (publishAdventureStatus) publishAdventureStatus.textContent = "Publishing to AI Sagas...";

      const result = await apiPost("/api/adventures/publish", {
        username: currentUser,
        title,
        summary,
        difficulty,
        levelMin: Number.isFinite(levelMin) ? levelMin : 1,
        levelMax: Number.isFinite(levelMax) ? levelMax : (Number.isFinite(levelMin) ? levelMin : 1),
        primer,
        checkpoints,
        victoryConditions,
        defeatConditions,
        tags,
      });

      if (!result.ok) {
        const msg = (result.data && (result.data.error || result.data.message)) || "Could not publish adventure.";
        if (publishAdventureStatus) publishAdventureStatus.textContent = msg;
        return;
      }

      if (publishAdventureStatus) publishAdventureStatus.textContent = "Published! View it in AI Sagas.";
      if (adventureTitleInput) adventureTitleInput.value = "";
      if (adventureSummaryInput) adventureSummaryInput.value = "";
      if (adventurePrimerInput) adventurePrimerInput.value = "";
      if (adventureCheckpointsInput) adventureCheckpointsInput.value = "";
      if (adventureVictoryInput) adventureVictoryInput.value = "";
      if (adventureDefeatInput) adventureDefeatInput.value = "";
      if (adventureTagsInput) adventureTagsInput.value = "";

      // Best-effort: if the user has the sagas UI open in a multi-view page, refresh.
      if (CURRENT_PAGE === "sagas") {
        loadAdventuresAndCharacters();
      }
    });
  }

  // Campaign Lobby Chat (OOC)
  if (campaignLobbyChatComposer) {
    campaignLobbyChatComposer.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser || !activeCampaignId) return;

      const text = campaignLobbyChatInput ? campaignLobbyChatInput.value.trim() : "";
      if (!text) return;

      if (campaignLobbyChatStatus) campaignLobbyChatStatus.textContent = "Sending...";

      const result = await apiPost("/api/lobbies/chat/send", {
        campaignId: activeCampaignId,
        username: currentUser,
        text,
      });

      if (!result.ok) {
        const msg = (result.data && result.data.error) || "Could not send message.";
        if (campaignLobbyChatStatus) campaignLobbyChatStatus.textContent = msg;
        return;
      }

      if (campaignLobbyChatInput) campaignLobbyChatInput.value = "";
      if (campaignLobbyChatStatus) campaignLobbyChatStatus.textContent = "";

      // Append message locally
      const msg = result.data && result.data.message;
      if (msg && campaignLobbyChatThread) {
        const msgEl = createLobbyChatMessage(msg, currentUser);
        campaignLobbyChatThread.appendChild(msgEl);
        campaignLobbyChatThread.scrollTop = campaignLobbyChatThread.scrollHeight;
      }
    });
  }

  function createLobbyChatMessage(msg, currentUser) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--lobby";
    
    const meta = document.createElement("div");
    meta.className = "chat-msg__meta";
    const timestamp = new Date(msg.createdAt || Date.now()).toLocaleTimeString();
    meta.textContent = `${msg.author} · ${timestamp}`;
    
    const body = document.createElement("div");
    body.className = "chat-msg__body";
    body.textContent = msg.text || "";
    
    div.appendChild(meta);
    div.appendChild(body);
    return div;
  }

  function renderLobbyChatMessages(messages, currentUser) {
    if (!campaignLobbyChatThread) return;
    campaignLobbyChatThread.innerHTML = "";
    
    if (!Array.isArray(messages) || messages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No messages yet. Start the conversation!";
      campaignLobbyChatThread.appendChild(empty);
      return;
    }

    messages.forEach(msg => {
      const msgEl = createLobbyChatMessage(msg, currentUser);
      campaignLobbyChatThread.appendChild(msgEl);
    });
    
    campaignLobbyChatThread.scrollTop = campaignLobbyChatThread.scrollHeight;
  }

  function renderPendingApprovals(pendingUsers) {
    if (!campaignPendingList) return;
    campaignPendingList.innerHTML = "";

    if (!Array.isArray(pendingUsers) || pendingUsers.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = "No pending requests.";
      campaignPendingList.appendChild(empty);
      return;
    }

    pendingUsers.forEach(username => {
      const item = document.createElement("div");
      item.className = "pending-item";

      const name = document.createElement("span");
      name.className = "pending-item__name";
      name.textContent = username;

      const actions = document.createElement("div");
      actions.className = "pending-item__actions";

      const approveBtn = document.createElement("button");
      approveBtn.className = "btn btn--primary btn--small";
      approveBtn.textContent = "Approve";
      approveBtn.type = "button";
      approveBtn.addEventListener("click", async () => {
        await handleApprovePlayer(username);
      });

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "btn btn--secondary btn--small";
      rejectBtn.textContent = "Reject";
      rejectBtn.type = "button";
      rejectBtn.addEventListener("click", async () => {
        await handleRejectPlayer(username);
      });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      item.appendChild(name);
      item.appendChild(actions);
      campaignPendingList.appendChild(item);
    });
  }

  async function handleApprovePlayer(username) {
    const currentUser = getCurrentUser();
    if (!currentUser || !activeCampaignId) return;

    const result = await apiPost("/api/campaigns/approve-player", {
      gmUsername: currentUser,
      campaignId: activeCampaignId,
      username,
    });

    if (!result.ok) {
      alert((result.data && result.data.error) || "Could not approve player.");
      return;
    }

    // Reload campaign detail to refresh pending list
    loadCampaignDetail(activeCampaignId);
  }

  async function handleRejectPlayer(username) {
    const currentUser = getCurrentUser();
    if (!currentUser || !activeCampaignId) return;

    const result = await apiPost("/api/lobbies/reject", {
      gmUsername: currentUser,
      campaignId: activeCampaignId,
      username,
    });

    if (!result.ok) {
      alert((result.data && result.data.error) || "Could not reject player.");
      return;
    }

    // Reload campaign detail to refresh pending list
    loadCampaignDetail(activeCampaignId);
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
