# ADA Quick Start Guide

Get started with ADA (AI D&D Assistante) in minutes!

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/MGruntov/AI_DnD_Assistante-.git
cd AI_DnD_Assistante-
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

Or for development:
```bash
pip install -e .
```

### 3. Configure API Key (Optional)

For full functionality with real LLM:
```bash
export OPENAI_API_KEY='your-api-key-here'
```

Or create a `.env` file:
```bash
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

**Note**: ADA works without an API key using mock responses for testing!

## Basic Usage

### Character Creation

Create a D&D 5e character from natural language:

```python
from ada import NarrativeToMechanicsTranslator

# Initialize the translator
translator = NarrativeToMechanicsTranslator()

# Describe your character
narrative = """
Create a brave dwarf fighter named Thorin Ironforge.
He's incredibly strong and tough, wielding a greataxe.
He wears chain mail armor and is skilled in athletics,
intimidation, and survival from his soldier background.
"""

# Generate the character
character = translator.translate(narrative)

# Display the character sheet
print(character.to_summary())
```

**Output**:
```
=== Thorin Ironforge ===
Race: Dwarf | Class: Fighter | Level: 1
Background: Soldier | Alignment: Lawful Good

Ability Scores:
  STR: 17 (+3)
  DEX: 12 (+1)
  CON: 16 (+3)
  INT: 10 (+0)
  WIS: 13 (+1)
  CHA: 8 (-1)

HP: 13 | AC: 16 | Proficiency: +2

Proficient Skills: athletics, intimidation, survival

Weapons: Greataxe, Handaxe
Armor: Chain Mail
...
```

### AI-Assisted Journaling

Transform rough notes into polished narratives:

```python
from ada import JournalEngine

# Initialize the engine
engine = JournalEngine()

# Your rough session notes
notes = """
Party met at tavern. Merchant hired us to find missing caravan.
Tracked to goblin cave. Fought 5 goblins outside.
Found entrance. More goblins inside. Got 50gp treasure.
"""

# Polish the entry
entry = engine.polish_entry(notes, session_number=1)

# Display the polished entry
print(f"{entry.title}\n")
print(entry.content)
```

**Output**:
```
The Quest Begins

The evening sun cast long shadows through the windows of the 
Rusty Dragon tavern as our band of adventurers first gathered...
[Polished narrative continues]
```

## Quick Examples

### 1. Create Multiple Characters

```python
from ada import NarrativeToMechanicsTranslator

translator = NarrativeToMechanicsTranslator()

# Fighter
fighter = translator.translate(
    "Strong human fighter with greatsword and plate armor"
)

# Wizard
wizard = translator.translate(
    "Intelligent elf wizard who knows fireball and magic missile"
)

# Rogue
rogue = translator.translate(
    "Sneaky halfling rogue with daggers and leather armor"
)

# Print all characters
for char in [fighter, wizard, rogue]:
    print(char.to_summary())
    print("\n" + "="*60 + "\n")
```

### 2. Track Campaign Sessions

```python
from ada import JournalEngine

engine = JournalEngine()
entries = []

# Session 1
entries.append(engine.polish_entry(
    "Party formed. Accepted quest. Traveled to ruins.",
    session_number=1
))

# Session 2
entries.append(engine.polish_entry(
    "Explored ruins. Fought skeletons. Found magic sword.",
    session_number=2
))

# Session 3
entries.append(engine.polish_entry(
    "Defeated necromancer. Saved village. Received reward.",
    session_number=3
))

# Generate campaign summary
summary = engine.summarize_campaign(entries)
print("Campaign Summary:")
print(summary)
```

### 3. Custom Character Details

```python
from ada import CharacterSheet, AbilityScores

# Create character directly
character = CharacterSheet(
    name="Custom Hero",
    race="Human",
    character_class="Paladin",
    level=5,
    ability_scores=AbilityScores(
        strength=18,
        constitution=16,
        charisma=14
    ),
    hit_points=45,
    armor_class=18
)

# Calculate skill bonuses
athletics = character.calculate_skill_bonus('athletics', 'strength')
print(f"Athletics: +{athletics}")
```

## Run Example Scripts

Try the included examples:

```bash
# Character creation examples
python examples/character_creation_example.py

# Journaling examples
python examples/journaling_example.py
```

## Testing

Run the test suite:

```bash
# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run specific test file
pytest tests/test_character_sheet.py
```

## Common Use Cases

### 1. Quick Character Generation

```python
from ada import NarrativeToMechanicsTranslator

translator = NarrativeToMechanicsTranslator()

# Quick generation
character = translator.translate("Level 3 elf ranger")
print(character.to_summary())
```

### 2. Session Note Processing

```python
from ada import JournalEngine

engine = JournalEngine()

# Process quick notes
entry = engine.polish_entry(
    "Fought dragon. Won. Got treasure.",
    session_number=10,
    additional_context="Epic final battle of campaign"
)
print(entry.content)
```

### 3. Character Inspection

```python
# Access character attributes
print(f"Name: {character.name}")
print(f"HP: {character.hit_points}")
print(f"AC: {character.armor_class}")
print(f"Level: {character.level}")

# Check ability modifiers
str_mod = character.ability_scores.get_modifier('strength')
print(f"Strength: {character.ability_scores.strength} ({str_mod:+d})")

# List equipment
print("Weapons:", ", ".join(character.equipment.weapons))
print("Armor:", character.equipment.armor)
```

## Tips for Best Results

### Character Generation
- **Be specific**: Include class, race, and key traits
- **Mention equipment**: Specify weapons and armor
- **Include background**: Reference character history
- **List skills**: Mention proficiencies explicitly
- **Add personality**: Describe character traits

**Good Example**:
```python
"Create a wise half-elf cleric of the light domain named Aiden.
He's intelligent and perceptive, with a sage background.
He wears scale mail and carries a mace and shield.
Proficient in medicine, religion, insight, and history."
```

### Journaling
- **Include key events**: List major happenings
- **Mention NPCs**: Name important characters
- **Note locations**: Specify places visited
- **Add outcomes**: Include results of actions
- **Track loot**: Mention treasure found

**Good Example**:
```python
"Party explored the Temple of Shadows in Darkwood Forest.
Met the guardian spirit Althea. Solved three riddles.
Defeated shadow monsters. Found the Amulet of Light.
Thorin leveled up to 5. Returned to Oakshire village."
```

## Troubleshooting

### No API Key
If you see mock responses, either:
1. Set `OPENAI_API_KEY` environment variable
2. Pass API key to `LLMClient` directly

```python
from ada.utils import LLMClient
from ada import NarrativeToMechanicsTranslator

llm = LLMClient(api_key="your-key")
translator = NarrativeToMechanicsTranslator(llm_client=llm)
```

### Import Errors
Ensure ADA is installed:
```bash
pip install -e .
```

### Test Failures
Check Python version (requires 3.8+):
```bash
python --version
```

## Next Steps

- Read the [API Documentation](docs/API.md)
- Explore [Architecture Details](ARCHITECTURE.md)
- Check the [README](README.md) for more features
- Join the community and contribute!

## Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `docs/` directory
- **Examples**: Review `examples/` directory

---

**Happy adventuring with ADA!** 🎲✨
