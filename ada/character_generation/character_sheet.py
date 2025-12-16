"""
D&D 5e Character Sheet data model.
Represents a complete character with ability scores, skills, and equipment.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class AbilityScores(BaseModel):
    """D&D 5e ability scores."""
    strength: int = Field(ge=1, le=30, default=10)
    dexterity: int = Field(ge=1, le=30, default=10)
    constitution: int = Field(ge=1, le=30, default=10)
    intelligence: int = Field(ge=1, le=30, default=10)
    wisdom: int = Field(ge=1, le=30, default=10)
    charisma: int = Field(ge=1, le=30, default=10)

    def get_modifier(self, ability: str) -> int:
        """Calculate ability modifier."""
        score = getattr(self, ability.lower())
        return (score - 10) // 2


class Skills(BaseModel):
    """D&D 5e skills with proficiency tracking."""
    acrobatics: bool = False
    animal_handling: bool = False
    arcana: bool = False
    athletics: bool = False
    deception: bool = False
    history: bool = False
    insight: bool = False
    intimidation: bool = False
    investigation: bool = False
    medicine: bool = False
    nature: bool = False
    perception: bool = False
    performance: bool = False
    persuasion: bool = False
    religion: bool = False
    sleight_of_hand: bool = False
    stealth: bool = False
    survival: bool = False


class Equipment(BaseModel):
    """Character equipment."""
    weapons: List[str] = Field(default_factory=list)
    armor: Optional[str] = None
    tools: List[str] = Field(default_factory=list)
    gear: List[str] = Field(default_factory=list)
    
    @field_validator('weapons', 'tools', 'gear', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Ensure fields are lists."""
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        return v


class CharacterSheet(BaseModel):
    """Complete D&D 5e character sheet."""
    name: str
    race: str
    character_class: str = Field(alias="class")
    level: int = Field(ge=1, le=20, default=1)
    background: Optional[str] = None
    alignment: Optional[str] = None
    
    ability_scores: AbilityScores = Field(default_factory=AbilityScores)
    skills: Skills = Field(default_factory=Skills)
    equipment: Equipment = Field(default_factory=Equipment)
    
    hit_points: int = Field(ge=1, default=10)
    armor_class: int = Field(ge=10, default=10)
    proficiency_bonus: int = Field(ge=2, default=2)
    
    features: List[str] = Field(default_factory=list)
    spells: List[str] = Field(default_factory=list)
    
    model_config = {"populate_by_name": True}

    def calculate_skill_bonus(self, skill_name: str, ability: str) -> int:
        """Calculate skill bonus including proficiency."""
        base_modifier = self.ability_scores.get_modifier(ability)
        is_proficient = getattr(self.skills, skill_name)
        
        if is_proficient:
            return base_modifier + self.proficiency_bonus
        return base_modifier

    def to_summary(self) -> str:
        """Generate a human-readable summary of the character sheet."""
        lines = [
            f"=== {self.name} ===",
            f"Race: {self.race} | Class: {self.character_class} | Level: {self.level}",
            f"Background: {self.background or 'None'} | Alignment: {self.alignment or 'None'}",
            "",
            "Ability Scores:",
            f"  STR: {self.ability_scores.strength} ({self.ability_scores.get_modifier('strength'):+d})",
            f"  DEX: {self.ability_scores.dexterity} ({self.ability_scores.get_modifier('dexterity'):+d})",
            f"  CON: {self.ability_scores.constitution} ({self.ability_scores.get_modifier('constitution'):+d})",
            f"  INT: {self.ability_scores.intelligence} ({self.ability_scores.get_modifier('intelligence'):+d})",
            f"  WIS: {self.ability_scores.wisdom} ({self.ability_scores.get_modifier('wisdom'):+d})",
            f"  CHA: {self.ability_scores.charisma} ({self.ability_scores.get_modifier('charisma'):+d})",
            "",
            f"HP: {self.hit_points} | AC: {self.armor_class} | Proficiency: +{self.proficiency_bonus}",
        ]
        
        # Add proficient skills
        proficient_skills = [skill for skill, prof in self.skills.model_dump().items() if prof]
        if proficient_skills:
            lines.append("")
            lines.append("Proficient Skills: " + ", ".join(proficient_skills))
        
        # Add equipment
        if self.equipment.weapons:
            lines.append("")
            lines.append("Weapons: " + ", ".join(self.equipment.weapons))
        if self.equipment.armor:
            lines.append(f"Armor: {self.equipment.armor}")
        if self.equipment.tools:
            lines.append("Tools: " + ", ".join(self.equipment.tools))
        if self.equipment.gear:
            lines.append("Gear: " + ", ".join(self.equipment.gear))
        
        # Add features
        if self.features:
            lines.append("")
            lines.append("Features: " + ", ".join(self.features))
        
        # Add spells
        if self.spells:
            lines.append("")
            lines.append("Spells: " + ", ".join(self.spells))
        
        return "\n".join(lines)
