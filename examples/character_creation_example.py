"""
Example: Narrative-to-Mechanics Character Creation
Demonstrates how to create D&D 5e characters from natural language descriptions.
"""

from ada.character_generation import NarrativeToMechanicsTranslator


def main():
    """Demonstrate narrative-to-mechanics translation."""
    
    # Initialize the translator
    translator = NarrativeToMechanicsTranslator()
    
    # Example 1: Simple character description
    print("=" * 60)
    print("Example 1: Creating a Fighter")
    print("=" * 60)
    
    narrative1 = """
    Create a brave human fighter named Thorin Ironforge. He's a veteran soldier
    who is exceptionally strong and tough. He wields a greatsword and wears chain mail.
    He's skilled in athletics, intimidation, and survival from his military background.
    """
    
    character1 = translator.translate(narrative1)
    print(character1.to_summary())
    
    print("\n" + "=" * 60)
    print("Example 2: Creating a Wizard")
    print("=" * 60)
    
    narrative2 = """
    I want to make an elf wizard called Elara Moonwhisper. She's a scholar
    who is highly intelligent and perceptive. She comes from a noble background
    and is proficient in arcana, history, investigation, and insight.
    She carries a staff, spell components, and a spellbook.
    She knows spells like magic missile, shield, and detect magic.
    """
    
    character2 = translator.translate(narrative2)
    print(character2.to_summary())
    
    print("\n" + "=" * 60)
    print("Example 3: Creating a Rogue")
    print("=" * 60)
    
    narrative3 = """
    Make me a halfling rogue named Pippin Quickfingers who grew up on the streets.
    He's very dexterous and charismatic, great at sneaking around and picking locks.
    He uses a short sword and a hand crossbow, and wears leather armor.
    His skills include stealth, sleight of hand, acrobatics, deception, and persuasion.
    """
    
    character3 = translator.translate(narrative3)
    print(character3.to_summary())
    
    print("\n" + "=" * 60)
    print("Character Creation Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
