/**
 * Client-side character generator using the decision tree
 */

let decisionTree = null;
let initialSheet = null;

/**
 * Load the decision tree and initial sheet JSON files
 */
export async function loadDecisionTree() {
  if (decisionTree && initialSheet) return;
  
  try {
    const [treeResponse, sheetResponse] = await Promise.all([
      fetch('./character_decision_tree.json'),
      fetch('./character_sheet_initial.json')
    ]);
    
    decisionTree = await treeResponse.json();
    initialSheet = await sheetResponse.json();
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
  
  // Assign ability scores (standard array)
  const standardArray = [15, 14, 13, 12, 10, 8];
  shuffleArray(standardArray);
  sheet.strength_score = standardArray[0];
  sheet.dexterity_score = standardArray[1];
  sheet.constitution_score = standardArray[2];
  sheet.intelligence_score = standardArray[3];
  sheet.wisdom_score = standardArray[4];
  sheet.charisma_score = standardArray[5];
  
  // Choose race if specified
  if (race && race !== 'any') {
    const raceAction = findDecision(sheet, d => 
      d.action.startsWith(`choose_race_${race}`) && canTakeAction(sheet, d)
    );
    if (raceAction) {
      applyAction(sheet, raceAction);
      actions.push(raceAction);
    }
  } else {
    // Random race
    const races = ['human', 'elf', 'dwarf', 'halfling'];
    const randomRace = races[Math.floor(Math.random() * races.length)];
    const raceAction = findDecision(sheet, d => 
      d.action.startsWith(`choose_race_${randomRace}`) && canTakeAction(sheet, d)
    );
    if (raceAction) {
      applyAction(sheet, raceAction);
      actions.push(raceAction);
    }
  }
  
  // Add class levels
  const classKey = `class_${characterClass}_level`;
  for (let i = 0; i < level; i++) {
    const levelAction = findDecision(sheet, d => 
      d.action === `levelup_${characterClass}` && canTakeAction(sheet, d)
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
  if (!decision.preconditions || decision.preconditions.length === 0) {
    return true;
  }
  
  for (const pre of decision.preconditions) {
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
  
  return true;
}

function applyAction(sheet, decision) {
  if (!decision.effects) return;
  
  for (const eff of decision.effects) {
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
    actions: actions.map(a => a.action)
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
    return decisionTree.filter(d => canTakeAction(this.sheet, d));
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
      const action = choice.action.toLowerCase();
      if (action.includes('race')) {
        categories.race.push(choice);
      } else if (action.includes('levelup') || action.includes('class')) {
        categories.class.push(choice);
      } else if (action.includes('background')) {
        categories.background.push(choice);
      } else if (action.includes('skill')) {
        categories.skills.push(choice);
      } else if (action.includes('equipment') || action.includes('weapon') || action.includes('armor')) {
        categories.equipment.push(choice);
      } else {
        categories.other.push(choice);
      }
    });

    return categories;
  }
}
