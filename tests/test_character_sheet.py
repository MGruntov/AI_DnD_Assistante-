"""Tests for CharacterSheet data model."""

import pytest
from ada.character_generation.character_sheet import (
    CharacterSheet,
    AbilityScores,
    Skills,
    Equipment
)


def test_ability_scores_creation():
    """Test creating ability scores."""
    scores = AbilityScores(
        strength=16,
        dexterity=14,
        constitution=15,
        intelligence=10,
        wisdom=12,
        charisma=8
    )
    
    assert scores.strength == 16
    assert scores.get_modifier('strength') == 3
    assert scores.get_modifier('dexterity') == 2
    assert scores.get_modifier('intelligence') == 0
    assert scores.get_modifier('charisma') == -1


def test_character_sheet_creation():
    """Test creating a complete character sheet."""
    character = CharacterSheet(
        name="Test Character",
        race="Human",
        character_class="Fighter",
        level=1,
        ability_scores=AbilityScores(strength=16, constitution=14),
        hit_points=12,
        armor_class=16
    )
    
    assert character.name == "Test Character"
    assert character.race == "Human"
    assert character.character_class == "Fighter"
    assert character.level == 1
    assert character.hit_points == 12
    assert character.armor_class == 16


def test_character_sheet_with_class_alias():
    """Test that 'class' field alias works."""
    character = CharacterSheet(
        name="Test",
        race="Elf",
        **{"class": "Wizard"}
    )
    
    assert character.character_class == "Wizard"


def test_skill_bonus_calculation():
    """Test skill bonus calculation."""
    character = CharacterSheet(
        name="Test",
        race="Human",
        character_class="Rogue",
        ability_scores=AbilityScores(dexterity=16),
        proficiency_bonus=2
    )
    
    # Not proficient
    character.skills.acrobatics = False
    assert character.calculate_skill_bonus('acrobatics', 'dexterity') == 3
    
    # Proficient
    character.skills.acrobatics = True
    assert character.calculate_skill_bonus('acrobatics', 'dexterity') == 5


def test_equipment_validation():
    """Test equipment field validation."""
    equipment = Equipment(
        weapons=["Longsword", "Shortbow"],
        armor="Chain Mail",
        tools=["Thieves' Tools"],
        gear=["Rope", "Backpack"]
    )
    
    assert len(equipment.weapons) == 2
    assert equipment.armor == "Chain Mail"
    assert len(equipment.tools) == 1
    assert len(equipment.gear) == 2


def test_character_summary():
    """Test character summary generation."""
    character = CharacterSheet(
        name="Thorin",
        race="Dwarf",
        character_class="Fighter",
        level=3,
        background="Soldier",
        ability_scores=AbilityScores(strength=17, constitution=16),
        hit_points=30,
        armor_class=18,
        proficiency_bonus=2
    )
    
    summary = character.to_summary()
    
    assert "Thorin" in summary
    assert "Dwarf" in summary
    assert "Fighter" in summary
    assert "Level: 3" in summary
    assert "HP: 30" in summary
    assert "AC: 18" in summary
