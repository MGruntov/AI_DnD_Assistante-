// Shared renderer for character sheets across Forge + Vault.
//
// Goal: keep the presentation consistent regardless of whether the character
// originates from the AI forge (backend-native shape) or the interactive
// decision-tree forge (rawSheet-driven shape).

function safeNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatList(arr, empty = "—") {
  return Array.isArray(arr) && arr.length ? arr.join(", ") : empty;
}

function modFor(score) {
  const n = safeNum(score, 10);
  return Math.floor((n - 10) / 2);
}

function normalizeBackendCharacter(ch) {
  const name = ch?.name || "";
  const race = ch?.concept?.race || "Unknown";
  const background = ch?.concept?.background || "Unknown";
  const classes = Array.isArray(ch?.concept?.classes) ? ch.concept.classes : [];
  const classText = classes.length
    ? classes.map((c) => `${c.name} ${c.level}`).join(", ")
    : ch?.concept?.classSummary || "Adventurer";

  const abilities = ch?.mechanics?.abilityScores || {};
  const abilityScores = {
    strength: safeNum(abilities.str, 10),
    dexterity: safeNum(abilities.dex, 10),
    constitution: safeNum(abilities.con, 10),
    intelligence: safeNum(abilities.int, 10),
    wisdom: safeNum(abilities.wis, 10),
    charisma: safeNum(abilities.cha, 10),
  };

  const hp = safeNum(ch?.mechanics?.hitPoints, null);
  const ac = safeNum(ch?.mechanics?.armorClass, null);
  const speed = safeNum(ch?.mechanics?.speed, null);
  const prof = safeNum(ch?.mechanics?.proficiencyBonus, null);

  const features = Array.isArray(ch?.mechanics?.classFeatures)
    ? ch.mechanics.classFeatures
    : [];
  const feats = Array.isArray(ch?.mechanics?.feats) ? ch.mechanics.feats : [];
  const equipment = Array.isArray(ch?.mechanics?.equipment)
    ? ch.mechanics.equipment
    : [];

  const skills = Array.isArray(ch?.mechanics?.skills) ? ch.mechanics.skills : [];
  const saves = Array.isArray(ch?.mechanics?.savingThrows)
    ? ch.mechanics.savingThrows
    : [];

  const spells = ch?.mechanics?.spells || {};
  const cantrips = Array.isArray(spells.cantrips) ? spells.cantrips : [];
  const leveledSpells = Array.isArray(spells.leveledSpells)
    ? spells.leveledSpells
    : [];

  return {
    mode: "backend",
    name,
    race,
    background,
    classText,
    level: safeNum(ch?.progression?.level, null) ?? safeNum(classes?.[0]?.level, null),
    hp,
    ac,
    speed,
    prof,
    abilityScores,
    features,
    feats,
    skills,
    saves,
    equipment,
    languages: Array.isArray(ch?.rawSheet?.languages) ? ch.rawSheet.languages : [],
    proficiencies: Array.isArray(ch?.rawSheet?.proficiencies) ? ch.rawSheet.proficiencies : [],
    cantrips,
    spells: leveledSpells,
    rawSheet: ch?.rawSheet || null,
  };
}

function normalizeInteractiveState(state) {
  const name = state?.name || "";
  const race = state?.race || "Unknown";
  const background = state?.background || "Unknown";
  const classes = Array.isArray(state?.classes) ? state.classes : [];
  const classText = classes.length
    ? classes.map((c) => `${c.name} ${c.level}`).join(", ")
    : "Adventurer";

  const a = state?.abilityScores || {};
  const abilityScores = {
    strength: safeNum(a.strength ?? a.str, 10),
    dexterity: safeNum(a.dexterity ?? a.dex, 10),
    constitution: safeNum(a.constitution ?? a.con, 10),
    intelligence: safeNum(a.intelligence ?? a.int, 10),
    wisdom: safeNum(a.wisdom ?? a.wis, 10),
    charisma: safeNum(a.charisma ?? a.cha, 10),
  };

  const rawSheet = state?.rawSheet || null;

  // Spells in interactive rawSheet are often encoded like "bard:Sleep:1".
  const rawSpells = Array.isArray(rawSheet?.spells_known) ? rawSheet.spells_known : [];
  const spells = rawSpells.map((s) => {
    const parts = String(s).split(":");
    return parts.length >= 2 ? parts[1] : String(s);
  });

  return {
    mode: "interactive",
    name,
    race,
    background,
    classText,
    level: safeNum(state?.level, null),
    hp: safeNum(state?.maxHp ?? state?.currentHp, null),
    ac: safeNum(state?.armorClass, null),
    speed: safeNum(rawSheet?.speed, null),
    prof: safeNum(state?.proficiencyBonus, null),
    abilityScores,
    features: Array.isArray(rawSheet?.feature_entries) ? rawSheet.feature_entries : [],
    feats: [],
    skills: Array.isArray(rawSheet?.skills) ? rawSheet.skills : [],
    saves: Array.isArray(rawSheet?.saving_throws_proficient)
      ? rawSheet.saving_throws_proficient
      : [],
    equipment: Array.isArray(rawSheet?.equipment) ? rawSheet.equipment : [],
    languages: Array.isArray(rawSheet?.languages) ? rawSheet.languages : [],
    proficiencies: Array.isArray(rawSheet?.proficiencies) ? rawSheet.proficiencies : [],
    cantrips: Array.isArray(rawSheet?.cantrips_known) ? rawSheet.cantrips_known : [],
    spells,
    rawSheet,
  };
}

function normalizeAnyCharacter(input) {
  if (!input || typeof input !== "object") return null;
  // Backend character objects have concept/mechanics.
  if (input.concept || input.mechanics) return normalizeBackendCharacter(input);
  // Interactive state has rawSheet and/or abilityScores + race/background.
  return normalizeInteractiveState(input);
}

export function renderCharacterSheetHTML(input, opts = {}) {
  const vm = normalizeAnyCharacter(input);
  if (!vm) return "";

  const compact = !!opts.compact;
  const a = vm.abilityScores;

  const abilityLine = `
    <div>
      <p><strong>Ability Scores:</strong><br>
        STR ${a.strength} (${a.strength >= 10 ? "+" : ""}${modFor(a.strength)}),
        DEX ${a.dexterity} (${a.dexterity >= 10 ? "+" : ""}${modFor(a.dexterity)}),
        CON ${a.constitution} (${a.constitution >= 10 ? "+" : ""}${modFor(a.constitution)}),<br>
        INT ${a.intelligence} (${a.intelligence >= 10 ? "+" : ""}${modFor(a.intelligence)}),
        WIS ${a.wisdom} (${a.wisdom >= 10 ? "+" : ""}${modFor(a.wisdom)}),
        CHA ${a.charisma} (${a.charisma >= 10 ? "+" : ""}${modFor(a.charisma)})
      </p>
    </div>
  `;

  const header = `
    <div>
      <p><strong>Race:</strong> ${vm.race}</p>
      <p><strong>Class:</strong> ${vm.classText}</p>
      <p><strong>Background:</strong> ${vm.background}</p>
      <p><strong>Level:</strong> ${vm.level ?? "—"}${vm.hp != null ? ` | <strong>HP:</strong> ${vm.hp}` : ""}${vm.ac != null ? ` | <strong>AC:</strong> ${vm.ac}` : ""}</p>
    </div>
  `;

  // Optional “sheet extras” (we keep them visible because this is what the Forge shows today).
  const extras = [];
  if (!compact) {
    if (vm.features && vm.features.length) {
      extras.push(`<div><p><strong>Features:</strong> ${formatList(vm.features)}</p></div>`);
    }
    if (vm.proficiencies && vm.proficiencies.length) {
      extras.push(`<div><p><strong>Proficiencies:</strong> ${formatList(vm.proficiencies)}</p></div>`);
    }
    if (vm.languages && vm.languages.length) {
      extras.push(`<div><p><strong>Languages:</strong> ${formatList(vm.languages)}</p></div>`);
    }
    if (vm.equipment && vm.equipment.length) {
      extras.push(`<div><p><strong>Equipment:</strong> ${formatList(vm.equipment)}</p></div>`);
    }
    if (vm.cantrips && vm.cantrips.length) {
      extras.push(`<div><p><strong>Cantrips:</strong> ${formatList(vm.cantrips)}</p></div>`);
    }
    if (vm.spells && vm.spells.length) {
      extras.push(`<div><p><strong>Spells:</strong> ${formatList(vm.spells)}</p></div>`);
    }

    // Class-resource highlights (when coming from interactive rawSheet)
    const sheet = vm.rawSheet;
    if (sheet && typeof sheet === "object") {
      if (safeNum(sheet.rages_per_long_rest, 0) > 0) {
        extras.push(
          `<div><p><strong>Barbarian:</strong> ${sheet.rages_per_long_rest} rages/long rest${safeNum(sheet.rage_damage_bonus, 0) ? `, +${sheet.rage_damage_bonus} rage damage` : ""}</p></div>`
        );
      }
      if (safeNum(sheet.bardic_inspiration_die, 0) > 0) {
        extras.push(
          `<div><p><strong>Bard:</strong> d${sheet.bardic_inspiration_die} Bardic Inspiration${safeNum(sheet.song_of_rest_die, 0) ? `, d${sheet.song_of_rest_die} Song of Rest` : ""}</p></div>`
        );
      }
      if (safeNum(sheet.channel_divinity_uses, 0) > 0) {
        extras.push(
          `<div><p><strong>Cleric:</strong> ${sheet.channel_divinity_uses} Channel Divinity uses</p></div>`
        );
      }
      if (safeNum(sheet.action_surge_uses, 0) > 0) {
        extras.push(
          `<div><p><strong>Fighter:</strong> ${sheet.action_surge_uses} Action Surge${safeNum(sheet.extra_attacks, 1) > 1 ? `, ${sheet.extra_attacks} attacks` : ""}</p></div>`
        );
      }
    }
  }

  // Use the same “gridish” style Forge uses today.
  return `
    <div style="display:grid;gap:1em;">
      ${header}
      ${abilityLine}
      ${extras.join("\n")}
    </div>
  `;
}
