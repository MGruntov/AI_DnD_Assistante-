"""Comprehensive tests for the character creation system."""
import json
import sys
from pathlib import Path

from character_creator import CharacterCreator


class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def test(self, name, func):
        """Register and run a test."""
        print(f"\n{'='*60}")
        print(f"TEST: {name}")
        print('='*60)
        try:
            func()
            print(f"✓ PASSED")
            self.passed += 1
            self.tests.append((name, True, None))
        except AssertionError as e:
            print(f"✗ FAILED: {e}")
            self.failed += 1
            self.tests.append((name, False, str(e)))
        except Exception as e:
            print(f"✗ ERROR: {e}")
            self.failed += 1
            self.tests.append((name, False, f"Exception: {e}"))
    
    def summary(self):
        """Print test summary."""
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print('='*60)
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Total:  {self.passed + self.failed}")
        
        if self.failed > 0:
            print(f"\nFailed tests:")
            for name, passed, error in self.tests:
                if not passed:
                    print(f"  - {name}: {error}")
        
        return self.failed == 0


def apply_choice(creator, base_id, is_final=False):
    """Helper to apply a choice, automatically handling _final suffix."""
    if is_final:
        action_id = f"{base_id}_final"
    else:
        action_id = base_id
    
    # Check if this action exists
    if action_id not in [d['id'] for d in creator.decisions]:
        # Try without _final
        if is_final and base_id in [d['id'] for d in creator.decisions]:
            action_id = base_id
    
    creator.apply_decision(action_id)


def assign_ability_scores(creator, priority_order=None):
    """Helper to assign ability scores using standard array (15, 14, 13, 12, 10, 8).
    
    Args:
        creator: CharacterCreator instance
        priority_order: List of ability names in order of priority (highest to lowest)
                       Default is ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    """
    if priority_order is None:
        priority_order = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    
    standard_array = [15, 14, 13, 12, 10, 8]
    
    for i, ability in enumerate(priority_order):
        action_id = f"assign_ability_scores_pick_{i}_set_{ability}"
        creator.apply_decision(action_id)


def test_barbarian_progression():
    """Test creating a barbarian from level 1 to 5."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first (Barbarian priorities: STR, CON)
    assign_ability_scores(creator, ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'])
    assert creator.sheet["strength_score"] == 15
    assert creator.sheet["constitution_score"] == 14
    
    # Choose race first
    creator.apply_decision("choose_Human")
    assert creator.sheet["has_race"] == True
    assert creator.sheet["race"] == "Human"
    
    # Take Barbarian level 1
    creator.apply_decision("choose_class_barbarian_level_1")
    assert creator.sheet["class_barbarian_level"] == 1
    assert creator.sheet["hit_die_size"] == 12
    assert creator.sheet["rages_per_long_rest"] == 2
    assert creator.sheet["rage_damage_bonus"] == 2
    assert "Rage" in creator.sheet["feature_entries"]
    assert "Unarmored Defense" in creator.sheet["feature_entries"]
    
    # Should have 2 skills to choose
    assert creator.sheet["skills_to_choose"] == 2
    assert creator.sheet["is_valid_sheet"] == False
    
    # Choose 2 skills - first one is not final, second one is
    creator.apply_decision("choose_skill_athletics")
    assert "Athletics" in creator.sheet["proficiencies"]
    assert creator.sheet["skills_to_choose"] == 1
    creator.apply_decision("choose_skill_intimidation_final")
    assert "Intimidation" in creator.sheet["proficiencies"]
    assert creator.sheet["skills_to_choose"] == 0
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 2
    creator.apply_decision("choose_class_barbarian_level_2")
    assert creator.sheet["class_barbarian_level"] == 2
    assert "Reckless Attack" in creator.sheet["feature_entries"]
    assert "Danger Sense" in creator.sheet["feature_entries"]
    
    # Level 3 - choose primal path
    creator.apply_decision("choose_class_barbarian_level_3")
    assert creator.sheet["class_barbarian_level"] == 3
    assert creator.sheet["barbarian_primal_path_to_choose"] == 1
    assert creator.sheet["rages_per_long_rest"] == 3
    assert creator.sheet["is_valid_sheet"] == False
    
    creator.apply_decision("choose_barbarian_primal_path_path_of_the_berserker_final")
    assert "Path of the Berserker" in creator.sheet["feature_entries"]
    assert creator.sheet["barbarian_primal_path_to_choose"] == 0
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 4 - ASI
    creator.apply_decision("choose_class_barbarian_level_4")
    assert creator.sheet["class_barbarian_level"] == 4
    assert creator.sheet["asi_to_choose"] == 1
    assert creator.sheet["is_valid_sheet"] == False
    
    creator.apply_decision("choose_asi_strength_strength_final")
    assert creator.sheet["strength_score"] == 17  # Was 15, +2 from ASI
    assert creator.sheet["asi_to_choose"] == 0
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 5
    creator.apply_decision("choose_class_barbarian_level_5")
    assert creator.sheet["class_barbarian_level"] == 5
    assert "Extra Attack" in creator.sheet["feature_entries"]
    assert "Fast Movement" in creator.sheet["feature_entries"]
    assert creator.sheet["extra_attacks"] == 2
    assert creator.sheet["speed_bonus"] == 10
    
    print(f"Final barbarian level: {creator.sheet['class_barbarian_level']}")
    print(f"Final features: {creator.sheet['feature_entries']}")


def test_bard_progression():
    """Test creating a bard from level 1 to 5."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first (Bard priorities: CHA, DEX)
    assign_ability_scores(creator, ['charisma', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'strength'])
    assert creator.sheet["charisma_score"] == 15
    assert creator.sheet["dexterity_score"] == 14
    
    # Choose race
    creator.apply_decision("choose_Human")
    
    # Bard level 1
    creator.apply_decision("choose_class_bard_level_1")
    assert creator.sheet["class_bard_level"] == 1
    assert creator.sheet["hit_die_size"] == 8
    assert creator.sheet["bardic_inspiration_die"] == 6
    assert creator.sheet["bard_spells_to_choose"] == 4
    assert creator.sheet["cantrips_to_choose"] == 2
    assert creator.sheet["instruments_to_choose"] == 3
    assert creator.sheet["spell_slots_1st"] == 2
    assert creator.sheet["spellcasting_ability"] == "charisma"
    
    # Choose skills
    creator.apply_decision("choose_skill_performance")
    creator.apply_decision("choose_skill_persuasion")
    creator.apply_decision("choose_skill_deception_final")
    assert creator.sheet["skills_to_choose"] == 0
    
    # Choose cantrips
    creator.apply_decision("choose_bard_cantrip_light")
    creator.apply_decision("choose_bard_cantrip_mage_hand_final")
    assert "Light" in creator.sheet["cantrips_known"]
    assert "Mage Hand" in creator.sheet["cantrips_known"]
    
    # Choose spells
    creator.apply_decision("choose_spells_bard_cure_wounds")
    creator.apply_decision("choose_spells_bard_detect_magic")
    creator.apply_decision("choose_spells_bard_healing_word")
    creator.apply_decision("choose_spells_bard_thunderwave_final")
    assert creator.sheet["bard_spells_to_choose"] == 0
    
    # Choose instruments
    creator.apply_decision("choose_instrument_lute")
    creator.apply_decision("choose_instrument_flute")
    creator.apply_decision("choose_instrument_drum_final")
    assert creator.sheet["instruments_to_choose"] == 0
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 2
    creator.apply_decision("choose_class_bard_level_2")
    assert creator.sheet["class_bard_level"] == 2
    assert "Jack of All Trades" in creator.sheet["feature_entries"]
    assert creator.sheet["song_of_rest_die"] == 6
    assert creator.sheet["spell_slots_1st"] == 3
    
    # Bard level 2 adds 1 more spell to learn
    assert creator.sheet["bard_spells_to_choose"] == 1
    creator.apply_decision("choose_spells_bard_charm_person_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 3 - College and Expertise
    creator.apply_decision("choose_class_bard_level_3")
    assert creator.sheet["class_bard_level"] == 3
    assert creator.sheet["bard_college_to_choose"] == 1
    assert creator.sheet["expertise_to_choose"] == 2
    assert creator.sheet["bard_max_spell_level"] == 2
    assert creator.sheet["spell_slots_2nd"] == 2
    
    creator.apply_decision("choose_bard_college_college_of_lore_final")
    assert "College of Lore" in creator.sheet["feature_entries"]
    
    creator.apply_decision("choose_expertise_performance")
    creator.apply_decision("choose_expertise_persuasion_final")
    assert creator.sheet["expertise_to_choose"] == 0
    
    # Choose another spell (gained at level 3)
    creator.apply_decision("choose_spells_bard_invisibility_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 4
    creator.apply_decision("choose_class_bard_level_4")
    assert creator.sheet["class_bard_level"] == 4
    assert creator.sheet["asi_to_choose"] == 1
    
    # Choose ASI and additional cantrip/spell
    creator.apply_decision("choose_asi_charisma_charisma")
    creator.apply_decision("choose_bard_cantrip_minor_illusion")
    creator.apply_decision("choose_spells_bard_shatter_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 5
    creator.apply_decision("choose_class_bard_level_5")
    assert creator.sheet["class_bard_level"] == 5
    assert creator.sheet["bardic_inspiration_die"] == 8
    assert "Font of Inspiration" in creator.sheet["feature_entries"]
    assert creator.sheet["bard_max_spell_level"] == 3
    assert creator.sheet["spell_slots_3rd"] == 2
    
    # Choose final spell
    creator.apply_decision("choose_spells_bard_dispel_magic_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    print(f"Final bard level: {creator.sheet['class_bard_level']}")
    print(f"Bardic Inspiration: d{creator.sheet['bardic_inspiration_die']}")


def test_cleric_with_domain():
    """Test creating a cleric with Life domain."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first (Cleric priorities: WIS, CON)
    assign_ability_scores(creator, ['wisdom', 'constitution', 'strength', 'dexterity', 'charisma', 'intelligence'])
    assert creator.sheet["wisdom_score"] == 15
    
    # Choose race
    creator.apply_decision("choose_Human")
    
    # Cleric level 1
    creator.apply_decision("choose_class_cleric_level_1")
    assert creator.sheet["class_cleric_level"] == 1
    assert creator.sheet["divine_domain_to_choose"] == 1
    assert creator.sheet["cleric_spells_to_choose"] == 6
    assert creator.sheet["cantrips_to_choose"] == 3
    assert creator.sheet["spellcasting_ability"] == "wisdom"
    
    # Choose skills
    creator.apply_decision("choose_skill_insight")
    creator.apply_decision("choose_skill_religion_final")
    
    # Choose cantrips
    creator.apply_decision("choose_cleric_cantrip_guidance")
    creator.apply_decision("choose_cleric_cantrip_sacred_flame")
    creator.apply_decision("choose_cleric_cantrip_light_final")
    
    # Choose domain - Life
    creator.apply_decision("choose_divine_domain_life_final")
    assert "Life" in creator.sheet["feature_entries"]
    assert creator.sheet["life"] == True
    
    # Choose prepared spells (6 spells at level 1)
    creator.apply_decision("choose_spells_cleric_bless")
    creator.apply_decision("choose_spells_cleric_cure_wounds")
    creator.apply_decision("choose_spells_cleric_healing_word")
    creator.apply_decision("choose_spells_cleric_shield_of_faith")
    creator.apply_decision("choose_spells_cleric_guiding_bolt")
    creator.apply_decision("choose_spells_cleric_sanctuary_final")
    
    assert creator.sheet["is_valid_sheet"] == True
    
    # Apply Life domain bonus (heavy armor + Disciple of Life)
    creator.apply_decision("life_domain_level_1_bonus")
    assert "Armor(Heavy)" in creator.sheet["proficiencies"]
    assert "Disciple of Life" in creator.sheet["feature_entries"]
    assert creator.sheet["disciple_of_life"] == True
    
    # Level 2
    creator.apply_decision("choose_class_cleric_level_2")
    assert creator.sheet["class_cleric_level"] == 2
    assert "Channel Divinity" in creator.sheet["feature_entries"]
    assert "Turn Undead" in creator.sheet["feature_entries"]
    assert creator.sheet["channel_divinity_uses"] == 1
    
    # Choose additional prepared spell (level 2 doesn't increase max spell level - still 1st level only)
    creator.apply_decision("choose_spells_cleric_detect_evil_and_good_final")
    
    # Apply Life domain level 2 feature
    creator.apply_decision("life_domain_level_2_channel_divinity")
    assert "Channel Divinity: Preserve Life" in creator.sheet["feature_entries"]
    assert creator.sheet["channel_divinity_preserve_life"] == True
    
    print(f"Final cleric level: {creator.sheet['class_cleric_level']}")
    print(f"Domain features: {[f for f in creator.sheet['feature_entries'] if 'Life' in f or 'Preserve' in f]}")


def test_fighter_progression():
    """Test creating a fighter."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first (Fighter priorities: STR, CON)
    assign_ability_scores(creator, ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'])
    assert creator.sheet["strength_score"] == 15
    
    # Choose race
    creator.apply_decision("choose_Human")
    
    # Fighter level 1
    creator.apply_decision("choose_class_fighter_level_1")
    assert creator.sheet["class_fighter_level"] == 1
    assert creator.sheet["hit_die_size"] == 10
    assert creator.sheet["fighting_style_to_choose"] == 1
    assert creator.sheet["fighter_equip_choices_to_choose"] == 4
    
    # Choose skills
    creator.apply_decision("choose_skill_athletics")
    creator.apply_decision("choose_skill_intimidation_final")
    
    # Choose fighting style
    creator.apply_decision("choose_fighting_style_defense_final")
    assert "Defense" in creator.sheet["feature_entries"]
    
    # Choose equipment (note: using semicolons as in the ID)
    creator.apply_decision("choose_fighter_equipment_chain_mail")
    creator.apply_decision("choose_fighter_equipment_martial_weapon;shield")
    creator.apply_decision("choose_fighter_equipment_light_crossbow;bolts(20)")
    creator.apply_decision("choose_fighter_equipment_dungeoneers_pack_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 2
    creator.apply_decision("choose_class_fighter_level_2")
    assert creator.sheet["class_fighter_level"] == 2
    assert "Action Surge" in creator.sheet["feature_entries"]
    assert creator.sheet["action_surge_uses"] == 1
    
    # Level 3 - Martial Archetype
    creator.apply_decision("choose_class_fighter_level_3")
    assert creator.sheet["class_fighter_level"] == 3
    assert creator.sheet["fighter_archetype_to_choose"] == 1
    
    creator.apply_decision("choose_fighter_archetype_champion_final")
    assert "Champion" in creator.sheet["feature_entries"]
    
    # Level 4 - ASI
    creator.apply_decision("choose_class_fighter_level_4")
    assert creator.sheet["asi_to_choose"] == 1
    
    creator.apply_decision("choose_asi_strength_constitution_final")
    assert creator.sheet["is_valid_sheet"] == True
    
    # Level 5
    creator.apply_decision("choose_class_fighter_level_5")
    assert creator.sheet["class_fighter_level"] == 5
    assert "Extra Attack" in creator.sheet["feature_entries"]
    assert creator.sheet["extra_attacks"] == 2
    
    print(f"Final fighter level: {creator.sheet['class_fighter_level']}")
    print(f"Fighting style: Defense")


def test_race_with_subrace():
    """Test choosing a race with a subrace."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first
    assign_ability_scores(creator)
    
    # Choose dwarf (should not set has_race yet)
    creator.apply_decision("choose_race_Dwarf")
    assert creator.sheet["race"] == "Dwarf"
    assert creator.sheet["has_race"] == False  # Not complete until subrace chosen
    assert creator.sheet["constitution_bonus"] == 2
    assert "Common" in creator.sheet["languages"]
    assert "Dwarvish" in creator.sheet["languages"]
    
    # Choose Hill Dwarf subrace
    creator.apply_decision("choose_sub_race_HillDwarf")
    assert creator.sheet["has_race"] == True  # Now complete
    assert creator.sheet["wisdom_bonus"] == 1
    assert "DwarvenToughness" in creator.sheet["feature_entries"]
    
    print(f"Race: {creator.sheet['race']}")
    print(f"Constitution bonus: +{creator.sheet['constitution_bonus']}")
    print(f"Wisdom bonus: +{creator.sheet['wisdom_bonus']}")


def test_validation_system():
    """Test that validation prevents taking actions when choices are pending."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first
    assign_ability_scores(creator)
    
    # Choose race
    creator.apply_decision("choose_Human")
    
    # Take barbarian level 1 - this sets is_valid_sheet to False
    creator.apply_decision("choose_class_barbarian_level_1")
    assert creator.sheet["is_valid_sheet"] == False
    assert creator.sheet["skills_to_choose"] == 2
    
    # Try to take level 2 - should fail because sheet is invalid
    try:
        creator.apply_decision("choose_class_barbarian_level_2")
        raise AssertionError("Should have raised error for invalid sheet")
    except Exception as e:
        if "Should have raised error" in str(e):
            raise
        # Expected error - preconditions not satisfied
        assert "Preconditions not satisfied" in str(e) or "invalid" in str(e).lower()
        print(f"Correctly prevented level up: {e}")
    
    # Complete skill choices
    creator.apply_decision("choose_skill_athletics")
    assert creator.sheet["is_valid_sheet"] == False  # Still invalid
    creator.apply_decision("choose_skill_perception_final")
    assert creator.sheet["is_valid_sheet"] == True  # Now valid
    
    # Now level 2 should work
    creator.apply_decision("choose_class_barbarian_level_2")
    assert creator.sheet["class_barbarian_level"] == 2
    
    print("Validation system working correctly")


def test_spell_level_constraints():
    """Test that spells are only available at appropriate levels."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first
    assign_ability_scores(creator, ['charisma', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'strength'])
    
    # Setup bard
    creator.apply_decision("choose_Human")
    creator.apply_decision("choose_class_bard_level_1")
    
    # Complete required choices quickly
    for skill in ['performance', 'persuasion', 'deception']:
        action_id = f"choose_skill_{skill}_final" if skill == 'deception' else f"choose_skill_{skill}"
        creator.apply_decision(action_id)
    
    for cantrip in ['light', 'mage_hand']:
        action_id = f"choose_bard_cantrip_{cantrip}_final" if cantrip == 'mage_hand' else f"choose_bard_cantrip_{cantrip}"
        creator.apply_decision(action_id)
    
    for instrument in ['lute', 'flute', 'drum']:
        action_id = f"choose_instrument_{instrument}_final" if instrument == 'drum' else f"choose_instrument_{instrument}"
        creator.apply_decision(action_id)
    
    # At level 1, max spell level is 1
    assert creator.sheet["bard_max_spell_level"] == 1
    
    # Should be able to choose level 1 spells
    available_ids = [d['id'] for d in creator.available_decisions()]
    assert "choose_spells_bard_cure_wounds" in available_ids
    
    # Should NOT be able to choose level 2 spells
    assert "choose_spells_bard_invisibility" not in available_ids
    
    # Choose level 1 spells
    for spell in ['cure_wounds', 'detect_magic', 'healing_word', 'thunderwave']:
        action_id = f"choose_spells_bard_{spell}_final" if spell == 'thunderwave' else f"choose_spells_bard_{spell}"
        creator.apply_decision(action_id)
    
    # Level up to 3 where we get level 2 spells
    creator.apply_decision("choose_class_bard_level_2")
    creator.apply_decision("choose_spells_bard_charm_person_final")
    creator.apply_decision("choose_class_bard_level_3")
    
    # Now max spell level is 2
    assert creator.sheet["bard_max_spell_level"] == 2
    
    # Now level 2 spells should be available
    available_ids = [d['id'] for d in creator.available_decisions()]
    assert "choose_spells_bard_invisibility" in available_ids
    assert "choose_spells_bard_hold_person" in available_ids
    
    # But not level 3 spells
    assert "choose_spells_bard_dispel_magic" not in available_ids
    
    print("Spell level constraints working correctly")


def test_asi_combinations():
    """Test that ASI provides correct ability score combinations."""
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    # Assign ability scores first
    assign_ability_scores(creator, ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
    
    # Setup to get ASI
    creator.apply_decision("choose_Human")
    creator.apply_decision("choose_class_fighter_level_1")
    
    # Complete required choices
    creator.apply_decision("choose_skill_athletics")
    creator.apply_decision("choose_skill_perception_final")
    creator.apply_decision("choose_fighting_style_defense_final")
    
    # Choose fighter equipment - use actual IDs from JSON
    creator.apply_decision("choose_fighter_equipment_chain_mail")
    creator.apply_decision("choose_fighter_equipment_martial_weapon;shield")
    creator.apply_decision("choose_fighter_equipment_light_crossbow;bolts(20)")
    creator.apply_decision("choose_fighter_equipment_dungeoneers_pack_final")
    
    creator.apply_decision("choose_class_fighter_level_2")
    creator.apply_decision("choose_class_fighter_level_3")
    creator.apply_decision("choose_fighter_archetype_champion_final")
    creator.apply_decision("choose_class_fighter_level_4")
    
    # Should have asi_to_choose = 1
    assert creator.sheet["asi_to_choose"] == 1
    
    # Check that various ASI options are available
    available_ids = [d['id'] for d in creator.available_decisions()]
    
    # Same ability twice (e.g., Strength +2)
    assert "choose_asi_strength_strength_final" in available_ids
    
    # Two different abilities (e.g., Strength +1, Dexterity +1)
    assert "choose_asi_strength_dexterity_final" in available_ids
    assert "choose_asi_dexterity_constitution_final" in available_ids
    
    # Choose Strength +2
    initial_str = creator.sheet["strength_score"]
    creator.apply_decision("choose_asi_strength_strength_final")
    assert creator.sheet["strength_score"] == initial_str + 2
    assert creator.sheet["asi_to_choose"] == 0
    assert creator.sheet["is_valid_sheet"] == True
    
    print("ASI combinations working correctly")


def main():
    """Run all tests."""
    runner = TestRunner()
    
    runner.test("Barbarian Level 1-5 Progression", test_barbarian_progression)
    runner.test("Bard Level 1-5 Progression", test_bard_progression)
    runner.test("Cleric with Life Domain", test_cleric_with_domain)
    runner.test("Fighter Progression", test_fighter_progression)
    runner.test("Race with Subrace Selection", test_race_with_subrace)
    runner.test("Validation System", test_validation_system)
    runner.test("Spell Level Constraints", test_spell_level_constraints)
    runner.test("ASI Combinations", test_asi_combinations)
    
    success = runner.summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
