# ADA Architecture Documentation

## System Overview

ADA (AI D&D Assistante) is a hybrid architecture system combining specialized LLMs with a D&D 5e rules engine to provide intelligent automation for tabletop RPG gameplay.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        ADA System                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Narrative-to-       │      │  AI-Assisted         │    │
│  │  Mechanics           │      │  Journaling          │    │
│  │  Translation         │      │  Engine              │    │
│  └──────────────────────┘      └──────────────────────┘    │
│            │                             │                   │
│            └─────────────┬───────────────┘                   │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │  LLM Client    │                          │
│                  │  (OpenAI API)  │                          │
│                  └───────┬────────┘                          │
│                          │                                   │
│            ┌─────────────┴─────────────┐                     │
│            │                           │                     │
│     ┌──────▼─────┐              ┌─────▼──────┐              │
│     │  D&D 5e    │              │  Narrative │              │
│     │  Rules     │              │  Processing│              │
│     │  Engine    │              │  Engine    │              │
│     └────────────┘              └────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Narrative-to-Mechanics Translation

**Purpose**: Convert natural language character descriptions into valid D&D 5e character sheets.

**Components**:
- `NarrativeToMechanicsTranslator`: Main translation orchestrator
- `CharacterSheet`: Data model for D&D 5e characters
- `AbilityScores`, `Skills`, `Equipment`: Sub-models

**Workflow**:
1. Accept natural language input from user
2. Send to LLM with D&D 5e-specific system prompt
3. Parse structured JSON response
4. Apply D&D 5e rules and calculations
5. Validate and return `CharacterSheet` object

**Key Features**:
- Automatic ability score assignment based on character description
- Skill proficiency inference from class and background
- Equipment selection appropriate to class
- Hit points calculation by class and level
- Armor class calculation based on equipment and DEX
- Proficiency bonus by level

### 2. AI-Assisted Journaling Engine

**Purpose**: Transform rough gameplay notes into polished narrative entries.

**Components**:
- `JournalEngine`: Main journaling orchestrator
- `JournalEntry`: Data model for journal entries

**Workflow**:
1. Accept rough notes from gameplay session
2. Send to LLM with narrative-focused system prompt
3. Parse response into structured entry
4. Extract metadata (characters, locations, events)
5. Return polished `JournalEntry` object

**Key Features**:
- Narrative enhancement with D&D fantasy tone
- Automatic character extraction
- Location tracking
- Key event identification
- Campaign summary generation

### 3. LLM Integration Layer

**Purpose**: Provide abstraction over language model APIs.

**Components**:
- `LLMClient`: Universal LLM interface

**Features**:
- OpenAI API integration
- Custom endpoint support
- Mock responses for testing
- JSON response formatting
- Temperature and token control

## Data Models

### CharacterSheet

Core data structure representing a complete D&D 5e character.

```python
CharacterSheet:
  - name: str
  - race: str
  - character_class: str
  - level: int (1-20)
  - ability_scores: AbilityScores
  - skills: Skills
  - equipment: Equipment
  - hit_points: int
  - armor_class: int
  - proficiency_bonus: int
  - features: List[str]
  - spells: List[str]
```

### JournalEntry

Structured journal entry with metadata.

```python
JournalEntry:
  - title: str
  - content: str
  - session_number: int
  - characters: List[str]
  - locations: List[str]
  - key_events: List[str]
```

## D&D 5e Rules Engine

The rules engine ensures all generated characters follow official D&D 5e mechanics:

### Ability Score Modifiers
```
Modifier = (Score - 10) // 2
```

### Proficiency Bonus by Level
```
Level 1-4:  +2
Level 5-8:  +3
Level 9-12: +4
Level 13-16: +5
Level 17-20: +6
```

### Hit Points Calculation
```
Level 1: Max Hit Die + CON modifier
Level 2+: Average Hit Die + CON modifier per level
```

### Armor Class
```
No Armor: 10 + DEX modifier
Light Armor: Base AC + DEX modifier
Medium Armor: Base AC + min(DEX modifier, 2)
Heavy Armor: Base AC
```

## LLM Prompt Engineering

### Character Generation Prompt

The system uses carefully crafted prompts to ensure consistent D&D 5e compliance:

- Emphasizes strict rule adherence
- Requests structured JSON output
- Provides examples of valid ability score ranges
- Specifies class-appropriate starting equipment
- Ensures skill proficiencies match class/background

### Journaling Prompt

Designed to produce engaging narrative content:

- Instructs on fantasy chronicle style
- Maintains D&D setting atmosphere
- Preserves factual accuracy from notes
- Structures output with clear sections
- Includes metadata extraction

## Extensibility

### Adding New Classes

To add support for new D&D classes:

1. Add hit die to `CLASS_HIT_DICE` in `NarrativeToMechanicsTranslator`
2. Update armor calculation if class has unique AC mechanics
3. Add class-specific features to feature lists

### Custom LLM Providers

To use alternative LLM providers:

```python
from ada.utils import LLMClient

custom_llm = LLMClient(
    api_key="your-key",
    model="custom-model",
    base_url="https://api.custom-provider.com"
)
```

### Extending Rules Engine

The rules engine is modular and can be extended:

- Add new calculation methods to `CharacterSheet`
- Implement additional D&D mechanics (multiclassing, feats, etc.)
- Create subclasses for variant rules

## Testing Strategy

### Unit Tests
- Character sheet data model validation
- Ability score and modifier calculations
- Rules engine calculations (HP, AC, proficiency)
- JSON parsing and error handling

### Integration Tests
- End-to-end character generation
- Journal entry processing
- LLM client integration (with mocks)

### Mock Responses

The system includes mock LLM responses for testing without API keys:
- Returns valid JSON for character generation
- Provides placeholder text for journaling
- Enables full test coverage without API costs

## Performance Considerations

### API Call Optimization
- Single LLM call per character generation
- Batch journal entries when possible
- Cache common responses

### Response Time
- Character generation: ~2-5 seconds (depends on LLM)
- Journal polishing: ~3-6 seconds (depends on LLM)
- Campaign summary: ~4-8 seconds (depends on LLM)

## Security Considerations

- API keys stored in environment variables
- No sensitive data logged
- Input validation on all user-provided data
- Pydantic validation for all data models
- No code execution in LLM responses

## Future Enhancements

Potential areas for expansion:

1. **Multi-character Party Management**: Track and manage entire parties
2. **Combat Automation**: Track initiative, HP, and conditions
3. **Spell Slot Management**: Automatic spell casting tracking
4. **Inventory System**: Equipment and treasure management
5. **World Generation**: AI-assisted campaign world creation
6. **Voice Integration**: Voice-to-text session notes
7. **PDF Export**: Generate printable character sheets
8. **VTT Integration**: Connect with virtual tabletops

## Dependencies

### Core Dependencies
- `openai>=1.0.0`: LLM integration
- `pydantic>=2.0.0`: Data validation
- `python-dotenv>=1.0.0`: Configuration management

### Development Dependencies
- `pytest>=7.0.0`: Testing framework

## Deployment

### Local Development
```bash
pip install -e .
export OPENAI_API_KEY=your-key
python examples/character_creation_example.py
```

### Production Considerations
- Use environment variables for API keys
- Implement rate limiting for API calls
- Add caching layer for common requests
- Monitor API usage and costs
- Log errors and performance metrics

## Maintenance

### Version Management
- Semantic versioning (MAJOR.MINOR.PATCH)
- Changelog maintenance
- Backward compatibility considerations

### Code Quality
- Type hints throughout codebase
- Comprehensive docstrings
- Test coverage >90%
- CodeQL security scanning
- Regular dependency updates
