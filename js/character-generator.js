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
  InteractiveCharacterCreator
};
