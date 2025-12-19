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

  const authSection = document.getElementById("authSection");
  const homeSection = document.getElementById("homeSection");
  const profileSection = document.getElementById("profileSection");
  const campaignsSection = document.getElementById("campaignsSection");
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

  // Backend API base URL (Cloudflare Worker)
  const BACKEND_BASE_URL = "https://backend.ada-assistante.workers.dev";

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

  function setPortraitStatus(text) {
    if (!portraitStatusEl) return;
    portraitStatusEl.textContent = text || "";
  }

  function setAuthMessage(message) {
    if (!authMessageEl) return;
    authMessageEl.textContent = message || "";
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
    // view: "auth-login" | "auth-register" | "home" | "profile" | "campaigns"
    const isAuthView = view === "auth-login" || view === "auth-register";

    if (authSection) authSection.hidden = !isAuthView;
    if (loginView) loginView.hidden = view !== "auth-login";
    if (registerView) registerView.hidden = view !== "auth-register";
    if (homeSection) homeSection.hidden = view !== "home";
    if (profileSection) profileSection.hidden = view !== "profile";
    if (campaignsSection) campaignsSection.hidden = view !== "campaigns";

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
        showView("campaigns");
        loadCampaigns("all");
      }
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
