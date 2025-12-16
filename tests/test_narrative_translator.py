"""Tests for NarrativeToMechanicsTranslator."""

import pytest
from ada.character_generation.narrative_translator import NarrativeToMechanicsTranslator
from ada.character_generation.character_sheet import CharacterSheet


def test_translator_initialization():
    """Test translator can be initialized."""
    translator = NarrativeToMechanicsTranslator()
    assert translator is not None
    assert translator.llm_client is not None


def test_translate_basic_character():
    """Test translating a basic character description."""
    translator = NarrativeToMechanicsTranslator()
    
    narrative = """
    Create a human fighter named Thorin who is strong and tough.
    He wields a greatsword and wears chain mail.
    """
    
    character = translator.translate(narrative)
    
    assert isinstance(character, CharacterSheet)
    assert character.name is not None
    assert character.race is not None
    assert character.character_class is not None
    assert character.hit_points > 0
    assert character.armor_class >= 10


def test_proficiency_bonus_calculation():
    """Test proficiency bonus calculation by level."""
    translator = NarrativeToMechanicsTranslator()
    
    # Test different levels
    test_cases = [
        (1, 2),
        (4, 2),
        (5, 3),
        (8, 3),
        (9, 4),
        (12, 4),
        (13, 5),
    ]
    
    for level, expected_bonus in test_cases:
        data = {"level": level}
        result = translator._apply_game_rules(data)
        assert result["proficiency_bonus"] == expected_bonus


def test_hit_points_calculation():
    """Test hit points calculation."""
    translator = NarrativeToMechanicsTranslator()
    
    # Fighter with 14 CON (+2 modifier)
    hp = translator._calculate_hit_points("Fighter", 1, 14)
    assert hp == 12  # 10 (d10) + 2 (CON)
    
    # Wizard with 12 CON (+1 modifier)
    hp = translator._calculate_hit_points("Wizard", 1, 12)
    assert hp == 7  # 6 (d6) + 1 (CON)


def test_armor_class_calculation():
    """Test armor class calculation."""
    translator = NarrativeToMechanicsTranslator()
    
    # No armor, 14 DEX (+2)
    ac = translator._calculate_armor_class(14, None)
    assert ac == 12
    
    # Leather armor (11 base) + 3 DEX
    ac = translator._calculate_armor_class(16, "Leather Armor")
    assert ac == 14
    
    # Chain mail (16 base), DEX doesn't apply
    ac = translator._calculate_armor_class(16, "Chain Mail")
    assert ac == 16


def test_system_prompt_exists():
    """Test that system prompt is defined."""
    assert NarrativeToMechanicsTranslator.SYSTEM_PROMPT is not None
    assert "D&D 5e" in NarrativeToMechanicsTranslator.SYSTEM_PROMPT
