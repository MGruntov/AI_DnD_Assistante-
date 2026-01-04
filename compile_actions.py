"""Compile all character creation actions into a JSON decision tree."""
import json
from character_domain_creator import (
    # Barbarian
    barbarian_level_1, barbarian_level_2, barbarian_level_3, barbarian_level_4, barbarian_level_5,
    choose_barbarian_primal_path_action,
    # Bard
    bard_level_1, bard_level_2, bard_level_3, bard_level_4, bard_level_5,
    choose_bard_college_action, choose_expertise_action, choose_bard_cantrips_action,
    choose_bard_spells_action, choose_instrument_action,
    # Cleric
    cleric_level_1, cleric_level_2, cleric_level_3, cleric_level_4, cleric_level_5,
    choose_divine_domain_action, life_domain_level_1_bonus, life_domain_level_2_channel_divinity,
    choose_cleric_cantrips_action, choose_cleric_spells_action,
    # Fighter
    fighter_level_1, fighter_level_2, fighter_level_3, fighter_level_4, fighter_level_5,
    choose_fighting_style_action, choose_fighter_martial_archetype_action,
    choose_fighter_equipment_action,
    # Common
    choose_skill_action, choose_language_action,
    choose_simple_weapon_action, choose_martial_weapon_action,
    ASI_Choice, choose_feat_action, AbilityScoresChoice,
    ValidateCharacterSheet,
    # Race and background (examples from file)
    ChooseRace, RaceData, ChooseBackground, BackgroundData,
)

def compile_all_actions():
    """Compile all action functions into a single JSON structure."""
    all_actions = []
    
    # Barbarian actions
    print("Compiling Barbarian...")
    all_actions.extend(barbarian_level_1().compiled_actions)
    all_actions.extend(barbarian_level_2().compiled_actions)
    all_actions.extend(barbarian_level_3().compiled_actions)
    all_actions.extend(barbarian_level_4().compiled_actions)
    all_actions.extend(barbarian_level_5().compiled_actions)
    all_actions.extend(choose_barbarian_primal_path_action().compiled_actions)
    
    # Bard actions
    print("Compiling Bard...")
    all_actions.extend(bard_level_1().compiled_actions)
    all_actions.extend(bard_level_2().compiled_actions)
    all_actions.extend(bard_level_3().compiled_actions)
    all_actions.extend(bard_level_4().compiled_actions)
    all_actions.extend(bard_level_5().compiled_actions)
    all_actions.extend(choose_bard_college_action().compiled_actions)
    all_actions.extend(choose_expertise_action().compiled_actions)
    all_actions.extend(choose_bard_cantrips_action().compiled_actions)
    all_actions.extend(choose_bard_spells_action().compiled_actions)
    all_actions.extend(choose_instrument_action().compiled_actions)
    
    # Cleric actions
    print("Compiling Cleric...")
    all_actions.extend(cleric_level_1().compiled_actions)
    all_actions.extend(cleric_level_2().compiled_actions)
    all_actions.extend(cleric_level_3().compiled_actions)
    all_actions.extend(cleric_level_4().compiled_actions)
    all_actions.extend(cleric_level_5().compiled_actions)
    all_actions.extend(choose_divine_domain_action().compiled_actions)
    all_actions.extend(life_domain_level_1_bonus().compiled_actions)
    all_actions.extend(life_domain_level_2_channel_divinity().compiled_actions)
    all_actions.extend(choose_cleric_cantrips_action().compiled_actions)
    all_actions.extend(choose_cleric_spells_action().compiled_actions)
    
    # Fighter actions
    print("Compiling Fighter...")
    all_actions.extend(fighter_level_1().compiled_actions)
    all_actions.extend(fighter_level_2().compiled_actions)
    all_actions.extend(fighter_level_3().compiled_actions)
    all_actions.extend(fighter_level_4().compiled_actions)
    all_actions.extend(fighter_level_5().compiled_actions)
    all_actions.extend(choose_fighting_style_action().compiled_actions)
    all_actions.extend(choose_fighter_martial_archetype_action().compiled_actions)
    all_actions.extend(choose_fighter_equipment_action().compiled_actions)
    
    # Common choice actions
    print("Compiling common actions...")
    all_actions.extend(choose_skill_action().compiled_actions)
    all_actions.extend(choose_language_action().compiled_actions)
    all_actions.extend(choose_simple_weapon_action().compiled_actions)
    all_actions.extend(choose_martial_weapon_action().compiled_actions)
    all_actions.extend(ASI_Choice().compiled_actions)
    all_actions.extend(choose_feat_action().compiled_actions)
    all_actions.extend(ValidateCharacterSheet().compiled_actions)
    
    # Add ability score assignment
    print("Compiling ability score assignment...")
    # Standard array: 15, 14, 13, 12, 10, 8
    ability_scores_action = AbilityScoresChoice('assign_ability_scores', [15, 14, 13, 12, 10, 8])
    all_actions.extend(ability_scores_action.compiled_actions)
    
    # Add some example races
    print("Compiling races...")
    # Human
    human_race = RaceData(
        race_name='Human',
        speed=30,
        languages=['Common'],
        strength_bonus=1,
        dexterity_bonus=1,
        constitution_bonus=1,
        intelligence_bonus=1,
        wisdom_bonus=1,
        charisma_bonus=1,
    )
    all_actions.extend(ChooseRace(human_race, []).compiled_actions)
    
    # Dwarf with Hill Dwarf subrace
    dwarf_race = RaceData(
        race_name='Dwarf',
        speed=25,
        size='medium',
        darkvision=60,
        constitution_bonus=2,
        languages=['Common', 'Dwarvish'],
        proficiencies=['Weapon(Battleaxe)', 'Weapon(Handaxe)', 'Weapon(LightHammer)', 'Weapon(Warhammer)'],
        special_features=['DwarvenResilience', 'Stonecunning'],
    )
    hill_dwarf = RaceData(
        race_name='HillDwarf',
        speed=25,
        wisdom_bonus=1,
        special_features=['DwarvenToughness'],
    )
    all_actions.extend(ChooseRace(dwarf_race, [hill_dwarf]).compiled_actions)
    
    # Elf with High Elf subrace
    elf_race = RaceData(
        race_name='Elf',
        speed=30,
        darkvision=60,
        dexterity_bonus=2,
        languages=['Common', 'Elvish'],
        proficiencies=['Skill(Perception)'],
        special_features=['KeenSenses', 'FeyAncestry', 'Trance'],
    )
    high_elf = RaceData(
        race_name='HighElf',
        intelligence_bonus=1,
        proficiencies=['Weapon(Longsword)', 'Weapon(Shortsword)', 'Weapon(Shortbow)', 'Weapon(Longbow)'],
        languages=['LanguageChoice(Any)'],
        special_features=['ElfWeaponTraining'],
        cantrips_to_choose=1,
    )
    all_actions.extend(ChooseRace(elf_race, [high_elf]).compiled_actions)
    
    # Add example background
    print("Compiling backgrounds...")
    acolyte = BackgroundData(
        background_name='Acolyte',
        proficiencies=['Skill(Insight)', 'Skill(Religion)'],
        languages=['LanguageChoice(Any)', 'LanguageChoice(Any)'],
        equipment=['HolySymbol', 'PrayerBook', 'Incense(5)', 'Vestments', 'CommonClothes', 'Gold(15)'],
        special_features=['ShelterOfTheFaithful'],
    )
    all_actions.extend(ChooseBackground(acolyte).compiled_actions)
    
    print(f"Total actions compiled: {len(all_actions)}")
    
    # Create the decision tree structure
    tree = {
        "decisions": all_actions
    }
    
    return tree

def create_initial_sheet():
    """Create an initial character sheet with default values."""
    sheet = {
        # Core identity
        "has_race": False,
        "race": "",
        "has_background": False,
        "background": "",
        
        # Ability scores (start at -1 to indicate not set)
        "strength_score": -1,
        "dexterity_score": -1,
        "constitution_score": -1,
        "intelligence_score": -1,
        "wisdom_score": -1,
        "charisma_score": -1,
        
        # Racial bonuses
        "strength_bonus": 0,
        "dexterity_bonus": 0,
        "constitution_bonus": 0,
        "intelligence_bonus": 0,
        "wisdom_bonus": 0,
        "charisma_bonus": 0,
        
        # Class levels
        "class_barbarian_level": 0,
        "class_bard_level": 0,
        "class_cleric_level": 0,
        "class_fighter_level": 0,
        
        # Hit dice
        "hit_die_count": 0,
        "hit_die_size": 0,
        
        # Counters for choices
        "skills_to_choose": 0,
        "martial_weapons_to_choose": 0,
        "simple_weapons_to_choose": 0,
        "languages_to_choose": 0,
        "cantrips_to_choose": 0,
        "asi_to_choose": 0,
        "bard_spells_to_choose": 0,
        "cleric_spells_to_choose": 0,
        "instruments_to_choose": 0,
        "expertise_to_choose": 0,
        "fighting_style_to_choose": 0,
        "fighter_equip_choices_to_choose": 0,
        "barbarian_primal_path_to_choose": 0,
        "bard_college_to_choose": 0,
        "divine_domain_to_choose": 0,
        "fighter_archetype_to_choose": 0,
        
        # Max spell levels
        "bard_max_spell_level": 0,
        "cleric_max_spell_level": 0,
        
        # Spell slots
        "spell_slots_1st": 0,
        "spell_slots_2nd": 0,
        "spell_slots_3rd": 0,
        
        # Character resources
        "rages_per_long_rest": 0,
        "rage_damage_bonus": 0,
        "bardic_inspiration_die": 0,
        "song_of_rest_die": 0,
        "channel_divinity_uses": 0,
        "action_surge_uses": 0,
        "extra_attacks": 1,
        "speed_bonus": 0,
        
        # Collections
        "proficiencies": [],
        "languages": [],
        "equipment": [],
        "feature_entries": [],
        "cantrips_known": [],
        "spells_known": [],
        "instruments_known": [],
        
        # Validation
        "is_valid_sheet": True,
        
        # Spellcasting
        "spellcasting_ability": "",
        
        # Speed
        "speed": 0,
        "size": "medium",
        "darkvision": 0,
        
        # Destroy undead
        "destroy_undead_cr": 0,
        
        # Domain-specific flags
        "life": False,
        "knowledge": False,
        "light": False,
        "nature": False,
        "tempest": False,
        "trickery": False,
        "war": False,
        
        # College flags
        "college_of_lore": False,
        "college_of_valor": False,
        
        # Path flags
        "path_of_the_berserker": False,
        "path_of_the_totem_warrior": False,
        
        # Archetype flags
        "champion": False,
        "battle_master": False,
        "eldritch_knight": False,
    }
    return sheet

if __name__ == "__main__":
    print("Compiling all actions...")
    tree = compile_all_actions()
    
    print("\nSaving decision tree...")
    with open('character_decision_tree.json', 'w') as f:
        json.dump(tree, f, indent=2)
    print(f"Saved to character_decision_tree.json")
    
    print("\nCreating initial character sheet...")
    sheet = create_initial_sheet()
    with open('character_sheet_initial.json', 'w') as f:
        json.dump(sheet, f, indent=2)
    print(f"Saved to character_sheet_initial.json")
    
    print("\nDone!")
