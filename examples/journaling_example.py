"""
Example: AI-Assisted Journaling
Demonstrates how to transform rough gameplay notes into polished journal entries.
"""

from ada.journaling import JournalEngine


def main():
    """Demonstrate AI-assisted journaling."""
    
    # Initialize the journal engine
    engine = JournalEngine()
    
    # Example 1: Basic session notes
    print("=" * 60)
    print("Example 1: Session 1 - The Adventure Begins")
    print("=" * 60)
    print("\nRough Notes:")
    
    rough_notes1 = """
    Party met at tavern. Hired by merchant to find missing caravan.
    Tracked it to goblin cave. Fought 5 goblins outside cave entrance.
    Thorin got hit but we won. Found cave entrance guarded by 2 more goblins.
    Killed them too. Found some gold, 50gp.
    """
    
    print(rough_notes1)
    print("\nPolished Entry:")
    entry1 = engine.polish_entry(rough_notes1, session_number=1)
    print(f"\n{entry1.title}\n")
    print(entry1.content)
    
    if entry1.characters:
        print(f"\nCharacters: {', '.join(entry1.characters)}")
    if entry1.locations:
        print(f"Locations: {', '.join(entry1.locations)}")
    if entry1.key_events:
        print(f"Key Events: {', '.join(entry1.key_events)}")
    
    # Example 2: More detailed session
    print("\n" + "=" * 60)
    print("Example 2: Session 2 - Into the Depths")
    print("=" * 60)
    print("\nRough Notes:")
    
    rough_notes2 = """
    Entered the cave system. Dark and smelly. Found goblin den with 8 goblins.
    Big fight. Elara used fireball, killed 4. Rest surrendered.
    Interrogated goblin leader Grak. He told us about bugbear boss deeper in cave.
    Also hobgoblin captain named Grimjaw. They have the caravan goods.
    Found secret passage behind waterfall. Led to underground river.
    Pippin scouted ahead, found bugbear lair. We decided to rest first.
    """
    
    print(rough_notes2)
    print("\nPolished Entry:")
    entry2 = engine.polish_entry(rough_notes2, session_number=2)
    print(f"\n{entry2.title}\n")
    print(entry2.content)
    
    if entry2.characters:
        print(f"\nCharacters: {', '.join(entry2.characters)}")
    if entry2.locations:
        print(f"Locations: {', '.join(entry2.locations)}")
    if entry2.key_events:
        print(f"Key Events: {', '.join(entry2.key_events)}")
    
    # Example 3: Campaign summary
    print("\n" + "=" * 60)
    print("Campaign Summary")
    print("=" * 60)
    
    summary = engine.summarize_campaign([entry1, entry2])
    print(f"\n{summary}")
    
    print("\n" + "=" * 60)
    print("Journaling Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
