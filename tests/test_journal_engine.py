"""Tests for JournalEngine."""

import pytest
from ada.journaling.journal_engine import JournalEngine, JournalEntry


def test_journal_engine_initialization():
    """Test journal engine can be initialized."""
    engine = JournalEngine()
    assert engine is not None
    assert engine.llm_client is not None


def test_polish_entry_basic():
    """Test polishing a basic journal entry."""
    engine = JournalEngine()
    
    rough_notes = """
    Party fought goblins. Found treasure. Went to town.
    """
    
    entry = engine.polish_entry(rough_notes, session_number=1)
    
    assert isinstance(entry, JournalEntry)
    assert entry.title is not None
    assert entry.content is not None
    assert entry.session_number == 1


def test_journal_entry_structure():
    """Test JournalEntry data structure."""
    entry = JournalEntry(
        title="The Adventure Begins",
        content="The party gathered at the tavern...",
        session_number=1,
        characters=["Thorin", "Elara"],
        locations=["Tavern", "Forest"],
        key_events=["Met the quest giver", "Fought bandits"]
    )
    
    assert entry.title == "The Adventure Begins"
    assert entry.session_number == 1
    assert len(entry.characters) == 2
    assert len(entry.locations) == 2
    assert len(entry.key_events) == 2


def test_campaign_summary():
    """Test campaign summary generation."""
    engine = JournalEngine()
    
    entries = [
        JournalEntry(
            title="Session 1",
            content="First adventure",
            session_number=1,
            characters=["Hero"],
            locations=["Town"],
            key_events=["Quest started"]
        ),
        JournalEntry(
            title="Session 2",
            content="Second adventure",
            session_number=2,
            characters=["Hero"],
            locations=["Dungeon"],
            key_events=["Boss defeated"]
        )
    ]
    
    summary = engine.summarize_campaign(entries)
    
    assert summary is not None
    assert len(summary) > 0


def test_campaign_summary_empty():
    """Test campaign summary with no entries."""
    engine = JournalEngine()
    
    summary = engine.summarize_campaign([])
    
    assert summary == "No entries to summarize."


def test_system_prompt_exists():
    """Test that system prompt is defined."""
    assert JournalEngine.SYSTEM_PROMPT is not None
    assert "D&D" in JournalEngine.SYSTEM_PROMPT
