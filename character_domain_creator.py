import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional


class DomainManager:
    def __init__(self, file_path = 'dnd_domain.json'):
        self.file_path = file_path
        file = json.load(open(self.file_path, 'r'))
        self.vars = file['vars']
        self.actions = file['actions']

    def save(self):
        with open(self.file_path, 'w') as f:
            json.dump({'vars': self.vars, 'actions': self.actions}, f)

    def add_var(self, var, default_value):
        self.vars[var] = default_value

    def add_action(self, action):
        self.actions.append(action.to_dict)

class Action:
    def __init__(self, id, effects=None, preconditions=None, title: Optional[str] = None, description: Optional[str] = None):
        self.id = id
        if not effects:
            effects = []
        if not preconditions:
            preconditions = []
        default_title = title if title is not None else self._default_title(id)
        self.compiled_actions = [{
            'id': id,
            'effects': effects,
            'preconditions': preconditions,
            'title': default_title,
            'description': description if description is not None else default_title
        }]

    def __str__(self):
        return str(self.compiled_actions)

    def aggregate_compiled_actions(self, actions):
        comp = []
        for a in actions:
            comp += a.compiled_actions
        self.compiled_actions = comp

    def add_effect(self, eff):
        for a in self.compiled_actions:
            if eff not in a['effects']:
                a['effects'].append(eff)

    def add_precondition(self, prec):
        for a in self.compiled_actions:
            if prec not in a['preconditions']:
                a['preconditions'].append(prec)

    def add_effect_series(self, effects):
        for a, eff in zip(self.compiled_actions, effects):
            if eff not in a['effects']:
                a['effects'].append(eff)

    def add_precondition_series(self, preconditions):
        for a, pre in zip(self.compiled_actions, preconditions):
            if pre not in a['preconditions']:
                a['preconditions'].append(pre)

    def add_effect_to_last(self, effect):
        a = self.compiled_actions[-1]
        if effect not in a['effects']:
            a['effects'].append(effect)

    def add_effect_to_first(self, effect):
        a = self.compiled_actions[0]
        if effect not in a['effects']:
            a['effects'].append(effect)

    def make_unique(self):
        self.add_precondition((self.complete_flag, '==', False))
        self.add_effect((self.complete_flag, 'set', True))

    def set_complete_flag(self, ):
        self.add_effect((self.complete_flag, '==', True))

    def _default_title(self, raw_id: str) -> str:
        # Simple human-friendly title from id
        return raw_id.replace('_', ' ').strip().title()

    @property
    def complete_flag(self):
        return f"{self.id}_complete"

    def __eq__(self, other):
        return self.id == other.id

class MutEx(Action):
    def __init__(self, id, actions):
        super().__init__(id)
        self.actions = actions

        for a in self.actions:
            a.add_precondition((self.complete_flag, '==', False))
            a.add_effect((self.complete_flag, 'set', True))
        self.aggregate_compiled_actions(self.actions)


class Sequence(Action):
    def __init__(self, id, actions):
        super().__init__(id)
        self.actions = actions

        for a in self.actions:
            a.make_unique()

        for i in range(1, len(self.actions)):
            self.actions[i].add_precondition((self.actions[i-1].complete_flag, '==', True))
        self.aggregate_compiled_actions(self.actions)


class Multi(Action):
    def __init__(self, id, actions, k, mutex=True):
        super().__init__(id)
        self.actions = actions
        choice_complete_at_some_step_flag = []
        if mutex:
            choice_complete_at_some_step_flag = [f'{id}_{action.id}_complete' for action in self.actions]

        k_subchoices = []
        for i in range(k):
            sub_choice = MutEx(f"{id}_step_{i+1}", actions)
            if mutex:
                sub_choice.add_effect_series([(flag, 'set', True) for flag in choice_complete_at_some_step_flag])
                sub_choice.add_precondition_series([(flag, '==', False) for flag in choice_complete_at_some_step_flag])
            k_subchoices.append(sub_choice)
        self.seq = Sequence(id, k_subchoices)
        self.compiled_actions = self.seq.compiled_actions


class AbilityScoresChoice(Action):
    """Create a sequence of 6 ordered picks to assign ability scores.

    - id: base id for the choice group
    - scores: list/tuple of 6 integers (the values to assign in order)
    - abilities: optional list of ability names (defaults to standard six)

    Behavior:
    - builds 6 sequential MutEx steps (one per score)
    - each step offers an action for each ability that sets that ability's score
      to the step's value, and marks that ability as chosen (preventing reuse)
    - actions for an ability include a precondition requiring the ability-not-chosen flag == False
    """
    def __init__(self, id: str, scores, abilities=None):
        super().__init__(id)
        if abilities is None:
            abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
        if len(scores) != 6:
            raise ValueError('scores must be a sequence of 6 integers')

        # global flags preventing an ability being picked more than once
        ability_flags = {ab: f"{id}_ability_{ab}_chosen" for ab in abilities}
        # ensure flags start False via adding effects on the root action (no-op here)

        steps = []
        for i, score in enumerate(scores):
            # For this step, create one Action per ability that sets the ability score
            pick_actions = []
            for ab in abilities:
                act_id = f"{id}_pick_{i}_set_{ab}"
                effs = [(f"{ab}_score", 'set', int(score)), (ability_flags[ab], 'set', True)]
                act = Action(act_id, effects=effs)
                # cannot pick this ability if it's already chosen
                act.add_precondition((ability_flags[ab], '==', False))
                pick_actions.append(act)

            # Make this pick a MutEx so exactly one ability is chosen at this step
            step = MutEx(f"{id}_step_{i}", pick_actions)
            steps.append(step)

        # Sequence the steps so they must be chosen in order
        seq = Sequence(id, steps)
        self.compiled_actions = seq.compiled_actions


class ClassLevel1(Action):
    """Generic helper to create a level-1 class choice action.

    Parameters (common):
    - class_name: short name (e.g., 'barbarian')
    - features: list of feature names to add to feature_entries
    - hit_die: integer (e.g., 12 for d12)
    - armor_proficiencies: list of armor prof strings to add to proficiencies
    - weapon_proficiencies: list of weapon prof strings to add to proficiencies
    - saving_throws: list of saving throw profs
    - skill_choices: integer number of skills to choose
    - equipment: list of equipment to add
    - additional_effects: list of raw effects to append
    """
    def __init__(self, class_name: str, *, features=None, hit_die=8,
                 armor_proficiencies=None, weapon_proficiencies=None,
                 saving_throws=None, skill_choices=0, equipment=None,
                 additional_effects=None):
        super().__init__(f'choose_class_{class_name}_level_1')
        if features is None:
            features = []
        if armor_proficiencies is None:
            armor_proficiencies = []
        if weapon_proficiencies is None:
            weapon_proficiencies = []
        if saving_throws is None:
            saving_throws = []
        if equipment is None:
            equipment = []
        if additional_effects is None:
            additional_effects = []

        # Preconditions: don't allow choosing the level if it's already set
        class_field = f'class_{class_name}_level'
        self.add_precondition((class_field, '==', 0))
        # Require a validated base sheet (race/background/abilities chosen)
        self.add_precondition(('is_valid_sheet', '==', True))
        
        # Require ability scores to be set before taking level 1
        for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
            self.add_precondition((f'{ability}_score', '>', 0))

        # Effects
        # set class level and increment hit die counter
        self.add_effect((class_field, 'set', 1))
        self.add_effect(('hit_die_count', 'inc', 1))

        # add features
        for feat in features:
            self.add_effect(('feature_entries', 'add', feat))
            flag = feat.lower().replace(' ', '_').replace('-', '_')
            self.add_effect((flag, 'set', True))

        # hit die size and HP at 1st level can be set as fields for later calc
        self.add_effect(('hit_die_size', 'set', int(hit_die)))

        # proficiencies
        if armor_proficiencies:
            self.add_effect(('proficiencies', 'add', armor_proficiencies))
        if weapon_proficiencies:
            # weapon_proficiencies may include choice tokens like 'SimpleWeaponChoice'
            self.add_effect(('proficiencies', 'add', weapon_proficiencies))

        if saving_throws:
            self.add_effect(('proficiencies', 'add', saving_throws))

        # skills: set counter if choices are required
        if skill_choices and int(skill_choices) > 0:
            self.add_effect(('skills_to_choose', 'set', int(skill_choices)))

        # equipment
        if equipment:
            self.add_effect(('equipment', 'add', equipment))

        # Additional raw effects
        for e in additional_effects:
            self.add_effect(e)

        # If any of the counters are non-zero, mark sheet invalid until resolved
        # (we add explicit set effects so the engine will have the keys)
        # Note: weapon choice tokens should be included in weapon_proficiencies
        # and will be translated elsewhere; here we only flip validity if choices exist
        if skill_choices or any('Choice' in wp for wp in weapon_proficiencies):
            self.add_effect(('is_valid_sheet', 'set', False))


class ClassLevelUp(Action):
    """Generic helper to level up a class beyond level 1.

    Parameters:
    - class_name: short name (e.g., 'fighter')
    - level: target level number (e.g., 2, 3, etc.)
    - features: list of feature names gained at this level
    - additional_effects: list of raw effects to append
    """
    def __init__(self, class_name: str, level: int, *, features=None, additional_effects=None):
        super().__init__(f'choose_class_{class_name}_level_{level}')
        if features is None:
            features = []
        if additional_effects is None:
            additional_effects = []

        # Precondition: previous level must be taken
        class_field = f'class_{class_name}_level'
        self.add_precondition((class_field, '==', level - 1))
        
        # Precondition: sheet must be valid before leveling up
        self.add_precondition(('is_valid_sheet', '==', True))

        # Effects: increment class level and hit die count
        self.add_effect((class_field, 'set', level))
        self.add_effect(('hit_die_count', 'inc', 1))

        # Add features
        for feat in features:
            self.add_effect(('feature_entries', 'add', feat))
            flag = feat.lower().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '')
            self.add_effect((flag, 'set', True))

        # Additional raw effects
        for e in additional_effects:
            self.add_effect(e)


# Create a Barbarian level-1 action instance for convenience
def barbarian_level_1():
    features = ['Rage', 'Unarmored Defense']
    armor_profs = ['Armor(Light)', 'Armor(Medium)', 'Shield']
    # Weapons: simple and martial; include choice tokens so counters get set elsewhere
    weapon_profs = ['Weapon(Simple)', 'Weapon(Martial)', 'MartialWeaponChoice', 'SimpleWeaponChoice']
    saving_throws = ['SavingThrow(Strength)', 'SavingThrow(Constitution)']
    equipment = ['Greataxe/AnyMartialMelee', 'Handaxe', 'Handaxe', "ExplorerPack", 'Javelin', 'Javelin', 'Javelin', 'Javelin']

    return ClassLevel1('barbarian', features=features, hit_die=12,
                       armor_proficiencies=armor_profs,
                       weapon_proficiencies=weapon_profs,
                       saving_throws=saving_throws,
                       skill_choices=2,
                       equipment=equipment,
                       additional_effects=[('rages_per_long_rest', 'set', 2), ('rage_damage_bonus', 'set', 2)])


def barbarian_level_2():
    features = ['Reckless Attack', 'Danger Sense']
    return ClassLevelUp('barbarian', 2, features=features)


def choose_barbarian_primal_path_action():
    paths = ['Path of the Berserker', 'Path of the Totem Warrior']
    return ChooseOptions('choose_barbarian_primal_path', 'barbarian_primal_path_to_choose', paths, effect_kind='features')


def barbarian_level_3():
    features = ['Primal Path']
    additional = [
        ('rages_per_long_rest', 'set', 3),
        ('barbarian_primal_path_to_choose', 'set', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('barbarian', 3, features=features, additional_effects=additional)


def barbarian_level_4():
    features = ['Ability Score Improvement']
    additional = [
        ('asi_to_choose', 'inc', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('barbarian', 4, features=features, additional_effects=additional)


def barbarian_level_5():
    features = ['Extra Attack', 'Fast Movement']
    additional = [
        ('extra_attacks', 'set', 2),
        ('speed_bonus', 'set', 10),
    ]
    return ClassLevelUp('barbarian', 5, features=features, additional_effects=additional)


class ChooseOptions(Action):
    """Generic choice action that consumes a numeric counter.

    - id: base id
    - counter_key: sheet counter (e.g., 'languages_to_choose')
    - options: list of string option names
    - effect_kind: one of 'languages', 'proficiencies', 'equipment', or 'features'
    """
    def __init__(self, id, counter_key, options, effect_kind='proficiencies'):
        super().__init__(id)
        # Drop the base placeholder action to avoid no-op decisions
        self.compiled_actions = []
        self.counter_key = counter_key
        self.options = options
        self.effect_kind = effect_kind

        # Create one actionable choice per option
        for opt in options:
            opt_norm = opt
            norm_id = f"{id}_{self._norm(opt_norm)}"
            # preconds: counter >=1 and option not already chosen
            chosen_flag = f"{id}_{self._norm(opt_norm)}_chosen"
            a = Action(norm_id, title=f"{self._default_title(id)}: {opt_norm}")
            a.add_precondition((counter_key, '>=', 1))
            a.add_precondition((chosen_flag, '==', False))
            # effect: add chosen value to target, mark chosen, decrement counter
            if effect_kind == 'languages':
                a.add_effect(('languages', 'add', opt_norm))
            elif effect_kind == 'equipment':
                a.add_effect(('equipment', 'add', opt_norm))
            elif effect_kind == 'features':
                a.add_effect(('feature_entries', 'add', opt_norm))
                # Also set a boolean flag for this feature
                flag = opt_norm.lower().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '')
                a.add_effect((flag, 'set', True))
            elif effect_kind == 'cantrips':
                a.add_effect(('cantrips_known', 'add', opt_norm))
            elif effect_kind == 'instruments':
                a.add_effect(('instruments_known', 'add', opt_norm))
            else:
                # proficiencies
                a.add_effect(('proficiencies', 'add', opt_norm))
            a.add_effect((chosen_flag, 'set', True))
            a.add_effect((counter_key, 'dec', 1))
            self.compiled_actions += a.compiled_actions

    def _norm(self, s: str):
        return s.lower().replace(' ', '_').replace("/", '_').replace('-', '_')


def choose_simple_weapon_action():
    simple_weapons = ['Club','Dagger','Greatclub','Handaxe','Javelin','Light hammer','Mace','Quarterstaff','Sickle','Spear','Shortbow','Sling','Dart']
    return ChooseOptions('choose_simple_weapon','simple_weapons_to_choose', simple_weapons, effect_kind='proficiencies')


def choose_martial_weapon_action():
    martial_weapons = ['Battleaxe','Flail','Glaive','Greataxe','Greatsword','Halberd','Lance','Longsword','Maul','Morningstar','Pike','Rapier','Scimitar','Shortsword','Trident','War pick','Warhammer','Whip','Longbow','Crossbow, hand','Crossbow, heavy']
    return ChooseOptions('choose_martial_weapon','martial_weapons_to_choose', martial_weapons, effect_kind='proficiencies')


def choose_skill_action():
    skills = [
        'Athletics','Acrobatics','Sleight of Hand','Stealth','Arcana','History','Investigation','Nature','Religion',
        'Animal Handling','Insight','Medicine','Perception','Survival','Deception','Intimidation','Performance','Persuasion'
    ]
    return ChooseOptions('choose_skill','skills_to_choose', skills, effect_kind='proficiencies')


def choose_language_action():
    langs = ['Common','Draconic','Orc','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Abyssal','Celestial']
    return ChooseOptions('choose_language','languages_to_choose', langs, effect_kind='languages')


def choose_bard_cantrips_action():
    cantrips = ['Dancing Lights','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike']
    # use global cantrips counter (cantrips_to_choose) so ValidateCharacterSheet checks it
    return ChooseOptions('choose_bard_cantrip','cantrips_to_choose', cantrips, effect_kind='cantrips')


def bard_level_1():
    features = ['Spellcasting', 'Bardic Inspiration']
    armor_profs = ['Armor(Light)']
    weapon_profs = ['Weapon(Simple)', 'Weapon(HandCrossbow)', 'Weapon(Longsword)', 'Weapon(Rapier)', 'Weapon(Shortsword)']
    saving_throws = ['SavingThrow(Dexterity)', 'SavingThrow(Charisma)']
    equipment = [
        'Rapier/Longsword/AnySimpleWeapon',
        'DiplomatPack/EntertainerPack',
        'Lute/OtherMusicalInstrument',
        'LeatherArmor',
        'Dagger',
    ]

    additional = [
        ('spellcasting_ability', 'set', 'charisma'),
        ('cantrips_to_choose', 'set', 2),
        ('bard_spells_to_choose', 'set', 4),
        ('bard_max_spell_level', 'set', 1),
        ('spell_slots_1st', 'set', 2),
        # instruments: three musical instruments to choose
        ('instruments_to_choose', 'set', 3),
        # bardic inspiration
        ('bardic_inspiration_die', 'set', 6),
        # mark sheet invalid until choices are resolved
        ('is_valid_sheet', 'set', False),
    ]

    return ClassLevel1('bard', features=features, hit_die=8,
                       armor_proficiencies=armor_profs,
                       weapon_proficiencies=weapon_profs,
                       saving_throws=saving_throws,
                       skill_choices=3,
                       equipment=equipment,
                       additional_effects=additional)


def bard_level_2():
    features = ['Jack of All Trades', 'Song of Rest (d6)']
    additional = [
        ('bard_spells_to_choose', 'inc', 1),  # 5 spells known
        ('spell_slots_1st', 'set', 3),
        ('song_of_rest_die', 'set', 6),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('bard', 2, features=features, additional_effects=additional)


def choose_bard_college_action():
    colleges = ['College of Lore', 'College of Valor']
    return ChooseOptions('choose_bard_college', 'bard_college_to_choose', colleges, effect_kind='features')


def choose_expertise_action():
    """Choose 2 skill proficiencies to gain expertise (double proficiency bonus)."""
    skills = [
        'Athletics','Acrobatics','Sleight of Hand','Stealth','Arcana','History','Investigation','Nature','Religion',
        'Animal Handling','Insight','Medicine','Perception','Survival','Deception','Intimidation','Performance','Persuasion'
    ]
    return ChooseOptions('choose_expertise', 'expertise_to_choose', skills, effect_kind='proficiencies')


def bard_level_3():
    features = ['Bard College', 'Expertise']
    additional = [
        ('bard_spells_to_choose', 'inc', 1),  # 6 spells known
        ('bard_max_spell_level', 'set', 2),
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 2),
        ('bard_college_to_choose', 'set', 1),
        ('expertise_to_choose', 'set', 2),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('bard', 3, features=features, additional_effects=additional)


def bard_level_4():
    features = ['Ability Score Improvement']
    additional = [
        ('bard_spells_to_choose', 'inc', 1),  # 7 spells known
        ('cantrips_to_choose', 'inc', 1),  # 3 cantrips total
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 3),
        ('asi_to_choose', 'inc', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('bard', 4, features=features, additional_effects=additional)


def bard_level_5():
    features = ['Bardic Inspiration (d8)', 'Font of Inspiration']
    additional = [
        ('bard_spells_to_choose', 'inc', 1),  # 8 spells known
        ('bard_max_spell_level', 'set', 3),
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 3),
        ('spell_slots_3rd', 'set', 2),
        ('bardic_inspiration_die', 'set', 8),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('bard', 5, features=features, additional_effects=additional)


def choose_instrument_action():
    instruments = [
        'Lute','Lyre','Flute','Pan Flute','Dulcimer','Horn','Bagpipes','Drum','Viol','Mandolin','Accordion'
    ]
    return ChooseOptions('choose_instrument','instruments_to_choose', instruments, effect_kind='instruments')


class ChooseSpells(Action):
    """Choice actions for class spells constrained by max spell level.

    - id: base id
    - class_name: e.g., 'bard'
    - spells_by_level: dict mapping int level -> list of spell names
    - counter_key: sheet counter key (e.g., 'bard_spells_to_choose')
    - max_level_key: sheet key holding allowed max spell level (e.g., 'bard_max_spell_level')
    """
    def __init__(self, id, class_name, spells_by_level, counter_key=None, max_level_key=None):
        super().__init__(id)
        # Drop the base placeholder action to avoid no-op decisions
        self.compiled_actions = []
        self.class_name = class_name
        self.spells_by_level = spells_by_level
        self.counter_key = counter_key or f"{class_name}_spells_to_choose"
        self.max_level_key = max_level_key or f"{class_name}_max_spell_level"

        # iterate spells and create actions with level constraint
        for level, spells in sorted(spells_by_level.items()):
            for sp in spells:
                norm = self._norm(sp)
                opt_id = f"{id}_{norm}"
                chosen_flag = f"{id}_{norm}_chosen"

                a = Action(opt_id, title=f"{self._default_title(id)}: {sp}")
                a.add_precondition((self.counter_key, '>=', 1))
                a.add_precondition((chosen_flag, '==', False))
                # require max level on sheet to allow choosing this spell
                a.add_precondition((self.max_level_key, '>=', int(level)))
                # effect: add to spells_known with class and level tag
                a.add_effect(( 'spells_known', 'add', f"{class_name}:{sp}:{level}"))
                a.add_effect((chosen_flag, 'set', True))
                a.add_effect((self.counter_key, 'dec', 1))
                self.compiled_actions += a.compiled_actions

    def _norm(self, s: str):
        return s.lower().replace(' ', '_').replace("/", '_').replace('-', '_')


def choose_bard_spells_action():
    # Bard spells by level (0-9) - trimmed list based on provided data
    bard_spells = {
        0: ['Dancing Lights','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike'],
        1: ['Bane','Charm Person','Comprehend Languages','Cure Wounds','Detect Magic','Disguise Self','Faerie Fire','Feather Fall','Healing Word','Heroism','Hideous Laughter','Identify','Illusory Script','Longstrider','Silent Image','Sleep','Speak with Animals','Thunderwave','Unseen Servant'],
        2: ['Animal Messenger','Blindness/Deafness','Calm Emotions','Detect Thoughts','Enhance Ability','Enthrall','Heat Metal','Hold Person','Invisibility','Knock','Lesser Restoration','Locate Animals or Plants','Locate Object','Magic Mouth','See Invisibility','Shatter','Silence','Suggestion','Zone of Truth'],
        3: ['Bestow Curse','Clairvoyance','Dispel Magic','Fear','Glyph of Warding','Hypnotic Pattern','Major Image','Nondetection','Plant Growth','Sending','Speak with Dead','Speak with Plants','Stinking Cloud','Tiny Hut','Tongues'],
        4: ['Confusion','Dimension Door','Freedom of Movement','Greater Invisibility','Hallucinatory Terrain','Locate Creature','Polymorph'],
        5: ['Animate Objects','Awaken','Dominate Person','Dream','Geas','Greater Restoration','Hold Monster','Legend Lore','Mass Cure Wounds','Mislead','Modify Memory','Planar Binding','Raise Dead','Scrying','Seeming','Teleportation Circle'],
        6: ['Eyebite','Find the Path','Guards and Wards','Irresistible Dance','Mass Suggestion','Programmed Illusion','True Seeing'],
        7: ['Arcane Sword','Etherealness','Forcecage','Magnificent Mansion','Mirage Arcane','Project Image','Regenerate','Resurrection','Symbol','Teleport'],
        8: ['Dominate Monster','Feeblemind','Glibness','Mind Blank','Power Word Stun'],
        9: ['Foresight','Power Word Kill','True Polymorph']
    }
    return ChooseSpells('choose_spells_bard','bard', bard_spells, counter_key='bard_spells_to_choose', max_level_key='bard_max_spell_level')


def choose_cleric_cantrips_action():
    cantrips = ['Guidance','Light','Mending','Resistance','Sacred Flame','Thaumaturgy']
    return ChooseOptions('choose_cleric_cantrip','cantrips_to_choose', cantrips, effect_kind='cantrips')


def cleric_level_1():
    features = ['Spellcasting', 'Divine Domain']
    armor_profs = ['Armor(Light)', 'Armor(Medium)', 'Shield']
    weapon_profs = ['Weapon(Simple)']
    saving_throws = ['SavingThrow(Wisdom)', 'SavingThrow(Charisma)']
    equipment = [
        'Mace/Warhammer(if proficient)',
        'ScaleMail/LeatherArmor/ChainMail(if proficient)',
        'LightCrossbow/AnySimpleWeapon',
        'PriestsPack/ExplorersPack',
        'Shield',
        'HolySymbol',
    ]

    additional = [
        ('spellcasting_ability', 'set', 'wisdom'),
        ('cantrips_to_choose', 'set', 3),
        # clerics prepare spells; wisdom modifier assumed to be 5
        # level 1: 5 + 1 = 6 spells to prepare
        ('cleric_spells_to_choose', 'set', 6),
        ('cleric_max_spell_level', 'set', 1),
        ('spell_slots_1st', 'set', 2),
        # choose a divine domain at level 1
        ('divine_domain_to_choose', 'set', 1),
        ('is_valid_sheet', 'set', False),
    ]

    return ClassLevel1('cleric', features=features, hit_die=8,
                       armor_proficiencies=armor_profs,
                       weapon_proficiencies=weapon_profs,
                       saving_throws=saving_throws,
                       skill_choices=2,
                       equipment=equipment,
                       additional_effects=additional)


def cleric_level_2():
    features = ['Channel Divinity', 'Turn Undead']
    additional = [
        # Level 2: 5 + 2 = 7 spells prepared (increase by 1)
        ('cleric_spells_to_choose', 'inc', 1),
        ('spell_slots_1st', 'set', 3),
        ('channel_divinity_uses', 'set', 1),
        # Note: Divine Domain feature would be domain-specific
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('cleric', 2, features=features, additional_effects=additional)


def cleric_level_3():
    # No new features at level 3, just spell progression
    additional = [
        # Level 3: 5 + 3 = 8 spells prepared (increase by 1)
        ('cleric_spells_to_choose', 'inc', 1),
        ('cleric_max_spell_level', 'set', 2),
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 2),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('cleric', 3, features=[], additional_effects=additional)


def cleric_level_4():
    features = ['Ability Score Improvement']
    additional = [
        # Level 4: 5 + 4 = 9 spells prepared (increase by 1)
        ('cleric_spells_to_choose', 'inc', 1),
        ('cantrips_to_choose', 'inc', 1),  # 4 cantrips total at level 4
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 3),
        ('asi_to_choose', 'inc', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('cleric', 4, features=features, additional_effects=additional)


def cleric_level_5():
    features = ['Destroy Undead (CR 1/2)']
    additional = [
        # Level 5: 5 + 5 = 10 spells prepared (increase by 1)
        ('cleric_spells_to_choose', 'inc', 1),
        ('cleric_max_spell_level', 'set', 3),
        ('spell_slots_1st', 'set', 4),
        ('spell_slots_2nd', 'set', 3),
        ('spell_slots_3rd', 'set', 2),
        ('destroy_undead_cr', 'set', 0.5),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('cleric', 5, features=features, additional_effects=additional)


def choose_divine_domain_action():
    domains = ['Knowledge','Life','Light','Nature','Tempest','Trickery','War']
    # ChooseOptions will add the chosen domain to feature_entries
    return ChooseOptions('choose_divine_domain','divine_domain_to_choose', domains, effect_kind='features')


def life_domain_level_1_bonus():
    """Life Domain level 1 bonus: Heavy armor proficiency + Disciple of Life."""
    action = Action('life_domain_level_1_bonus')
    # Preconditions: must have Life domain and be cleric level 1
    action.add_precondition(('life', '==', True))
    action.add_precondition(('class_cleric_level', '==', 1))
    # Effects: add heavy armor proficiency and Disciple of Life feature
    action.add_effect(('proficiencies', 'add', 'Armor(Heavy)'))
    action.add_effect(('feature_entries', 'add', 'Disciple of Life'))
    action.add_effect(('disciple_of_life', 'set', True))
    return action


def life_domain_level_2_channel_divinity():
    """Life Domain level 2: Channel Divinity - Preserve Life."""
    action = Action('life_domain_level_2_channel_divinity')
    # Preconditions: must have Life domain and be cleric level 2
    action.add_precondition(('life', '==', True))
    action.add_precondition(('class_cleric_level', '==', 2))
    # Effects: add Preserve Life channel divinity option
    action.add_effect(('feature_entries', 'add', 'Channel Divinity: Preserve Life'))
    action.add_effect(('channel_divinity_preserve_life', 'set', True))
    return action


def choose_cleric_spells_action():
    cleric_spells = {
        0: ['Guidance','Light','Mending','Resistance','Sacred Flame','Thaumaturgy'],
        1: ['Bane','Bless','Command','Create or Destroy Water','Cure Wounds','Detect Evil and Good','Detect Magic','Detect Poison and Disease','Guiding Bolt','Healing Word','Inflict Wounds','Protection from Evil and Good','Purify Food and Drink','Sanctuary','Shield of Faith'],
        2: ['Aid','Augury','Blindness/Deafness','Calm Emotions','Continual Flame','Enhance Ability','Find Traps','Gentle Repose','Hold Person','Lesser Restoration','Locate Object','Prayer of Healing','Protection from Poison','Silence','Spiritual Weapon','Warding Bond','Zone of Truth'],
        3: ['Animate Dead','Beacon of Hope','Bestow Curse','Clairvoyance','Create Food and Water','Daylight','Dispel Magic','Glyph of Warding','Magic Circle','Mass Healing Word','Meld into Stone','Protection from Energy','Remove Curse','Revivify','Sending','Speak with Dead','Spirit Guardians','Tongues','Water Walk'],
        4: ['Banishment','Control Water','Death Ward','Divination','Freedom of Movement','Locate Creature','Stone Shape'],
        5: ['Commune','Contagion','Dispel Evil and Good','Flame Strike','Geas','Greater Restoration','Hallow','Insect Plague','Legend Lore','Mass Cure Wounds','Planar Binding','Raise Dead','Scrying'],
        6: ['Blade Barrier','Create Undead','Find the Path','Forbiddance','Harm','Heal','Heroes\' Feast','Planar Ally','True Seeing','Word of Recall'],
        7: ['Conjure Celestial','Divine Word','Etherealness','Fire Storm','Plane Shift','Regenerate','Resurrection','Symbol'],
        8: ['Antimagic Field','Control Weather','Earthquake','Holy Aura'],
        9: ['Astral Projection','Gate','Mass Heal','True Resurrection']
    }
    return ChooseSpells('choose_spells_cleric','cleric', cleric_spells, counter_key='cleric_spells_to_choose', max_level_key='cleric_max_spell_level')


def choose_fighting_style_action():
    styles = ['Archery','Defense','Dueling','Great Weapon Fighting','Protection','Two-Weapon Fighting']
    return ChooseOptions('choose_fighting_style','fighting_style_to_choose', styles, effect_kind='features')


def choose_fighter_equipment_action():
    # Equipment alternatives summarized as single option strings (components separated by ';')
    options = [
        'Chain Mail',
        'Leather Armor;Longbow;Arrows(20)',
        'Martial Weapon;Shield',
        'Martial Weapon;Martial Weapon',
        'Light Crossbow;Bolts(20)',
        'Two Handaxes',
        "Dungeoneers Pack",
        "Explorers Pack",
    ]
    return ChooseOptions('choose_fighter_equipment','fighter_equip_choices_to_choose', options, effect_kind='equipment')


def fighter_level_1():
    features = ['Fighting Style', 'Second Wind']
    armor_profs = ['Armor(All)', 'Shield']
    weapon_profs = ['Weapon(Simple)', 'Weapon(Martial)']
    saving_throws = ['SavingThrow(Strength)', 'SavingThrow(Constitution)']

    # We expose counters so the user can choose fighting style and the equipment
    # package choices. There are four grouped equipment choices at level 1.
    additional = [
        ('fighting_style_to_choose', 'set', 1),
        ('fighter_equip_choices_to_choose', 'set', 4),
        ('is_valid_sheet', 'set', False),
    ]

    return ClassLevel1('fighter', features=features, hit_die=10,
                       armor_proficiencies=armor_profs,
                       weapon_proficiencies=weapon_profs,
                       saving_throws=saving_throws,
                       skill_choices=2,
                       equipment=[],
                       additional_effects=additional)


def fighter_level_2():
    features = ['Action Surge']
    additional = [
        ('action_surge_uses', 'set', 1),
    ]
    return ClassLevelUp('fighter', 2, features=features, additional_effects=additional)


def choose_fighter_martial_archetype_action():
    archetypes = ['Champion', 'Battle Master', 'Eldritch Knight']
    return ChooseOptions('choose_fighter_archetype', 'fighter_archetype_to_choose', archetypes, effect_kind='features')


def fighter_level_3():
    features = ['Martial Archetype']
    additional = [
        ('fighter_archetype_to_choose', 'set', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('fighter', 3, features=features, additional_effects=additional)


class ASI_Choice(Action):
    """Ability Score Improvement - choose 2 ability increases (can be same ability twice).
    
    Creates actions for all 21 combinations of ability score improvements.
    Each action increases two abilities by 1 (or one ability by 2 if both picks are the same).
    """
    def __init__(self, id='choose_asi'):
        super().__init__(id)
        # Drop placeholder action
        self.compiled_actions = []
        abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
        
        # Generate all combinations (with replacement) of 2 abilities
        for i, ab1 in enumerate(abilities):
            for ab2 in abilities[i:]:  # Only generate combinations, not permutations
                if ab1 == ab2:
                    # Same ability twice: increase by 2
                    action_id = f"{id}_{ab1}_{ab1}"
                    a = Action(action_id, title=f"ASI: {ab1.capitalize()} +2")
                    a.add_precondition(('asi_to_choose', '>=', 1))
                    a.add_precondition((f"{action_id}_chosen", '==', False))
                    a.add_effect((f"{ab1}_score", 'inc', 2))
                    a.add_effect((f"{action_id}_chosen", 'set', True))
                    a.add_effect(('asi_to_choose', 'dec', 1))
                    self.compiled_actions += a.compiled_actions
                else:
                    # Two different abilities: increase each by 1
                    action_id = f"{id}_{ab1}_{ab2}"
                    a = Action(action_id, title=f"ASI: {ab1.capitalize()} +1, {ab2.capitalize()} +1")
                    a.add_precondition(('asi_to_choose', '>=', 1))
                    a.add_precondition((f"{action_id}_chosen", '==', False))
                    a.add_effect((f"{ab1}_score", 'inc', 1))
                    a.add_effect((f"{ab2}_score", 'inc', 1))
                    a.add_effect((f"{action_id}_chosen", 'set', True))
                    a.add_effect(('asi_to_choose', 'dec', 1))
                    self.compiled_actions += a.compiled_actions


def choose_feat_action():
    """Choose a feat instead of ASI. Currently only Grappler is available."""
    chooser = Action('choose_feat')
    chooser.compiled_actions = []
    
    # Grappler feat - requires Strength >= 13
    grappler_id = 'choose_feat_grappler'
    g = Action(grappler_id, title='Feat: Grappler')
    g.add_precondition(('asi_to_choose', '>=', 1))
    g.add_precondition(('strength_score', '>=', 13))
    g.add_precondition((f"{grappler_id}_chosen", '==', False))
    g.add_effect(('feature_entries', 'add', 'Grappler'))
    g.add_effect((f"{grappler_id}_chosen", 'set', True))
    g.add_effect(('asi_to_choose', 'dec', 1))
    chooser.compiled_actions += g.compiled_actions
    
    return chooser


def fighter_level_4():
    features = ['Ability Score Improvement']
    additional = [
        ('asi_to_choose', 'inc', 1),
        ('is_valid_sheet', 'set', False),
    ]
    return ClassLevelUp('fighter', 4, features=features, additional_effects=additional)


def fighter_level_5():
    features = ['Extra Attack']
    additional = [
        ('extra_attacks', 'set', 2),
    ]
    return ClassLevelUp('fighter', 5, features=features, additional_effects=additional)

class ValidateCharacterSheet(Action):
    def __init__(self):
        super().__init__('validate_character_sheet')
        # level 0 completeness
        self.add_precondition(('has_race', '==', True))
        self.add_precondition(('has_background', '==', True))
        for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
            self.add_precondition((f'{ability}_score', '>', 0))

        # all counters must be zero before declaring the sheet valid
        counters = [
            'skills_to_choose', 'martial_weapons_to_choose', 'simple_weapons_to_choose',
            'languages_to_choose', 'cantrips_to_choose', 'asi_to_choose',
            'bard_spells_to_choose', 'cleric_spells_to_choose', 'instruments_to_choose',
            'expertise_to_choose', 'fighting_style_to_choose', 'fighter_equip_choices_to_choose',
            'barbarian_primal_path_to_choose', 'bard_college_to_choose', 'divine_domain_to_choose',
            'fighter_archetype_to_choose'
        ]
        for counter in counters:
            self.add_precondition((counter, '==', 0))

        self.add_effect(('is_valid_sheet', 'set', True))


@dataclass
class BackgroundData:
    background_name: str

    proficiencies: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    equipment: List[str] = field(default_factory=list)
    special_features: List[str] = field(default_factory=list)

    def to_effects(self):
        effects = [
            ('background', 'set', self.background_name),
            ('has_background', 'set', True),
        ]

        # Handle languages: separate explicit languages from choice tokens
        real_langs = [l for l in self.languages if 'LanguageChoice' not in l]
        lang_choices = [l for l in self.languages if 'LanguageChoice' in l]
        if real_langs:
            effects.append(('languages', 'add', real_langs))
        if lang_choices:
            effects.append(('languages_to_choose', 'set', len(lang_choices)))

        # Handle proficiencies: separate explicit skills from choice tokens
        real_profs = []
        skill_choice_count = 0
        simple_weapon_choice = 0
        martial_weapon_choice = 0
        cantrip_choice_count = 0
        for p in self.proficiencies:
            if 'SkillChoice' in p:
                skill_choice_count += 1
            elif 'SimpleWeaponChoice' in p or ('SimpleWeapon' in p and 'Choice' in p):
                simple_weapon_choice += 1
            elif 'MartialWeaponChoice' in p or ('MartialWeapon' in p and 'Choice' in p):
                martial_weapon_choice += 1
            elif 'CantripChoice' in p:
                cantrip_choice_count += 1
            else:
                real_profs.append(p)

        if real_profs:
            effects.append(('proficiencies', 'add', real_profs))
        if skill_choice_count:
            effects.append(('skills_to_choose', 'set', skill_choice_count))
        if simple_weapon_choice:
            effects.append(('simple_weapons_to_choose', 'set', simple_weapon_choice))
        if martial_weapon_choice:
            effects.append(('martial_weapons_to_choose', 'set', martial_weapon_choice))
        if cantrip_choice_count:
            effects.append(('cantrips_to_choose', 'set', cantrip_choice_count))

        if self.equipment:
            effects.append(('equipment', 'add', self.equipment))
        if self.special_features:
            effects.append(('feature_entries', 'add', self.special_features))

        # If any choice counters were set, the sheet becomes invalid until choices are resolved
        if lang_choices or skill_choice_count or simple_weapon_choice or martial_weapon_choice or cantrip_choice_count:
            effects.append(('is_valid_sheet', 'set', False))

        return effects
class ChooseBackground(Action):
    def __init__(self, background: BackgroundData):
        super().__init__(f'choose_background_{background.background_name}')

        # background can only be chosen after race
        self.add_precondition(('has_race', '==', True))
        self.add_precondition(('has_background', '==', False))

        for eff in background.to_effects():
            self.add_effect(eff)


@dataclass
class RaceData:
    race_name:str
    special_features: list = field(default_factory=list)
    proficiencies: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    speed:int = 30

    size:str = 'medium'
    darkvision: int = 0
    charisma_bonus: int = 0
    strength_bonus: int = 0
    dexterity_bonus: int = 0
    constitution_bonus: int = 0
    intelligence_bonus: int = 0
    wisdom_bonus: int = 0
    any_ability_bonus: int = 0
    languages_to_choose: int = 0
    skills_to_choose: int = 0
    martial_weapons_to_choose: int = 0
    simple_weapons_to_choose: int = 0
    cantrips_to_choose: int = 0

    def to_effects(self):
        effects = [
            ('race', 'set', self.race_name),
            ('speed', 'set', self.speed),
            ('size', 'set', self.size),
            ('charisma_bonus', '+=', self.charisma_bonus),
            ('strength_bonus', '+=', self.strength_bonus),
            ('dexterity_bonus', '+=', self.dexterity_bonus),
            ('constitution_bonus', '+=', self.constitution_bonus),
            ('intelligence_bonus', '+=', self.intelligence_bonus),
            ('wisdom_bonus', '+=', self.wisdom_bonus),
            ('any_ability_bonus', '+=', self.any_ability_bonus),
            ('feature_entries', 'add', self.special_features),
        ]

        # Languages: split explicit languages from language choices
        real_langs = [l for l in self.languages if 'LanguageChoice' not in l]
        lang_choices = [l for l in self.languages if 'LanguageChoice' in l]
        if real_langs:
            effects.append(('languages', 'add', real_langs))
        if lang_choices:
            effects.append(('languages_to_choose', 'set', len(lang_choices)))

        # Proficiencies: detect skill/weapon/cantrip choices
        real_profs = []
        skill_choice = 0
        simple_weapon_choice = 0
        martial_weapon_choice = 0
        cantrip_choice = 0
        for p in self.proficiencies:
            if 'SkillChoice' in p:
                skill_choice += 1
            elif 'SimpleWeaponChoice' in p or ('SimpleWeapon' in p and 'Choice' in p):
                simple_weapon_choice += 1
            elif 'MartialWeaponChoice' in p or ('MartialWeapon' in p and 'Choice' in p):
                martial_weapon_choice += 1
            elif 'CantripChoice' in p:
                cantrip_choice += 1
            else:
                real_profs.append(p)

        if real_profs:
            effects.append(('proficiencies', 'add', real_profs))
        if skill_choice:
            effects.append(('skills_to_choose', 'set', skill_choice))
        if simple_weapon_choice:
            effects.append(('simple_weapons_to_choose', 'set', simple_weapon_choice))
        if martial_weapon_choice:
            effects.append(('martial_weapons_to_choose', 'set', martial_weapon_choice))
        if cantrip_choice:
            effects.append(('cantrips_to_choose', 'set', cantrip_choice))

        # If any counters were set, invalidate the sheet until choices are resolved
        if lang_choices or skill_choice or simple_weapon_choice or martial_weapon_choice or cantrip_choice:
            effects.append(('is_valid_sheet', 'set', False))

        return effects

class ChooseRace(Action):
    def __init__(self,
                race:RaceData, subraces:List[RaceData]
                 ):
        super().__init__(f'choose_{race.race_name}')
        if not subraces:
            self.add_precondition(('has_race', '==', False))
            for eff in race.to_effects():
                self.add_effect(eff)
            self.add_effect(('has_race', 'set', True))
            return
        choose_race = Action(f'choose_race_{race.race_name}')
        for eff in race.to_effects():
            choose_race.add_effect(eff)
        choose_race.add_precondition(('has_race', '==', False))
        subraces_choices = []
        for subrace in subraces:
            choose_subrace = Action(f'choose_sub_race_{subrace.race_name}')
            for eff in subrace.to_effects():
                choose_subrace.add_effect(eff)
            choose_subrace.add_precondition(('race', '==', race.race_name))
            subraces_choices.append(choose_subrace)
        choose_subrace = MutEx(f'{race.race_name}_choose_subrace',subraces_choices)
        choose_subrace.add_effect(('has_race', 'set', True))
        self.compiled_actions = Sequence('race_and_subrace',[choose_race, choose_subrace]).compiled_actions



if __name__ == '__main__':
    db_colors = ['Black', 'Blue', 'Brass', 'Bronze']
    db_subraces = [RaceData(race_name = f'{color}Dragonborn', special_features=[f'BreathWeapon{color}'])  for color in db_colors]
    db_race_data = RaceData(**{
        'race_name':'Dragonborn',
        'special_features':[],
        'charisma_bonus':1,
        'strength_bonus':2,
    })
    dwarf_race_data = RaceData(
        race_name='Dwarf',
        speed=25,
        size='medium',
        darkvision=60,
        constitution_bonus=2,
        languages=[
            'Common',
            'Dwarvish',
        ],

        proficiencies=[
            'Weapon(Battleaxe)',
            'Weapon(Handaxe)',
            'Weapon(LightHammer)',
            'Weapon(Warhammer)',
            'ToolChoice(SmithsTools,BrewersSupplies,MasonsTools)',
        ],
        special_features=[
            'DwarvenResilience',
            'Stonecunning',
            'HeavyArmorSpeedUnaffected',
            'Languages(Common,Dwarvish)',
        ]
    )
    hill_dwarf_data = RaceData(
        race_name='HillDwarf',
        speed=25,
        size='medium',
        darkvision=60,
        wisdom_bonus=1,
        special_features=[
            'DwarvenToughness'
        ]
    )

    elf_race_data = RaceData(
        race_name='Elf',
        speed=30,
        size='medium',
        darkvision=60,
        dexterity_bonus=2,

        languages=[
            'Common',
            'Elvish',
        ],

        proficiencies=[
            'Skill(Perception)',
        ],

        special_features=[
            'KeenSenses',
            'FeyAncestry',
            'Trance',
        ]
    )

    high_elf_data = RaceData(
        race_name='HighElf',
        intelligence_bonus=1,

        proficiencies=[
            'Weapon(Longsword)',
            'Weapon(Shortsword)',
            'Weapon(Shortbow)',
            'Weapon(Longbow)',
            'CantripChoice(Wizard)',
        ],

        languages=[
            'LanguageChoice(Any)',
        ],

        special_features=[
            'ElfWeaponTraining',
            'HighElfCantrip',
        ]
    )

    for a in ChooseRace(dwarf_race_data, [hill_dwarf_data]).compiled_actions:
        print(a)

    acolyte_background = BackgroundData(
        background_name='Acolyte',

        proficiencies=[
            'Skill(Insight)',
            'Skill(Religion)',
        ],

        languages=[
            'LanguageChoice(Any)',
            'LanguageChoice(Any)',
        ],

        equipment=[
            'HolySymbol',
            'PrayerBookOrWheel',
            'Incense(5)',
            'Vestments',
            'CommonClothes',
            'Gold(15)',
        ],

        special_features=[
            'ShelterOfTheFaithful',
        ]
    )
