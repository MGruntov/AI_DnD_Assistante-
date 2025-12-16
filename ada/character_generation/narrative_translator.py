"""
Narrative-to-Mechanics Translation System.
Converts unstructured natural language character descriptions into valid D&D 5e character sheets.
"""

import json
from typing import Optional
from ada.character_generation.character_sheet import CharacterSheet
from ada.utils.llm_client import LLMClient


class NarrativeToMechanicsTranslator:
    """
    Translates natural language character descriptions into structured D&D 5e mechanics.
    Uses LLM to parse narrative input and generate valid character sheets.
    """
    
    SYSTEM_PROMPT = """You are an expert D&D 5e rules engine and character creation assistant.
Your task is to convert natural language character descriptions into valid D&D 5e character sheets.

Follow these D&D 5e rules strictly:
- Ability scores range from 1-30 (typically 3-18 for starting characters)
- Standard ability scores for starting characters use point buy or standard array
- Proficiency bonus is +2 at level 1, increasing by +1 every 4 levels
- Hit points start with class hit die + CON modifier at level 1
- Armor Class is 10 + DEX modifier + armor bonus
- Each class gets specific skill proficiencies (choose from class list)
- Starting equipment is based on class and background

Return ONLY a valid JSON object with the character sheet data. No additional text."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize the translator.
        
        Args:
            llm_client: Optional LLM client (creates default if not provided)
        """
        self.llm_client = llm_client or LLMClient()
    
    def translate(self, narrative_description: str) -> CharacterSheet:
        """
        Translate a narrative character description into a D&D 5e character sheet.
        
        Args:
            narrative_description: Natural language description of the character
            
        Returns:
            Complete CharacterSheet object with calculated mechanics
            
        Example:
            >>> translator = NarrativeToMechanicsTranslator()
            >>> narrative = "Create a brave human fighter named Thorin who is strong and tough"
            >>> character = translator.translate(narrative)
        """
        prompt = self._build_prompt(narrative_description)
        
        response = self.llm_client.generate_completion(
            prompt=prompt,
            system_message=self.SYSTEM_PROMPT,
            temperature=0.3,  # Lower temperature for more consistent rule application
            response_format={"type": "json_object"}
        )
        
        # Parse JSON response
        try:
            character_data = json.loads(response)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {e}")
        
        # Apply D&D 5e rules and calculations
        character_data = self._apply_game_rules(character_data)
        
        # Create and return character sheet
        return CharacterSheet(**character_data)
    
    def _build_prompt(self, narrative_description: str) -> str:
        """Build the LLM prompt from narrative description."""
        return f"""Convert this character description into a D&D 5e character sheet:

{narrative_description}

Generate a complete character sheet with:
- name, race, class, level, background, alignment
- ability_scores (strength, dexterity, constitution, intelligence, wisdom, charisma)
- skills (object with skill names as keys and boolean proficiency as values)
- equipment (weapons array, armor string, tools array, gear array)
- hit_points, armor_class, proficiency_bonus
- features array (class and racial features)
- spells array (if applicable)

Apply D&D 5e rules for ability score generation, skill proficiencies, starting equipment, 
hit points, and armor class calculations.

Return as JSON object."""
    
    def _apply_game_rules(self, character_data: dict) -> dict:
        """
        Apply D&D 5e game rules and perform calculations.
        
        Args:
            character_data: Raw character data from LLM
            
        Returns:
            Character data with proper calculations applied
        """
        # Ensure level is present
        level = character_data.get("level", 1)
        
        # Calculate proficiency bonus based on level
        proficiency_bonus = 2 + ((level - 1) // 4)
        character_data["proficiency_bonus"] = proficiency_bonus
        
        # Calculate ability modifiers
        ability_scores = character_data.get("ability_scores", {})
        
        # Calculate hit points if not provided
        if "hit_points" not in character_data or character_data["hit_points"] < 1:
            character_data["hit_points"] = self._calculate_hit_points(
                character_data.get("class", "Fighter"),
                level,
                ability_scores.get("constitution", 10)
            )
        
        # Calculate armor class if not provided
        if "armor_class" not in character_data or character_data["armor_class"] < 10:
            character_data["armor_class"] = self._calculate_armor_class(
                ability_scores.get("dexterity", 10),
                character_data.get("equipment", {}).get("armor")
            )
        
        return character_data
    
    def _calculate_hit_points(self, character_class: str, level: int, constitution: int) -> int:
        """Calculate hit points based on class, level, and constitution."""
        # Hit dice by class
        hit_dice = {
            "Barbarian": 12,
            "Fighter": 10,
            "Paladin": 10,
            "Ranger": 10,
            "Cleric": 8,
            "Druid": 8,
            "Monk": 8,
            "Rogue": 8,
            "Bard": 8,
            "Warlock": 8,
            "Sorcerer": 6,
            "Wizard": 6,
        }
        
        hit_die = hit_dice.get(character_class, 8)
        con_modifier = (constitution - 10) // 2
        
        # First level: max hit die + con modifier
        # Additional levels: average of hit die + con modifier
        if level == 1:
            return max(1, hit_die + con_modifier)
        else:
            first_level_hp = hit_die + con_modifier
            additional_hp = ((hit_die // 2) + 1 + con_modifier) * (level - 1)
            return max(level, first_level_hp + additional_hp)
    
    def _calculate_armor_class(self, dexterity: int, armor: Optional[str]) -> int:
        """Calculate armor class based on dexterity and armor."""
        dex_modifier = (dexterity - 10) // 2
        
        # Armor AC values (simplified)
        armor_values = {
            "Leather Armor": 11,
            "Studded Leather": 12,
            "Hide Armor": 12,
            "Chain Shirt": 13,
            "Scale Mail": 14,
            "Breastplate": 14,
            "Half Plate": 15,
            "Ring Mail": 14,
            "Chain Mail": 16,
            "Splint": 17,
            "Plate": 18,
        }
        
        if not armor:
            # No armor: 10 + DEX modifier
            return 10 + dex_modifier
        
        # Check if armor is in known armor types
        for armor_name, base_ac in armor_values.items():
            if armor_name.lower() in armor.lower():
                # Light armor: base + full DEX
                if armor_name in ["Leather Armor", "Studded Leather"]:
                    return base_ac + dex_modifier
                # Medium armor: base + DEX (max +2)
                elif armor_name in ["Hide Armor", "Chain Shirt", "Scale Mail", "Breastplate", "Half Plate"]:
                    return base_ac + min(2, dex_modifier)
                # Heavy armor: base only
                else:
                    return base_ac
        
        # Unknown armor, use base calculation
        return 10 + dex_modifier
