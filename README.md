# ADA - AI D&D Assistante

**ADA** (AI D&D Assistante) is a specialized LLM-powered system that utilizes a hybrid architecture to revolutionize D&D 5e gameplay through intelligent automation and narrative enhancement.

## 🎯 Core Features

### 1. Narrative-to-Mechanics Translation
ADA's flagship feature automatically converts natural language character descriptions into complete, valid D&D 5e character sheets. No more menu-driven workflows or manual calculations!

**Key Capabilities:**
- 🎲 **Automatic Ability Score Generation**: Intelligently assigns ability scores based on character descriptions
- ⚔️ **Skill Proficiency Assignment**: Determines appropriate skill proficiencies from character background
- 🛡️ **Equipment Selection**: Generates appropriate starting equipment based on class and background
- 📊 **Automatic Calculations**: Computes hit points, armor class, proficiency bonuses, and modifiers
- 🎭 **Class & Race Features**: Includes relevant racial traits and class features
- ✨ **Spell Selection**: Assigns appropriate spells for spellcasting classes

**Example:**
```python
from ada import NarrativeToMechanicsTranslator

translator = NarrativeToMechanicsTranslator()
character = translator.translate("""
    Create a brave human fighter named Thorin who is strong and tough.
    He wields a greatsword and wears chain mail armor.
""")

print(character.to_summary())
```

### 2. AI-Assisted Journaling Engine
Transform rough gameplay notes into beautifully polished narrative entries that capture the epic feel of your adventure.

**Key Capabilities:**
- 📝 **Narrative Enhancement**: Transforms bullet points into engaging prose
- 🏰 **Context Awareness**: Maintains D&D fantasy atmosphere and tone
- 🔍 **Automatic Extraction**: Identifies characters, locations, and key events
- 📖 **Campaign Summaries**: Generates overviews from multiple sessions
- ⏱️ **Session Tracking**: Organizes entries by session number

**Example:**
```python
from ada import JournalEngine

engine = JournalEngine()
entry = engine.polish_entry("""
    Party fought goblins in cave. Found treasure. 
    Rescued merchant's caravan.
""", session_number=1)

print(entry.title)
print(entry.content)
```

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- OpenAI API key (optional for testing with mock responses)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/MGruntov/AI_DnD_Assistante-.git
cd AI_DnD_Assistante-
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Or install in development mode:
```bash
pip install -e .
```

3. Configure API key (optional):
```bash
export OPENAI_API_KEY='your-api-key-here'
```

Or create a `.env` file:
```
OPENAI_API_KEY=your-api-key-here
```

## 📚 Usage

### Character Creation from Narrative

```python
from ada.character_generation import NarrativeToMechanicsTranslator

# Initialize the translator
translator = NarrativeToMechanicsTranslator()

# Describe your character in natural language
narrative = """
I want to create an elf wizard named Elara Moonwhisper. 
She's highly intelligent and comes from a noble background.
She's proficient in arcana, history, and investigation.
She carries a staff and spellbook, and knows magic missile and shield.
"""

# Generate the character sheet
character = translator.translate(narrative)

# Display the complete character sheet
print(character.to_summary())

# Access specific attributes
print(f"Hit Points: {character.hit_points}")
print(f"Armor Class: {character.armor_class}")
print(f"Intelligence Modifier: {character.ability_scores.get_modifier('intelligence')}")
```

### AI-Assisted Journaling

```python
from ada.journaling import JournalEngine

# Initialize the engine
engine = JournalEngine()

# Your rough gameplay notes
rough_notes = """
Party entered ancient ruins. Found trapped hallway.
Pippin disarmed trap. Fought skeleton guardians.
Discovered magical sword in treasure room.
Decided to return to town to rest.
"""

# Generate polished entry
entry = engine.polish_entry(rough_notes, session_number=3)

# Display the polished entry
print(f"Title: {entry.title}")
print(f"\n{entry.content}")
print(f"\nCharacters: {', '.join(entry.characters)}")
print(f"Locations: {', '.join(entry.locations)}")
```

### Campaign Summaries

```python
from ada.journaling import JournalEngine

engine = JournalEngine()

# Create multiple entries
entries = [
    engine.polish_entry("Session 1 notes...", session_number=1),
    engine.polish_entry("Session 2 notes...", session_number=2),
    engine.polish_entry("Session 3 notes...", session_number=3),
]

# Generate campaign summary
summary = engine.summarize_campaign(entries)
print(summary)
```

## 🎮 Examples

Run the included examples to see ADA in action:

```bash
# Character creation examples
python examples/character_creation_example.py

# Journaling examples
python examples/journaling_example.py
```

## 🏗️ Architecture

ADA uses a hybrid architecture combining:

1. **LLM Layer**: Specialized language models for natural language understanding
2. **Rules Engine**: D&D 5e rules implementation for validation and calculations
3. **Data Models**: Pydantic-based structured representations of game mechanics

### Project Structure

```
ada/
├── __init__.py
├── character_generation/
│   ├── __init__.py
│   ├── character_sheet.py       # D&D 5e data models
│   └── narrative_translator.py  # Narrative-to-mechanics system
├── journaling/
│   ├── __init__.py
│   └── journal_engine.py        # AI-assisted journaling
└── utils/
    ├── __init__.py
    └── llm_client.py            # LLM integration layer
```

## 🎲 Supported D&D 5e Features

### Character Generation
- ✅ All standard races (Human, Elf, Dwarf, Halfling, etc.)
- ✅ All standard classes (Fighter, Wizard, Rogue, Cleric, etc.)
- ✅ Ability scores and modifiers
- ✅ Skill proficiencies (all 18 skills)
- ✅ Starting equipment by class
- ✅ Hit points calculation
- ✅ Armor class calculation
- ✅ Proficiency bonus by level
- ✅ Class features
- ✅ Spell selection for casters

## 🔧 Configuration

ADA can be configured through environment variables or programmatically:

```python
from ada.utils import LLMClient
from ada import NarrativeToMechanicsTranslator

# Custom LLM configuration
llm = LLMClient(
    api_key="your-api-key",
    model="gpt-4",
    base_url="https://custom-endpoint.com"
)

# Use with translator
translator = NarrativeToMechanicsTranslator(llm_client=llm)
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📄 License

This project is open source and available under the MIT License.

## 🎯 Roadmap

Future enhancements planned:
- [ ] Multi-character party management
- [ ] Combat encounter automation
- [ ] Spell slot tracking
- [ ] Inventory management system
- [ ] Campaign world generation
- [ ] Voice-to-text session notes
- [ ] PDF character sheet export
- [ ] Integration with virtual tabletop platforms

## 🙏 Acknowledgments

- Built with OpenAI's language models
- Follows D&D 5e System Reference Document (SRD)
- Inspired by the D&D community's passion for storytelling

---

**Note**: This tool is designed to enhance D&D gameplay, not replace the Dungeon Master or player creativity. Always follow your table's house rules and have fun!
