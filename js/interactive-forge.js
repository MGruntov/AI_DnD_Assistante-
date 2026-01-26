/**
 * Interactive Character Forge Module
 * Handles step-by-step character creation with manual choice selection
 */

import { authHeaders } from './api.js';
import { renderCharacterSheetHTML } from './character-sheet-renderer.js';

// Module state
let InteractiveCharacterCreator = null;
let creator = null;
let startBtn, restartBtn, interactivePanel, progressDiv, forgeStatus, forgedCharacterDiv, finishBtn, saveCharacterBtn;
let categories = {};
let choiceContainers = {};
let isSaving = false;
let needsSave = false;
let savedCharacterId = null;
let autosaveTimer = null;
let isSheetValidated = false;

/**
 * Initialize DOM elements and attach event listeners
 */
export function initializeInteractiveForge() {
  console.log('[initializeElements] Starting initialization...');
  startBtn = document.getElementById('startInteractiveForgeBtn');
  console.log('[initializeElements] startBtn:', startBtn);
  restartBtn = document.getElementById('restartForgeBtn');
  interactivePanel = document.getElementById('interactiveForgePanel');
  progressDiv = document.getElementById('currentProgress');
  forgeStatus = document.getElementById('forgeStatus');
  forgedCharacterDiv = document.getElementById('forgedCharacter');
  finishBtn = document.getElementById('forgeCharacterBtn');
  saveCharacterBtn = document.getElementById('saveCharacterBtn');

  // Category containers
  categories = {
    race: document.getElementById('raceChoices'),
    class: document.getElementById('classChoices'),
    background: document.getElementById('backgroundChoices'),
    skills: document.getElementById('skillChoices'),
    equipment: document.getElementById('equipmentChoices'),
    other: document.getElementById('otherChoices')
  };

  // Choice button containers
  choiceContainers = {
    race: document.getElementById('raceChoiceButtons'),
    class: document.getElementById('classChoiceButtons'),
    background: document.getElementById('backgroundChoiceButtons'),
    skills: document.getElementById('skillChoiceButtons'),
    equipment: document.getElementById('equipmentChoiceButtons'),
    other: document.getElementById('otherChoiceButtons')
  };

  // Expose start and AI choice functions globally as a fallback
  window.__startInteractiveForge = startInteractiveForge;
  window.__makeChoiceFromRecommendation = makeChoice;
  // Event listeners
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Capture manual name input at the moment of click
      const manualNameInput = document.getElementById('manualForgeCharacterName');
      if (manualNameInput && manualNameInput.value && manualNameInput.value.trim()) {
        window.__manualForgeCharacterName = manualNameInput.value.trim();
        console.log('[Forge Debug] Captured manual name on click:', window.__manualForgeCharacterName);
      } else {
        window.__manualForgeCharacterName = '';
      }
      startInteractiveForge();
    });
  } else {
    console.error('startInteractiveForgeBtn element not found!');
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', restartForge);
  }
  
  if (saveCharacterBtn) {
    saveCharacterBtn.addEventListener('click', async () => {
      console.log('[Save Character] Button clicked');
      if (saveCharacterBtn.disabled) {
        console.log('[Save Character] Button is disabled, returning');
        return;
      }
      
      console.log('[Save Character] Starting save process');
      
      // Auto-validate if needed
      const availableChoices = creator ? creator.getAvailableChoices() : [];
      const validateAction = availableChoices.find(c => c.id === 'validate_character_sheet');
      if (validateAction) {
        console.log('[Save Character] Auto-validating first');
        makeChoice(validateAction);
        // Wait a bit for validation to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Then finish character creation
      console.log('[Save Character] Calling finishCharacterCreation');
      await finishCharacterCreation();
    });
  }
  
  if (finishBtn) {
    finishBtn.addEventListener('click', async () => {
      if (finishBtn.disabled) return;
      
      const mode = finishBtn.dataset.mode;
      if (mode === 'validate') {
        // Find and apply the validate action
        const availableChoices = creator ? creator.getAvailableChoices() : [];
        const validateAction = availableChoices.find(c => c.id === 'validate_character_sheet');
        if (validateAction) {
          makeChoice(validateAction);
        }
      } else if (mode === 'finish') {
        await finishCharacterCreation();
      }
    });
  }
}

function getCurrentUser() {
  try {
    return localStorage.getItem('adaCurrentUser');
  } catch {
    return null;
  }
}

async function startInteractiveForge() {
  console.log('[startInteractiveForge] Function called!');
  console.log('[startInteractiveForge] startBtn:', startBtn);
  console.log('[startInteractiveForge] creator:', creator);
  console.log('Starting interactive forge...');
  try {
    // Dynamic import to avoid named export errors (with cache busting)
    // Force fresh import with version parameter
    const mod = await import(`./character-generator.js?v=${Math.random()}`);
    console.log('character-generator module keys:', Object.keys(mod));
    if (mod.default) {
      console.log('character-generator default keys:', Object.keys(mod.default));
    }
    InteractiveCharacterCreator = mod.InteractiveCharacterCreator || (mod.default && mod.default.InteractiveCharacterCreator) || null;

    if (!InteractiveCharacterCreator) {
      console.error('InteractiveCharacterCreator export not found');
      forgeStatus.textContent = 'Error: InteractiveCharacterCreator export not found.';
      forgeStatus.className = 'forge__status forge__status--error';
      return;
    }

    creator = new InteractiveCharacterCreator();
    console.log('Creator instantiated');
    await creator.initialize();

    // Set name from manual forge input if present
    // Use the captured name from the click event
    const capturedName = window.__manualForgeCharacterName || '';
    if (capturedName) {
      console.log('[Forge Debug] Using captured manual name in startInteractiveForge:', capturedName);
      if (typeof creator.setName === 'function') {
        creator.setName(capturedName);
      } else if (creator.state) {
        creator.state.name = capturedName;
      }
    }
    if (manualNameInput && manualNameInput.value && manualNameInput.value.trim()) {
      const nameValue = manualNameInput.value.trim();
      console.log('[Forge Debug] Setting creator name to:', nameValue);
      if (typeof creator.setName === 'function') {
        creator.setName(nameValue);
      } else if (creator.state) {
        creator.state.name = nameValue;
      }
    }

    // Read target level from manual forge input
    const levelInput = document.getElementById('manualForgeCharacterLevel');
    const targetLevel = levelInput ? parseInt(levelInput.value, 10) : 5;
    creator.setTargetLevel(targetLevel);
    console.log('Creator initialized with target level:', targetLevel);
    
    // Fetch similarity scores from transcript if available
    const transcriptEl = document.getElementById('transcript');
    const transcriptText = transcriptEl ? transcriptEl.value.trim() : '';
    if (transcriptText) {
      try {
        const { searchDecisionsByPrompt } = await import('./decision-matcher.js');
        // Use the ev713 backend URL
        const backendUrl = 'https://backend.ev713-backend.workers.dev';
        console.log('[forge] Using backend URL:', backendUrl);
        // Request all 433 decisions, not just top 15
        const response = await searchDecisionsByPrompt(backendUrl, transcriptText, 433);
        // Response has { ok, prompt, results: Array, totalDecisions, topK }
        if (response && response.results && Array.isArray(response.results)) {
          creator.setSimilarityScores(response.results);
          console.log(`[forge] Loaded ${response.results.length} similarity scores from search (out of ${response.totalDecisions} total)`);
        }
      } catch (err) {
        console.warn('[forge] Could not fetch similarity scores:', err);
      }
    }
    
    needsSave = false;
    isSaving = false;
    savedCharacterId = null;
    window.__interactiveForgeActive = true;
    
    startBtn.style.display = 'none';
    restartBtn.style.display = 'inline-block';
    interactivePanel.style.display = 'block';
    forgeStatus.textContent = 'Character creation started!';
    forgeStatus.className = 'forge__status forge__status--success';
    
    updateChoices();
  } catch (error) {
    console.error('Error starting interactive forge:', error);
    forgeStatus.textContent = `Error: ${error.message}`;
    forgeStatus.className = 'forge__status forge__status--error';
  }
}

function updateChoices() {
  if (!creator) return;
  
  console.log('Updating choices...');

  // Update progress
  const state = creator.getCharacterState();
  let countersText = 'All choices made';
  
  if (state) {
    const sheet = state.rawSheet;

    // Get counter info
    const counters = [
      { key: 'skills_to_choose', label: 'Skills' },
      { key: 'languages_to_choose', label: 'Languages' },
      { key: 'martial_weapons_to_choose', label: 'Martial Weapons' },
      { key: 'simple_weapons_to_choose', label: 'Simple Weapons' },
      { key: 'cantrips_to_choose', label: 'Cantrips' },
      { key: 'bard_spells_to_choose', label: 'Bard Spells' },
      { key: 'cleric_spells_to_choose', label: 'Cleric Spells' },
      { key: 'instruments_to_choose', label: 'Instruments' },
      { key: 'expertise_to_choose', label: 'Expertise' },
      { key: 'asi_to_choose', label: 'ASI' },
      { key: 'fighting_style_to_choose', label: 'Fighting Style' },
      { key: 'fighter_equip_choices_to_choose', label: 'Fighter Equipment' },
      { key: 'barbarian_primal_path_to_choose', label: 'Primal Path' },
      { key: 'bard_college_to_choose', label: 'Bard College' },
      { key: 'divine_domain_to_choose', label: 'Divine Domain' },
      { key: 'fighter_archetype_to_choose', label: 'Fighter Archetype' }
    ].filter(c => sheet[c.key] && sheet[c.key] > 0)
     .map(c => `${c.label}: ${sheet[c.key]}`)
     .join(' | ');
    countersText = counters || 'All choices made';

    // Use shared renderer so Forge + Vault show the same sheet format.
    progressDiv.innerHTML = renderCharacterSheetHTML(state, { compact: false });
  }

  // Display counters before choices
  const countersDiv = document.createElement('div');
  countersDiv.style.cssText = 'background:#2a2a2a;padding:1em;border-radius:6px;margin:1em 0;border:1px solid #444;';
  countersDiv.innerHTML = `<p style="margin:0;color:#fff;font-size:0.95em;"><strong>Choices Remaining:</strong> ${countersText}</p>`;
  
  const categoriesContainer = document.getElementById('choiceCategories');
  const existingCounters = categoriesContainer.querySelector('.counters-display');
  if (existingCounters) {
    existingCounters.remove();
  }
  countersDiv.className = 'counters-display';
  categoriesContainer.insertBefore(countersDiv, categoriesContainer.firstChild);
  
  // Get available choices by category
  const choicesByCategory = creator.getChoicesByCategory();
  
  // Filter out validate_character_sheet from all categories
  Object.keys(choicesByCategory).forEach(category => {
    choicesByCategory[category] = choicesByCategory[category].filter(
      choice => choice.id !== 'validate_character_sheet'
    );
  });
  
  // Find the option with highest similarity score across all categories (excluding validate)
  let bestChoice = null;
  let bestSimilarity = 0;
  Object.values(choicesByCategory).flat().forEach(choice => {
    const similarity = choice.similarity || 0;
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestChoice = choice;
    }
  });
  
  // Create/update AI recommendation box
  const existingRecommendation = categoriesContainer.querySelector('.ai-recommendation');
  if (existingRecommendation) {
    existingRecommendation.remove();
  }
  
  if (bestChoice && bestSimilarity > 0) {
    const recommendationDiv = document.createElement('div');
    recommendationDiv.className = 'ai-recommendation';
    recommendationDiv.style.cssText = 'background: linear-gradient(135deg, #1a4d2e 0%, #2d5a3d 100%); padding: 1.25em; border-radius: 8px; margin: 1em 0; border: 2px solid #4ade80; box-shadow: 0 4px 12px rgba(74, 222, 128, 0.15);';
    
    const bestLabel = bestChoice.title || bestChoice.id;
    recommendationDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75em; margin-bottom: 0.5em;">
        <span style="font-size: 1.5em;">✨</span>
        <strong style="color: #4ade80; font-size: 1.1em; letter-spacing: 0.5px;">AI RECOMMENDED</strong>
      </div>
      <div style="color: #e8f5e9; font-size: 1em; margin-bottom: 0.75em;">
        <strong style="font-size: 1.15em;">${bestLabel}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #a7d8a7; font-size: 0.9em;">Match score: ${(bestSimilarity * 100).toFixed(1)}%</span>
        <button 
          class="btn btn--primary" 
          style="background: #4ade80; color: #1a4d2e; border: none; font-weight: bold; padding: 0.5em 1.5em;"
          onclick="(${function(choice) {
            const makeChoiceFunc = window.__makeChoiceFromRecommendation || (() => {});
            makeChoiceFunc(choice);
          }.toString()})(${JSON.stringify(bestChoice).replace(/"/g, '&quot;')})"
        >Choose This</button>
      </div>
    `;
    
    categoriesContainer.insertBefore(recommendationDiv, countersDiv.nextSibling);
  }
  
  console.log('Available choices by category:', choicesByCategory);
  console.log('Sample choice structure:', choicesByCategory.race[0] || choicesByCategory.other[0]);

  // Check if validate action is available (all counters zero and base choices made)
  const availableChoices = creator.getAvailableChoices();
  const validateAction = availableChoices.find(c => c.id === 'validate_character_sheet');
  const nonValidateChoices = availableChoices.filter(c => c.id !== 'validate_character_sheet');
  
  // Auto-validate if validate is the only choice available
  if (validateAction && nonValidateChoices.length === 0 && !isSheetValidated) {
    console.log('[Auto-validation] Validate is the only choice, applying automatically');
    makeChoice(validateAction);
    return; // updateChoices will be called again after makeChoice
  }
  
  // Update validation flag based on sheet state
  // Once validated, keep it true even if optional choices remain
  if (state && state.rawSheet && state.rawSheet.is_valid_sheet === true) {
    isSheetValidated = true;
  } else if (state && state.rawSheet && state.rawSheet.is_valid_sheet === false) {
    // Only reset if sheet explicitly becomes invalid
    isSheetValidated = false;
  }
  
  // Check if character has reached target level
  const currentLevel = creator.getCurrentLevel();
  const targetLevel = creator.targetLevel || 5;
  const hasReachedTargetLevel = currentLevel >= targetLevel;
  
  // If target level reached and sheet is valid, don't show choices
  if (hasReachedTargetLevel && isSheetValidated) {
    // Hide all categories
    Object.values(categories).forEach(cat => cat.style.display = 'none');
    
    // Remove AI recommendation if present
    const existingRecommendation = categoriesContainer.querySelector('.ai-recommendation');
    if (existingRecommendation) {
      existingRecommendation.remove();
    }
    
    // Show completion message
    const existingCompletionMsg = categoriesContainer.querySelector('.completion-message');
    if (existingCompletionMsg) {
      existingCompletionMsg.remove();
    }
    
    const completionDiv = document.createElement('div');
    completionDiv.className = 'completion-message';
    completionDiv.style.cssText = 'background: linear-gradient(135deg, #2d5a3d 0%, #1a4d2e 100%); padding: 1.5em; border-radius: 8px; margin: 1em 0; border: 2px solid #4ade80; text-align: center;';
    completionDiv.innerHTML = `
      <div style="font-size: 2em; margin-bottom: 0.5em;">🎉</div>
      <strong style="color: #4ade80; font-size: 1.2em; display: block; margin-bottom: 0.5em;">Target Level Reached!</strong>
      <p style="color: #e8f5e9; margin: 0;">You've reached level ${targetLevel}. Your character is complete and ready to save.</p>
    `;
    categoriesContainer.insertBefore(completionDiv, countersDiv.nextSibling);
  } else {
    // Show normal choices
    // Hide all categories first
    Object.values(categories).forEach(cat => cat.style.display = 'none');

    // Show categories with choices and populate buttons
    Object.keys(choicesByCategory).forEach(category => {
      const choices = choicesByCategory[category];
      if (choices.length > 0) {
        categories[category].style.display = 'block';
        choiceContainers[category].innerHTML = '';
        
        choices.forEach(choice => {
          const button = document.createElement('button');
          button.className = 'btn btn--choice';
          // Use title if available, otherwise fall back to id
          const label = choice.title || choice.id;
          button.textContent = label;
          button.onclick = () => makeChoice(choice);
          choiceContainers[category].appendChild(button);
        });
      }
    });
  }
  
  // Update save character button state based on validation flag
  if (saveCharacterBtn) {
    if (!hasReachedTargetLevel) {
      saveCharacterBtn.disabled = true;
      saveCharacterBtn.textContent = `Reach level ${targetLevel} (currently ${currentLevel})`;
      saveCharacterBtn.className = 'btn btn--primary';
    } else if (isSheetValidated) {
      saveCharacterBtn.disabled = false;
      saveCharacterBtn.textContent = 'Save Character';
      saveCharacterBtn.className = 'btn btn--primary';
    } else {
      saveCharacterBtn.disabled = true;
      saveCharacterBtn.textContent = 'Complete all choices first';
      saveCharacterBtn.className = 'btn btn--primary';
    }
  }
}

function makeChoice(decision) {
  if (!creator) return;

  const success = creator.applyChoice(decision);
  window.__makeChoiceFromRecommendation = makeChoice;
  if (success) {
    forgeStatus.textContent = `Applied: ${decision.title || decision.id}`;
    forgeStatus.className = 'forge__status forge__status--success';
    markUnsavedChanges();
    updateChoices();
    scheduleAutosave();
  } else {
    forgeStatus.textContent = `Failed to apply: ${decision.title || decision.id}`;
    forgeStatus.className = 'forge__status forge__status--error';
  }
}

function buildSavableCharacterState() {
  if (!creator) return null;
  const character = creator.getCharacterState();
  if (!character) return null;

  // Bring over any chosen portrait or name (same as finish).
  try {
    const portraitUrl = localStorage.getItem('adaCurrentCharacterPortraitUrl');
    if (portraitUrl) character.portraitUrl = portraitUrl;
  } catch {}

  // Try both name fields: manual and auto forge
  let name = '';
  const manualNameInput = document.getElementById('manualForgeCharacterName');
  if (manualNameInput && manualNameInput.value && manualNameInput.value.trim()) {
    name = manualNameInput.value.trim();
  }
  const autoNameInput = document.getElementById('forgeCharacterName');
  if (!name && autoNameInput && autoNameInput.value && autoNameInput.value.trim()) {
    name = autoNameInput.value.trim();
  }
  if (name) {
    character.name = name;
  }
  return character;
}

function scheduleAutosave() {
  // Only autosave updates after the first explicit save has created the character.
  // This avoids consuming a roster slot for half-built drafts.
  if (!savedCharacterId) return;
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const character = buildSavableCharacterState();
    if (!character) return;
    try {
      const saved = await saveCharacter(character, currentUser);
      if (saved) {
        needsSave = false;
        // Keep feedback subtle (don't spam status on every click).
        if (forgeStatus && forgeStatus.className.includes('error') === false) {
          forgeStatus.textContent = 'Saved.';
          forgeStatus.className = 'forge__status forge__status--success';
        }
      }
    } catch {}
  }, 900);
}

function markUnsavedChanges() {
  needsSave = true;
  const hint = document.getElementById('finishHint');
  if (hint) {
    hint.textContent = 'Character preview is ready. Click "Finish character creation" to save to My Characters.';
  }
}

function getBackendBaseUrl() {
  const cfg = window.ADA && window.ADA.config;
  const url = (cfg && cfg.BACKEND_BASE_URL) || '';
  if (url) return url;
  // Using the ev713 backend
  return 'https://backend.ev713-backend.workers.dev';
}

async function saveCharacter(character, username) {
  console.log('[saveCharacter] Character data:', character);
  if (character && character.name) {
    console.log('[Forge Debug] Name being sent to backend:', character.name);
  } else {
    console.log('[Forge Debug] No name found in character object being sent to backend.');
  }
  if (isSaving) {
    console.log('[saveCharacter] Already saving, returning');
    return false;
  }
  isSaving = true;
  finishBtn.disabled = true;
  finishBtn.textContent = 'Saving...';
  finishBtn.dataset.mode = 'saving';

  try {
    const backendUrl = getBackendBaseUrl();
    const endpoint = `${backendUrl}/api/characters/save-sheet`;
    console.log('[saveCharacter] Sending to:', endpoint);
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, character, characterId: savedCharacterId })
    });
    
    console.log('[saveCharacter] Response status:', res.status);
    const data = await res.json().catch(() => ({}));
    console.log('[saveCharacter] Response data:', data);

    // If this route doesn't exist on the backend (404), surface a clear message and do not fallback.
    if (res.status === 404) {
      forgeStatus.textContent = 'Saving full sheet is not available on the current backend. Please run the local backend (wrangler dev) or deploy the latest backend to enable interactive sheet saves.';
      forgeStatus.className = 'forge__status forge__status--error';
      return false;
    }

    if (!res.ok || !data || data.ok !== true) {
      const msg = (data && (data.error || data.message)) || 'Could not save character. Please try again.';
      forgeStatus.textContent = msg;
      forgeStatus.className = 'forge__status forge__status--error';
      return false;
    }

    if (data.character && data.character.id) {
      savedCharacterId = data.character.id;
    }

    console.log('[saveCharacter] Save successful, character ID:', savedCharacterId);
    return data.character || false;
  } catch (err) {
    console.error('[saveCharacter] Failed to save character sheet', err);
    forgeStatus.textContent = 'Network error while saving. Please try again.';
    forgeStatus.className = 'forge__status forge__status--error';
    return false;
  } finally {
    isSaving = false;
    finishBtn.textContent = 'Finish Character Creation';
  }
}

async function finishCharacterCreation() {
  console.log('[finishCharacterCreation] Starting');
  if (!creator) {
    console.log('[finishCharacterCreation] No creator found');
    return;
  }
  const character = creator.getCharacterState();
  console.log('[finishCharacterCreation] Character state:', character);
  if (!character) {
    console.log('[finishCharacterCreation] No character state');
    return;
  }

  // Bring over any chosen portrait or name
  try {
    const portraitUrl = localStorage.getItem('adaCurrentCharacterPortraitUrl');
    if (portraitUrl) character.portraitUrl = portraitUrl;
  } catch {
    // ignore portrait read errors
  }
  const nameInput = document.getElementById('forgeCharacterName');
  if (nameInput && nameInput.value && nameInput.value.trim()) {
    character.name = nameInput.value.trim();
  }
  const currentUser = getCurrentUser();
  console.log('[finishCharacterCreation] Current user:', currentUser);

  forgeStatus.textContent = 'Character creation complete!';
  forgeStatus.className = 'forge__status forge__status--success';
  const hint = document.getElementById('finishHint');
  if (hint) {
    hint.textContent = 'Saving your character to My Characters...';
  }

  // Do not re-render the summary here; navigate to Vault on success

  // Persist to backend (or show error)
  if (!currentUser) {
    console.log('[finishCharacterCreation] No current user, cannot save');
    forgeStatus.textContent = 'Log in to save this character to My Characters.';
    forgeStatus.className = 'forge__status forge__status--error';
    markUnsavedChanges();
    finishBtn.disabled = false;
    finishBtn.dataset.mode = 'finish';
    return;
  }

  console.log('[finishCharacterCreation] Calling saveCharacter');
  const saved = await saveCharacter(character, currentUser);
  console.log('[finishCharacterCreation] Save result:', saved);
  if (saved) {
    needsSave = false;
    if (hint) {
      hint.textContent = 'Saved to My Characters. You can adjust choices and click "Finish character creation" again to update the sheet.';
    }
    forgeStatus.textContent = 'Character saved to My Characters.';
    forgeStatus.className = 'forge__status forge__status--success';

    // Navigate to vault and set active character
    try {
      if (window.ADA && typeof window.ADA.setActiveCharacter === 'function') {
        window.ADA.setActiveCharacter(saved);
      }
      if (window.ADA && typeof window.ADA.showView === 'function') {
        window.ADA.showView('vault');
      } else if (window.ADA && typeof window.ADA.navigateTo === 'function') {
        window.ADA.navigateTo('vault');
      } else if (typeof window !== 'undefined') {
        window.location.href = 'vault.html';
      }
    } catch {}
  } else {
    markUnsavedChanges();
  }

  finishBtn.disabled = false;
  finishBtn.dataset.mode = 'finish';
}

function restartForge() {
  creator = null;
  startBtn.style.display = 'inline-block';
  restartBtn.style.display = 'none';
  interactivePanel.style.display = 'none';
  forgedCharacterDiv.hidden = true;
  finishBtn.disabled = true;
  forgeStatus.textContent = '';
  progressDiv.innerHTML = '';
  
  // Clear all choice buttons
  Object.values(choiceContainers).forEach(container => {
    container.innerHTML = '';
  });
}
