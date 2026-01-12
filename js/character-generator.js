/**
 * Client-side character generator using the decision tree
 */

let decisionTree = null;
let initialSheet = null;

/**
 * Load the decision tree and initial sheet JSON files
 */
export async function loadDecisionTree() {
  // If already loaded, ensure `decisionTree` is an array (not legacy object)
  if (decisionTree && initialSheet) {
    if (!Array.isArray(decisionTree)) {
      decisionTree = decisionTree.decisions || [];
    }
    return;
  }
  
  try {
    // Cache-bust and force network fetch so we don't serve stale trees from CDN/browser
    const cacheBust = `v=${Date.now()}`;
    const [treeResponse, sheetResponse] = await Promise.all([
      fetch(`./character_decision_tree.json?${cacheBust}`, { cache: 'no-store' }),
      fetch(`./character_sheet_initial.json?${cacheBust}`, { cache: 'no-store' })
    ]);
    
    const treeData = await treeResponse.json();
    const sheetData = await sheetResponse.json();
    // The decision tree file is an object with a `decisions` array
    decisionTree = Array.isArray(treeData) ? treeData : (treeData.decisions || []);
    initialSheet = sheetData;
  } catch (error) {
    console.error('Failed to load decision tree:', error);
    throw new Error('Could not load character creation data');
  }
}

/**
 * Generate a character by maximizing similarity to user prompt using Dijkstra's algorithm
 * 
 * @param {Object} options - {characterClass, level, race, decisionMatches}
 * @param {Array} options.decisionMatches - Array of {decisionId, similarity} from backend
 * @returns {Promise<Object>} Formatted character object
 */
export async function generateCharacterWithSimilarity({ characterClass, level, race, decisionMatches = [] }) {
  await loadDecisionTree();
  
  console.group('[generateCharacterWithSimilarity] Starting semantic character generation');
  console.log('[generateCharacterWithSimilarity] Class:', characterClass, 'Level:', level, 'Race:', race);
  console.log('[generateCharacterWithSimilarity] Decision matches received:', decisionMatches.length);
  
  if (decisionMatches.length > 0) {
    console.log('[generateCharacterWithSimilarity] Top 10 matched decisions:', 
      decisionMatches.slice(0, 10).map(m => ({
        id: m.decisionId,
        similarity: m.similarity.toFixed(3)
      }))
    );
  }
  console.groupEnd();
  
  // Build a map of decision ID -> similarity score
  const similarityMap = {};
  if (decisionMatches && Array.isArray(decisionMatches)) {
    for (const match of decisionMatches) {
      similarityMap[match.decisionId] = match.similarity;
    }
  }
  
  // Use Dijkstra to find optimal path through decision tree
  const path = dijkstraOptimalPath({
    decisionTree,
    initialSheet,
    characterClass,
    level,
    race,
    similarityMap,
  });
  
  // Apply the optimal path to generate character
  const sheet = JSON.parse(JSON.stringify(initialSheet));
  const actions = [];
  
  console.group('[generateCharacterWithSimilarity] Applying optimal path');
  console.log('[generateCharacterWithSimilarity] Path to apply:', path.length, 'decisions');
  
  for (const decisionId of path) {
    const decision = decisionTree.find(d => d.id === decisionId);
    if (decision && canTakeAction(sheet, decision)) {
      applyAction(sheet, decision);
      actions.push(decision);
    }
  }
  console.log('[generateCharacterWithSimilarity] Applied', actions.length, 'decisions from optimal path');
  console.groupEnd();
  
  // Fill remaining required decisions (race/class if not in path)
  const hasRace = sheet.race && sheet.race !== '';
  if (!hasRace) {
    console.log('[generateCharacterWithSimilarity] No race found in path, adding race choice');
    const races = ['choose_race_Human', 'choose_race_Elf', 'choose_race_Dwarf', 'choose_race_Halfling'];
    const raceId = race ? {
      human: 'choose_race_Human',
      elf: 'choose_race_Elf',
      dwarf: 'choose_race_Dwarf',
      halfling: 'choose_race_Halfling'
    }[String(race).toLowerCase()] : races[Math.floor(Math.random() * races.length)];
    
    const raceAction = decisionTree.find(d => d.id === raceId && canTakeAction(sheet, d));
    if (raceAction) {
      applyAction(sheet, raceAction);
      actions.push(raceAction);
      console.log('[generateCharacterWithSimilarity] Added race:', raceId);
    }
  }
  
  const hasClass = sheet.class_fighter_level > 0 || sheet.class_cleric_level > 0 || 
                   sheet.class_barbarian_level > 0 || sheet.class_bard_level > 0;
  if (!hasClass) {
    console.log('[generateCharacterWithSimilarity] No class found in path, adding class levels');
    const className = String(characterClass).toLowerCase();
    for (let i = 1; i <= level; i++) {
      const levelId = `choose_class_${className}_level_${i}`;
      const levelAction = decisionTree.find(d => d.id === levelId && canTakeAction(sheet, d));
      if (levelAction) {
        applyAction(sheet, levelAction);
        actions.push(levelAction);
      }
    }
    console.log('[generateCharacterWithSimilarity] Added class levels for', className);
  }
  
  // Fill remaining optional decisions greedily by similarity
  let remainingCount = 0;
  let safetyCounter = 0;
  while (safetyCounter++ < 1000) {
    const availableDecisions = decisionTree.filter(d => canTakeAction(sheet, d));
    if (availableDecisions.length === 0) break;
    
    // Pick the decision with highest similarity (if available), otherwise random
    let choice = null;
    let maxSimilarity = -1;
    for (const decision of availableDecisions) {
      const sim = similarityMap[decision.id] || 0;
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        choice = decision;
      }
    }
    
    if (!choice) {
      choice = availableDecisions[Math.floor(Math.random() * availableDecisions.length)];
    }
    
    applyAction(sheet, choice);
    actions.push(choice);
    remainingCount++;
  }
  console.log('[generateCharacterWithSimilarity] Filled', remainingCount, 'remaining decisions greedily');
  
  console.group('[generateCharacterWithSimilarity] Final Character Stats');
  const character = formatCharacter(sheet, actions);
  console.log('[generateCharacterWithSimilarity] Race:', character.race);
  console.log('[generateCharacterWithSimilarity] Classes:', character.classes);
  console.log('[generateCharacterWithSimilarity] Total actions applied:', actions.length);
  console.log('[generateCharacterWithSimilarity] Total decisions in path + filled:', path.length, '+', remainingCount);
  console.groupEnd();
  
  return character;
}

/**
 * Dijkstra-based algorithm to find the path through decision tree that maximizes similarity
 * 
 * Uses a greedy approach: at each state, pick the next decision that:
 * 1. Maximizes cumulative similarity to the prompt
 * 2. Doesn't block required decisions (race/class)
 */
function dijkstraOptimalPath({ decisionTree, initialSheet, characterClass, level, race, similarityMap }) {
  const path = [];
  const sheet = JSON.parse(JSON.stringify(initialSheet));
  const visited = new Set();
  
  console.group('[dijkstra] Starting optimal path search');
  console.log('[dijkstra] Parameters:', { characterClass, level, race });
  console.log('[dijkstra] Available decisions in tree:', decisionTree.length);
  console.log('[dijkstra] Decisions with similarity scores:', Object.keys(similarityMap).length);
  console.groupEnd();
  
  // Greedy approach: at each step, pick the available decision with highest similarity
  let iterations = 0;
  const maxIterations = 1000;
  
  while (iterations++ < maxIterations) {
    console.group(`[dijkstra] Iteration ${iterations}`);
    
    const availableDecisions = decisionTree.filter(d => 
      !visited.has(d.id) && canTakeAction(sheet, d)
    );
    
    console.log(`[dijkstra] Available decisions: ${availableDecisions.length}`);
    
    if (availableDecisions.length === 0) {
      console.log('[dijkstra] No more available decisions, stopping');
      console.groupEnd();
      break;
    }
    
    // Score each available decision
    const scoredDecisions = availableDecisions.map(decision => {
      const similarity = similarityMap[decision.id] || 0;
      
      // Check if this decision is critical (race/class requirement)
      const isCritical = decision.id.includes('race') || decision.id.includes('class');
      
      // Boost score for critical decisions to ensure they're taken
      const boostedScore = isCritical ? similarity + 10 : similarity;
      
      return { decision, similarity, isCritical, score: boostedScore };
    });
    
    // Log all scored decisions for debugging
    console.log('[dijkstra] Scored decisions:', scoredDecisions.map(s => ({
      id: s.decision.id,
      similarity: s.similarity.toFixed(3),
      isCritical: s.isCritical,
      finalScore: s.score.toFixed(3)
    })));
    
    // Pick the decision with highest score
    const best = scoredDecisions.reduce((prev, curr) => 
      curr.score > prev.score ? curr : prev
    );
    
    console.log('[dijkstra] Selected decision:', {
      id: best.decision.id,
      similarity: best.similarity.toFixed(3),
      isCritical: best.isCritical,
      finalScore: best.score.toFixed(3)
    });
    
    // Apply decision
    if (canTakeAction(sheet, best.decision)) {
      applyAction(sheet, best.decision);
      path.push(best.decision.id);
      visited.add(best.decision.id);
      
      console.log('[dijkstra] ✓ Applied decision');
      console.log('[dijkstra] Current path length:', path.length);
      
      // Show current sheet state (just a few key fields for readability)
      console.log('[dijkstra] Sheet state:', {
        race: sheet.race,
        background: sheet.background,
        class_barbarian_level: sheet.class_barbarian_level,
        class_bard_level: sheet.class_bard_level,
        class_cleric_level: sheet.class_cleric_level,
        class_fighter_level: sheet.class_fighter_level,
        skills_count: Array.isArray(sheet.skills) ? sheet.skills.length : 0,
        equipment_count: Array.isArray(sheet.equipment) ? sheet.equipment.length : 0
      });
    } else {
      // Decision became invalid, skip it
      console.log('[dijkstra] ✗ Decision no longer valid, skipping');
      visited.add(best.decision.id);
    }
    
    console.groupEnd();
  }
  
  console.group('[dijkstra] Path Complete');
  console.log('[dijkstra] Total iterations:', iterations);
  console.log('[dijkstra] Final path length:', path.length);
  console.log('[dijkstra] Final path:', path);
  console.log('[dijkstra] Decisions with highest similarity in path:', 
    path.map(id => ({
      id,
      similarity: (similarityMap[id] || 0).toFixed(3)
    })).sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity)).slice(0, 10)
  );
  console.groupEnd();
  
  return path;
}

/**
 * Generate a random character using the decision tree
 */
export async function generateCharacter({ characterClass, level, race }) {
  await loadDecisionTree();
  
  // Start with initial sheet
  const sheet = JSON.parse(JSON.stringify(initialSheet));
  const actions = [];
  
  // Ability scores are assigned via the decision tree; do not set here.
  
  // Choose race if specified
  if (race && race !== 'any') {
    const raceId = {
      human: 'choose_race_Human',
      elf: 'choose_race_Elf',
      dwarf: 'choose_race_Dwarf',
      halfling: 'choose_race_Halfling'
    }[String(race).toLowerCase()];
    const raceAction = findDecision(sheet, d => 
      d.id === raceId && canTakeAction(sheet, d)
    );
    if (raceAction) {
      applyAction(sheet, raceAction);
      actions.push(raceAction);
    }
  } else {
    // Random race
    const races = ['choose_race_Human', 'choose_race_Elf', 'choose_race_Dwarf', 'choose_race_Halfling'];
    const randomRaceId = races[Math.floor(Math.random() * races.length)];
    const raceAction = findDecision(sheet, d => 
      d.id === randomRaceId && canTakeAction(sheet, d)
    );
    if (raceAction) {
      applyAction(sheet, raceAction);
      actions.push(raceAction);
    }
  }
  
  // Add class levels
  const className = String(characterClass).toLowerCase();
  for (let i = 1; i <= level; i++) {
    const levelId = `choose_class_${className}_level_${i}`;
    const levelAction = findDecision(sheet, d => 
      d.id === levelId && canTakeAction(sheet, d)
    );
    if (levelAction) {
      applyAction(sheet, levelAction);
      actions.push(levelAction);
    }
  }
  
  // Make random choices for remaining decisions (skills, equipment, etc.)
  let safetyCounter = 0;
  while (safetyCounter++ < 1000) {
    const availableDecisions = decisionTree.filter(d => canTakeAction(sheet, d));
    if (availableDecisions.length === 0) break;
    
    const choice = availableDecisions[Math.floor(Math.random() * availableDecisions.length)];
    applyAction(sheet, choice);
    actions.push(choice);
  }
  
  // Convert to readable character format
  return formatCharacter(sheet, actions);
}

function canTakeAction(sheet, decision) {
  const preconditions = decision.preconditions || [];
  if (preconditions.length === 0) return true;

  const readCurrent = (param, expected) => {
    let cur = sheet[param];
    if (cur === undefined || cur === null) {
      if (typeof expected === 'boolean') cur = false;
      else if (typeof expected === 'number') cur = 0;
      else if (typeof expected === 'string') cur = '';
      else if (Array.isArray(expected)) cur = [];
    }
    return cur;
  };

  for (const pre of preconditions) {
    if (Array.isArray(pre)) {
      const [param, op, expected] = pre;
      const cur = readCurrent(param, expected);
      // DEBUG: Log checks for is_valid_sheet
      if (param === 'is_valid_sheet' && decision.id && decision.id.startsWith('choose_class')) {
        console.log(`[${decision.id}] Checking is_valid_sheet: cur=${cur}, expected=${expected}, op=${op}`);
      }
      if (op === '==') {
        if (cur !== expected) return false;
      } else if (op === '!=') {
        if (cur === expected) return false;
      } else if (op === '>=') {
        if (!(cur >= expected)) return false;
      } else if (op === '<=') {
        if (!(cur <= expected)) return false;
      } else if (op === '>') {
        if (!(cur > expected)) return false;
      } else if (op === '<') {
        if (!(cur < expected)) return false;
      } else if (op === 'has') {
        if (!cur || (Array.isArray(cur) ? !cur.includes(expected) : true)) return false;
      } else if (op === 'not has') {
        if (cur && (Array.isArray(cur) ? cur.includes(expected) : false)) return false;
      }
    } else {
      // Legacy object format
      const key = pre.state_key;
      const value = sheet[key];
      if (pre.operator === '==') {
        if (value != pre.value) return false;
      } else if (pre.operator === '!=') {
        if (value == pre.value) return false;
      } else if (pre.operator === '>') {
        if (!(value > pre.value)) return false;
      } else if (pre.operator === '<') {
        if (!(value < pre.value)) return false;
      } else if (pre.operator === '>=') {
        if (!(value >= pre.value)) return false;
      } else if (pre.operator === '<=') {
        if (!(value <= pre.value)) return false;
      }
    }
  }
  return true;
}

function applyAction(sheet, decision) {
  const effects = decision.effects || [];
  for (const eff of effects) {
    if (Array.isArray(eff)) {
      const [param, op, value] = eff;
      if (op === 'set') {
        sheet[param] = value;
      } else if (op === 'add') {
        // Ensure list and add unique items (single or list)
        if (!Array.isArray(sheet[param])) sheet[param] = [];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (!sheet[param].includes(item)) sheet[param].push(item);
          }
        } else {
          if (!sheet[param].includes(value)) sheet[param].push(value);
        }
      } else if (op === 'inc') {
        const cur = sheet[param] ?? 0;
        sheet[param] = cur + (typeof value === 'number' ? value : 1);
      } else if (op === 'dec') {
        const cur = sheet[param] ?? 0;
        sheet[param] = cur - (typeof value === 'number' ? value : 1);
      }
    } else {
      const key = eff.state_key;
      if (eff.operation === 'set') {
        sheet[key] = eff.value;
      } else if (eff.operation === 'add') {
        sheet[key] = (sheet[key] || 0) + eff.value;
      } else if (eff.operation === 'append') {
        if (!sheet[key]) sheet[key] = [];
        if (Array.isArray(sheet[key])) {
          sheet[key].push(eff.value);
        }
      }
    }
  }
}

function findDecision(sheet, predicate) {
  return decisionTree.find(predicate);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function formatCharacter(sheet, actions) {
  // Calculate modifiers
  const calcMod = (score) => Math.floor((score - 10) / 2);
  
  sheet.strength_bonus = calcMod(sheet.strength_score);
  sheet.dexterity_bonus = calcMod(sheet.dexterity_score);
  sheet.constitution_bonus = calcMod(sheet.constitution_score);
  sheet.intelligence_bonus = calcMod(sheet.intelligence_score);
  sheet.wisdom_bonus = calcMod(sheet.wisdom_score);
  sheet.charisma_bonus = calcMod(sheet.charisma_score);
  
  // Determine primary class
  const classes = [];
  if (sheet.class_barbarian_level > 0) classes.push({ name: 'Barbarian', level: sheet.class_barbarian_level });
  if (sheet.class_bard_level > 0) classes.push({ name: 'Bard', level: sheet.class_bard_level });
  if (sheet.class_cleric_level > 0) classes.push({ name: 'Cleric', level: sheet.class_cleric_level });
  if (sheet.class_fighter_level > 0) classes.push({ name: 'Fighter', level: sheet.class_fighter_level });
  
  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2;
  
  // Calculate HP
  let maxHp = 0;
  if (sheet.hit_die_size > 0 && sheet.hit_die_count > 0) {
    // First level: max hit die + CON mod
    maxHp = sheet.hit_die_size + sheet.constitution_bonus;
    // Remaining levels: average + CON mod
    for (let i = 1; i < sheet.hit_die_count; i++) {
      maxHp += Math.floor(sheet.hit_die_size / 2) + 1 + sheet.constitution_bonus;
    }
  }
  
  // Calculate AC (10 + DEX mod, simplified)
  const armorClass = 10 + sheet.dexterity_bonus;
  
  return {
    id: Date.now(),
    username: '',
    name: '',
    portraitUrl: null,
    race: sheet.race || 'Unknown',
    background: sheet.background || 'Unknown',
    classes: classes,
    level: totalLevel,
    abilityScores: {
      strength: sheet.strength_score,
      dexterity: sheet.dexterity_score,
      constitution: sheet.constitution_score,
      intelligence: sheet.intelligence_score,
      wisdom: sheet.wisdom_score,
      charisma: sheet.charisma_score
    },
    proficiencyBonus: proficiencyBonus,
    armorClass: armorClass,
    maxHp: maxHp,
    currentHp: maxHp,
    // Extract additional fields from raw sheet for backend compatibility
    skills: Array.isArray(sheet.skills) ? sheet.skills : [],
    features: Array.isArray(sheet.features) ? sheet.features : [],
    equipment: Array.isArray(sheet.equipment) ? sheet.equipment : [],
    feats: Array.isArray(sheet.feats) ? sheet.feats : [],
    savingThrows: Array.isArray(sheet.saving_throws_proficient) ? sheet.saving_throws_proficient : [],
    narrativeText: '', // Will be set by speech.js if available
    rawSheet: sheet,
    actions: actions.map(a => a.id)
  };
}

/**
 * Interactive character creation session - step by step with user choices
 */
export class InteractiveCharacterCreator {
  constructor() {
    this.sheet = null;
    this.actions = [];
  }

  async initialize() {
    await loadDecisionTree();
    this.sheet = JSON.parse(JSON.stringify(initialSheet));
    this.actions = [];
  }

  getAvailableChoices() {
    if (!this.sheet || !decisionTree) return [];
    const tree = Array.isArray(decisionTree) ? decisionTree : (decisionTree.decisions || []);
    return tree.filter(d => canTakeAction(this.sheet, d));
  }

  applyChoice(decision) {
    if (!this.sheet || !decision) return false;
    if (!canTakeAction(this.sheet, decision)) return false;
    
    applyAction(this.sheet, decision);
    this.actions.push(decision);
    return true;
  }

  isComplete() {
    const availableChoices = this.getAvailableChoices();
    const hasRace = this.sheet && this.sheet.race && this.sheet.race !== '';
    const hasClass = this.sheet && (
      this.sheet.class_fighter_level > 0 ||
      this.sheet.class_cleric_level > 0 ||
      this.sheet.class_barbarian_level > 0 ||
      this.sheet.class_bard_level > 0
    );
    
    return hasRace && hasClass && availableChoices.length === 0;
  }

  getCharacterState() {
    if (!this.sheet) return null;
    return formatCharacter(this.sheet, this.actions);
  }

  getChoicesByCategory() {
    const choices = this.getAvailableChoices();
    const categories = {
      race: [],
      class: [],
      background: [],
      skills: [],
      equipment: [],
      other: []
    };

    choices.forEach(choice => {
      const id = choice.id || '';
      const action = id.toLowerCase();
      console.log('Categorizing:', id, 'lowercase:', action);
      
      // Check for race choices: includes 'race' OR is one of the specific race IDs
      const isRace = action.includes('race') || 
                     id === 'choose_Human' || 
                     id === 'choose_Elf' || 
                     id === 'choose_Dwarf' || 
                     id === 'choose_Halfling';
      
      if (isRace) {
        console.log('  -> race');
        categories.race.push(choice);
      } else if (action.includes('levelup') || action.includes('class')) {
        console.log('  -> class');
        categories.class.push(choice);
      } else if (action.includes('background')) {
        console.log('  -> background');
        categories.background.push(choice);
      } else if (action.includes('skill')) {
        console.log('  -> skills');
        categories.skills.push(choice);
      } else if (action.includes('equipment') || action.includes('weapon') || action.includes('armor')) {
        console.log('  -> equipment');
        categories.equipment.push(choice);
      } else {
        console.log('  -> other');
        categories.other.push(choice);
      }
    });

    return categories;
  }
}

// Provide a default export for environments that only read default
export default {
  loadDecisionTree,
  generateCharacter,
  generateCharacterWithSimilarity,
  InteractiveCharacterCreator
};
