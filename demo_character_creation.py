"""Working example: Create a level 5 Barbarian character step-by-step."""
from character_creator import CharacterCreator

def create_barbarian():
    """Create a level 5 Barbarian with Path of the Berserker."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    print("=== Creating a Level 5 Barbarian ===\n")
    
    # Step 1: Assign ability scores (standard array: 15, 14, 13, 12, 10, 8)
    print("1. Assigning ability scores (Barbarian priorities: STR, CON)...")
    creator.apply_decision("assign_ability_scores_pick_0_set_strength")      # 15 -> Strength
    creator.apply_decision("assign_ability_scores_pick_1_set_constitution")  # 14 -> Constitution
    creator.apply_decision("assign_ability_scores_pick_2_set_dexterity")     # 13 -> Dexterity
    creator.apply_decision("assign_ability_scores_pick_3_set_wisdom")        # 12 -> Wisdom
    creator.apply_decision("assign_ability_scores_pick_4_set_charisma")      # 10 -> Charisma
    creator.apply_decision("assign_ability_scores_pick_5_set_intelligence")  # 8 -> Intelligence
    print(f"   STR: {creator.sheet['strength_score']}, DEX: {creator.sheet['dexterity_score']}, CON: {creator.sheet['constitution_score']}")
    print(f"   INT: {creator.sheet['intelligence_score']}, WIS: {creator.sheet['wisdom_score']}, CHA: {creator.sheet['charisma_score']}")
    
    # Step 2: Choose race
    print("\n2. Choosing Human race...")
    creator.apply_decision("choose_Human")
    print(f"   Race: {creator.sheet['race']}")
    print(f"   All abilities +1")
    
    # Step 3: Take Barbarian Level 1
    print("\n3. Taking Barbarian Level 1...")
    creator.apply_decision("choose_class_barbarian_level_1")
    print(f"   Hit Die: d{creator.sheet['hit_die_size']}")
    print(f"   Features: {', '.join(creator.sheet['feature_entries'])}")
    print(f"   Rages per day: {creator.sheet['rages_per_long_rest']}")
    print(f"   Skills to choose: {creator.sheet['skills_to_choose']}")
    
    # Step 4: Choose skills
    print("\n4. Choosing skills...")
    creator.apply_decision("choose_skill_athletics")
    print(f"   Chosen: Athletics (1 remaining)")
    creator.apply_decision("choose_skill_intimidation_final")
    print(f"   Chosen: Intimidation (character sheet now valid)")
    print(f"   Sheet valid: {creator.sheet['is_valid_sheet']}")
    
    # Step 5: Level 2
    print("\n5. Leveling to Barbarian 2...")
    creator.apply_decision("choose_class_barbarian_level_2")
    print(f"   New features: Reckless Attack, Danger Sense")
    
    # Step 6: Level 3 - Primal Path
    print("\n6. Leveling to Barbarian 3...")
    creator.apply_decision("choose_class_barbarian_level_3")
    print(f"   Must choose Primal Path")
    print(f"   Rages per day increased to: {creator.sheet['rages_per_long_rest']}")
    
    creator.apply_decision("choose_barbarian_primal_path_path_of_the_berserker_final")
    print(f"   Chosen: Path of the Berserker")
    
    # Step 7: Level 4 - ASI
    print("\n7. Leveling to Barbarian 4...")
    creator.apply_decision("choose_class_barbarian_level_4")
    print(f"   Ability Score Improvement available")
    
    creator.apply_decision("choose_asi_strength_strength_final")
    print(f"   Increased Strength by +2")
    print(f"   New Strength score: {creator.sheet['strength_score']}")
    
    # Step 8: Level 5 - Extra Attack
    print("\n8. Leveling to Barbarian 5...")
    creator.apply_decision("choose_class_barbarian_level_5")
    print(f"   Extra Attack gained!")
    print(f"   Fast Movement: +{creator.sheet['speed_bonus']} speed")
    print(f"   Attacks per action: {creator.sheet['extra_attacks']}")
    
    # Final summary
    print("\n" + "="*60)
    print("FINAL CHARACTER")
    print("="*60)
    print(creator.get_summary())
    print("\n All proficiencies:", creator.sheet['proficiencies'][:10], "...")
    print(f"Total actions taken: 11")
    print(f"Character is valid: {creator.sheet['is_valid_sheet']}")


def create_spellcaster():
    """Create a level 3 Bard to demonstrate spell selection."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    print("\n\n=== Creating a Level 3 Bard ===\n")
    
    # Assign ability scores
    print("1. Assigning ability scores (Bard priorities: CHA, DEX)...")
    creator.apply_decision("assign_ability_scores_pick_0_set_charisma")      # 15 -> Charisma
    creator.apply_decision("assign_ability_scores_pick_1_set_dexterity")     # 14 -> Dexterity
    creator.apply_decision("assign_ability_scores_pick_2_set_constitution")  # 13 -> Constitution
    creator.apply_decision("assign_ability_scores_pick_3_set_intelligence")  # 12 -> Intelligence
    creator.apply_decision("assign_ability_scores_pick_4_set_wisdom")        # 10 -> Wisdom
    creator.apply_decision("assign_ability_scores_pick_5_set_strength")      # 8 -> Strength
    print(f"   CHA: {creator.sheet['charisma_score']}, DEX: {creator.sheet['dexterity_score']}, CON: {creator.sheet['constitution_score']}")
    print(f"   INT: {creator.sheet['intelligence_score']}, WIS: {creator.sheet['wisdom_score']}, STR: {creator.sheet['strength_score']}")
    
    # Race
    print("\n2. Choosing Elf race with High Elf subrace...")
    creator.apply_decision("choose_race_Elf")
    print(f"   Race: {creator.sheet['race']} (subrace selection pending)")
    creator.apply_decision("choose_sub_race_HighElf")
    print(f"   High Elf selected")
    print(f"   Dexterity +2, Intelligence +1")
    print(f"   Languages to choose: {creator.sheet['languages_to_choose']}")
    
    # Choose language for High Elf
    creator.apply_decision("choose_language_draconic_final")
    print(f"   Chose Draconic language")
    
    # Bard Level 1
    print("\n3. Taking Bard Level 1...")
    creator.apply_decision("choose_class_bard_level_1")
    print(f"   Spellcasting ability: {creator.sheet['spellcasting_ability'].capitalize()}")
    print(f"   Cantrips to choose: {creator.sheet['cantrips_to_choose']}")
    print(f"   Spells to learn: {creator.sheet['bard_spells_to_choose']}")
    print(f"   Spell slots (1st): {creator.sheet['spell_slots_1st']}")
    
    # Make all required choices
    print("\n4. Making character choices...")
    
    # Skills
    for i, skill in enumerate(['performance', 'persuasion', 'deception']):
        suffix = '_final' if i == 2 else ''
        creator.apply_decision(f"choose_skill_{skill}{suffix}")
    print(f"   Skills: Performance, Persuasion, Deception")
    
    # Cantrips
    creator.apply_decision("choose_bard_cantrip_light")
    creator.apply_decision("choose_bard_cantrip_mage_hand_final")
    print(f"   Cantrips: Light, Mage Hand")
    
    # Spells
    for i, spell in enumerate(['cure_wounds', 'detect_magic', 'healing_word', 'thunderwave']):
        suffix = '_final' if i == 3 else ''
        creator.apply_decision(f"choose_spells_bard_{spell}{suffix}")
    print(f"   Spells: Cure Wounds, Detect Magic, Healing Word, Thunderwave")
    
    # Instruments
    for i, inst in enumerate(['lute', 'flute', 'drum']):
        suffix = '_final' if i == 2 else ''
        creator.apply_decision(f"choose_instrument_{inst}{suffix}")
    print(f"   Instruments: Lute, Flute, Drum")
    
    print(f"\n   Character valid: {creator.sheet['is_valid_sheet']}")
    
    # Level 2
    print("\n5. Leveling to Bard 2...")
    creator.apply_decision("choose_class_bard_level_2")
    print(f"   Jack of All Trades acquired")
    print(f"   Song of Rest: d{creator.sheet['song_of_rest_die']}")
    
    # Learn one more spell
    creator.apply_decision("choose_spells_bard_charm_person_final")
    print(f"   Learned: Charm Person")
    
    # Level 3
    print("\n6. Leveling to Bard 3...")
    print("\n5. Leveling to Bard 3...")
    creator.apply_decision("choose_class_bard_level_3")
    print(f"   Must choose Bard College")
    print(f"   Must choose Expertise (2 skills)")
    print(f"   Max spell level now: {creator.sheet['bard_max_spell_level']}")
    
    creator.apply_decision("choose_bard_college_college_of_lore_final")
    print(f"   Joined College of Lore")
    
    creator.apply_decision("choose_expertise_performance")
    creator.apply_decision("choose_expertise_persuasion_final")
    print(f"   Expertise in: Performance, Persuasion")
    
    # Learn another spell (from leveling up)
    creator.apply_decision("choose_spells_bard_invisibility_final")
    print(f"   Learned: Invisibility (2nd level spell)")
    
    # Final summary
    print("\n" + "="*60)
    print("FINAL CHARACTER")
    print("="*60)
    print(creator.get_summary())
    print(f"\nTotal spells known: {len(creator.sheet['spells_known'])}")
    print(f"Spell slots: {creator.sheet['spell_slots_1st']}×1st, {creator.sheet['spell_slots_2nd']}×2nd")


if __name__ == "__main__":
    create_barbarian()
    create_spellcaster()
