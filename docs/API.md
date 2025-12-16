# ADA API Documentation

Complete API reference for ADA (AI D&D Assistante).

## Table of Contents
- [Character Generation](#character-generation)
- [Journaling](#journaling)
- [Utilities](#utilities)

---

## Character Generation

### CharacterSheet

Complete D&D 5e character sheet data model.

#### Constructor

```python
CharacterSheet(
    name: str,
    race: str,
    character_class: str,
    level: int = 1,
    background: Optional[str] = None,
    alignment: Optional[str] = None,
    ability_scores: AbilityScores = AbilityScores(),
    skills: Skills = Skills(),
    equipment: Equipment = Equipment(),
    hit_points: int = 10,
    armor_class: int = 10,
    proficiency_bonus: int = 2,
    features: List[str] = [],
    spells: List[str] = []
)
```

#### Methods

**`calculate_skill_bonus(skill_name: str, ability: str) -> int`**

Calculate total skill bonus including proficiency.

```python
character.calculate_skill_bonus('athletics', 'strength')
# Returns: 5 (if STR mod +3 and proficient with +2 bonus)
```

**`to_summary() -> str`**

Generate human-readable character summary.

```python
summary = character.to_summary()
print(summary)
```

### AbilityScores

D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA).

#### Constructor

```python
AbilityScores(
    strength: int = 10,
    dexterity: int = 10,
    constitution: int = 10,
    intelligence: int = 10,
    wisdom: int = 10,
    charisma: int = 10
)
```

#### Methods

**`get_modifier(ability: str) -> int`**

Calculate ability modifier.

```python
scores = AbilityScores(strength=16)
modifier = scores.get_modifier('strength')  # Returns: +3
```

### NarrativeToMechanicsTranslator

Translates natural language character descriptions into D&D 5e character sheets.

#### Constructor

```python
NarrativeToMechanicsTranslator(llm_client: Optional[LLMClient] = None)
```

#### Methods

**`translate(narrative_description: str) -> CharacterSheet`**

Convert narrative description to character sheet.

```python
translator = NarrativeToMechanicsTranslator()

narrative = """
Create a strong dwarf fighter named Thorin who wields an axe.
He's tough and brave, skilled in athletics and intimidation.
"""

character = translator.translate(narrative)
```

**Parameters:**
- `narrative_description` (str): Natural language character description

**Returns:**
- `CharacterSheet`: Complete character with calculated mechanics

**Example Narrative Formats:**

```python
# Detailed description
narrative = """
I want to create an elf wizard named Elara. She's highly intelligent
and perceptive, with a noble background. She's proficient in arcana,
history, and investigation. She carries a staff and spellbook,
and knows magic missile, shield, and detect magic.
"""

# Concise description
narrative = "Make a strong human fighter with a greatsword"

# Class-focused description
narrative = """
Level 3 halfling rogue, very dexterous and charismatic.
Expert at stealth, sleight of hand, and deception.
Uses leather armor and dual daggers.
"""
```

---

## Journaling

### JournalEngine

AI-assisted journaling that transforms rough notes into polished narratives.

#### Constructor

```python
JournalEngine(llm_client: Optional[LLMClient] = None)
```

#### Methods

**`polish_entry(rough_notes: str, session_number: Optional[int] = None, additional_context: Optional[str] = None) -> JournalEntry`**

Transform rough gameplay notes into polished narrative.

```python
engine = JournalEngine()

rough_notes = """
Party fought goblins in cave.
Found treasure chest with 100gp.
Rescued prisoner who told us about dragon.
"""

entry = engine.polish_entry(rough_notes, session_number=1)

print(entry.title)
print(entry.content)
print(f"Characters: {', '.join(entry.characters)}")
```

**Parameters:**
- `rough_notes` (str): Raw gameplay notes
- `session_number` (int, optional): Session number for tracking
- `additional_context` (str, optional): Extra context to guide narrative

**Returns:**
- `JournalEntry`: Polished entry with structured data

**`summarize_campaign(entries: List[JournalEntry]) -> str`**

Generate campaign summary from multiple entries.

```python
engine = JournalEngine()

entries = [
    engine.polish_entry(session1_notes, session_number=1),
    engine.polish_entry(session2_notes, session_number=2),
    engine.polish_entry(session3_notes, session_number=3),
]

summary = engine.summarize_campaign(entries)
print(summary)
```

**Parameters:**
- `entries` (List[JournalEntry]): List of journal entries

**Returns:**
- `str`: Campaign summary text

### JournalEntry

Polished journal entry with structured information.

#### Constructor

```python
JournalEntry(
    title: str,
    content: str,
    session_number: Optional[int] = None,
    characters: List[str] = [],
    locations: List[str] = [],
    key_events: List[str] = []
)
```

#### Attributes

- `title` (str): Entry title
- `content` (str): Polished narrative content
- `session_number` (int, optional): Session number
- `characters` (List[str]): Characters mentioned
- `locations` (List[str]): Locations visited
- `key_events` (List[str]): Major events

---

## Utilities

### LLMClient

Client for interfacing with language models.

#### Constructor

```python
LLMClient(
    api_key: Optional[str] = None,
    model: str = "gpt-4",
    base_url: Optional[str] = None
)
```

**Parameters:**
- `api_key` (str, optional): OpenAI API key (defaults to OPENAI_API_KEY env var)
- `model` (str): Model to use (default: "gpt-4")
- `base_url` (str, optional): Custom API endpoint

#### Methods

**`generate_completion(prompt: str, system_message: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None, response_format: Optional[Dict[str, str]] = None) -> str`**

Generate completion from LLM.

```python
client = LLMClient(api_key="your-key")

response = client.generate_completion(
    prompt="Describe a fantasy tavern",
    system_message="You are a D&D narrator",
    temperature=0.8,
    max_tokens=200
)
```

**Parameters:**
- `prompt` (str): User prompt
- `system_message` (str, optional): System message
- `temperature` (float): Sampling temperature (0-2)
- `max_tokens` (int, optional): Maximum tokens to generate
- `response_format` (Dict, optional): Response format, e.g., {"type": "json_object"}

**Returns:**
- `str`: Generated text response

---

## Complete Examples

### Creating and Customizing Characters

```python
from ada import NarrativeToMechanicsTranslator, CharacterSheet, AbilityScores

# Method 1: From narrative
translator = NarrativeToMechanicsTranslator()
character = translator.translate("Create a wise elf cleric named Aiden")

# Method 2: Direct construction
character = CharacterSheet(
    name="Custom Character",
    race="Human",
    character_class="Fighter",
    level=5,
    ability_scores=AbilityScores(strength=18, constitution=16),
    hit_points=45,
    armor_class=18
)

# Access character data
print(f"Name: {character.name}")
print(f"HP: {character.hit_points}")
print(f"AC: {character.armor_class}")
print(f"STR Modifier: {character.ability_scores.get_modifier('strength')}")

# Calculate skill bonus
athletics_bonus = character.calculate_skill_bonus('athletics', 'strength')
print(f"Athletics: +{athletics_bonus}")

# Get full summary
print(character.to_summary())
```

### Managing Campaign Journal

```python
from ada import JournalEngine

engine = JournalEngine()

# Session 1
session1_notes = """
Met at tavern. Quest from merchant. 
Found goblin hideout. Battle ensued.
"""
entry1 = engine.polish_entry(session1_notes, session_number=1)

# Session 2 with context
session2_notes = """
Entered deeper caves. Found hobgoblin leader.
Negotiated for captured goods.
"""
entry2 = engine.polish_entry(
    session2_notes,
    session_number=2,
    additional_context="Party is trying to avoid combat"
)

# Access entry data
print(f"Title: {entry1.title}")
print(f"Content: {entry1.content}")
print(f"Characters: {entry1.characters}")
print(f"Locations: {entry1.locations}")
print(f"Events: {entry1.key_events}")

# Generate campaign overview
all_entries = [entry1, entry2]
campaign_summary = engine.summarize_campaign(all_entries)
print(campaign_summary)
```

### Custom LLM Configuration

```python
from ada import LLMClient, NarrativeToMechanicsTranslator, JournalEngine

# Custom OpenAI configuration
custom_llm = LLMClient(
    api_key="your-api-key",
    model="gpt-4-turbo-preview",
    base_url="https://custom-endpoint.com"
)

# Use with translator
translator = NarrativeToMechanicsTranslator(llm_client=custom_llm)
character = translator.translate("Create a druid character")

# Use with journal engine
engine = JournalEngine(llm_client=custom_llm)
entry = engine.polish_entry("Party explored ruins")
```

---

## Error Handling

```python
from ada import NarrativeToMechanicsTranslator
from pydantic import ValidationError

try:
    translator = NarrativeToMechanicsTranslator()
    character = translator.translate("Create a character")
except ValidationError as e:
    print(f"Invalid character data: {e}")
except ValueError as e:
    print(f"Translation error: {e}")
```

---

## Type Hints

ADA uses type hints throughout for better IDE support:

```python
from ada import CharacterSheet, JournalEntry
from ada.character_generation import AbilityScores
from typing import List

def process_character(char: CharacterSheet) -> str:
    """Process a character sheet."""
    return char.to_summary()

def collect_entries(notes: List[str]) -> List[JournalEntry]:
    """Collect journal entries."""
    from ada import JournalEngine
    engine = JournalEngine()
    return [engine.polish_entry(note) for note in notes]
```
