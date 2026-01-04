"""Adapted character creator for our action format."""
import json


class CharacterCreator:
    def __init__(self, sheet_path, tree_path):
        with open(sheet_path) as f:
            self.default_sheet = json.load(f)
        self.sheet = dict(self.default_sheet)
        with open(tree_path) as f:
            self.tree = json.load(f)
        self.decisions = self.tree["decisions"]

    def check_precondition(self, precond):
        param, op, value = precond
        current = self.sheet.get(param)
        
        # Treat None as default based on expected type
        if current is None:
            if isinstance(value, bool):
                current = False
            elif isinstance(value, (int, float)):
                current = 0
            elif isinstance(value, str):
                current = ""
            elif isinstance(value, list):
                current = []
        
        if op == "==":
            return current == value
        elif op == ">=":
            return current >= value
        elif op == "<=":
            return current <= value
        elif op == ">":
            return current > value
        elif op == "<":
            return current < value
        elif op == "has":
            if current is None:
                return False
            try:
                return value in current
            except TypeError:
                return False
        elif op == "not has":
            if current is None:
                return True
            try:
                return value not in current
            except TypeError:
                return True
        else:
            raise ValueError(f"Unknown operator: {op}")

    def available_decisions(self):
        available = []
        sheet_valid = self.sheet.get('is_valid_sheet', True)
        for d in self.decisions:
            if not sheet_valid and not self._decision_allowed_while_invalid(d):
                continue
            if all(self.check_precondition(p) for p in d["preconditions"]):
                available.append(d)
        return available

    def _decision_allowed_while_invalid(self, decision):
        """When the sheet is invalid, only allow decisions that resolve required sub-choices."""
        # Allow decisions that are specifically for making choices
        decision_id = decision.get('id', '')
        if 'choose_' in decision_id.lower():
            return True
        return False

    def apply_effect(self, effect):
        """Apply a single effect to the character sheet."""
        if not isinstance(effect, (list, tuple)) or len(effect) < 2:
            raise ValueError(f"Invalid effect format: {effect}")
        
        param = effect[0]
        op = effect[1]
        value = effect[2] if len(effect) > 2 else None
        
        if op == "set":
            self.sheet[param] = value
        elif op == "add":
            # Initialize if doesn't exist
            if param not in self.sheet or not isinstance(self.sheet[param], list):
                self.sheet[param] = []
            
            # Handle both single values and lists
            if isinstance(value, list):
                for item in value:
                    if item not in self.sheet[param]:
                        self.sheet[param].append(item)
            else:
                if value not in self.sheet[param]:
                    self.sheet[param].append(value)
        elif op == "inc":
            cur = self.sheet.get(param, 0)
            if cur is None:
                cur = 0
            self.sheet[param] = cur + value
        elif op == "dec":
            cur = self.sheet.get(param, 0)
            if cur is None:
                cur = 0
            self.sheet[param] = cur - value
        elif op == "+=":
            cur = self.sheet.get(param, 0)
            if cur is None:
                cur = 0
            self.sheet[param] = cur + value
        else:
            raise ValueError(f"Unknown effect operator: {op}")

    def apply_decision(self, decision_id):
        for d in self.decisions:
            if d["id"] == decision_id:
                sheet_valid = self.sheet.get('is_valid_sheet', True)
                if not sheet_valid and not self._decision_allowed_while_invalid(d):
                    raise ValueError(
                        f"Sheet is invalid; complete required choices before applying: {decision_id}"
                    )
                # verify preconditions before applying
                if not all(self.check_precondition(p) for p in d.get("preconditions", [])):
                    raise ValueError(f"Preconditions not satisfied for decision: {decision_id}")
                for eff in d["effects"]:
                    self.apply_effect(eff)
                return True
        raise ValueError(f"Decision not found: {decision_id}")

    def print_diff(self):
        print("\n--- Character Sheet Changes ---")
        for k, v in sorted(self.sheet.items()):
            if self.default_sheet.get(k) != v and v != self.default_sheet.get(k, 'MISSING'):
                default_val = self.default_sheet.get(k, '<not set>')
                if isinstance(v, list) and len(v) > 3:
                    print(f"{k}: {len(v)} items")
                else:
                    print(f"{k}: {default_val} -> {v}")

    def get_summary(self):
        """Get a summary of the character."""
        summary = []
        
        # Race
        if self.sheet.get('has_race'):
            summary.append(f"Race: {self.sheet.get('race', 'Unknown')}")
        
        # Classes
        classes = []
        for class_name in ['barbarian', 'bard', 'cleric', 'fighter']:
            level = self.sheet.get(f'class_{class_name}_level', 0)
            if level > 0:
                classes.append(f"{class_name.capitalize()} {level}")
        if classes:
            summary.append(f"Class: {', '.join(classes)}")
        
        # Ability scores
        abilities = []
        for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
            score = self.sheet.get(f'{ability}_score', 0)
            bonus = self.sheet.get(f'{ability}_bonus', 0)
            if score > 0 or bonus > 0:
                abilities.append(f"{ability.capitalize()}: {score}+{bonus}={score+bonus}")
        if abilities:
            summary.append("Abilities: " + ", ".join(abilities))
        
        # Features
        features = self.sheet.get('feature_entries', [])
        if features:
            summary.append(f"Features ({len(features)}): {', '.join(features[:5])}" + 
                          ("..." if len(features) > 5 else ""))
        
        # Spells
        spells = self.sheet.get('spells_known', [])
        cantrips = self.sheet.get('cantrips_known', [])
        if cantrips:
            summary.append(f"Cantrips ({len(cantrips)}): {', '.join(cantrips)}")
        if spells:
            summary.append(f"Spells Known ({len(spells)})")
        
        # Validation
        if not self.sheet.get('is_valid_sheet', True):
            pending = []
            for key, value in self.sheet.items():
                if key.endswith('_to_choose') and value > 0:
                    pending.append(f"{key}={value}")
            if pending:
                summary.append(f"⚠ Pending choices: {', '.join(pending)}")
        
        return "\n".join(summary)


if __name__ == "__main__":
    creator = CharacterCreator(
        "character_sheet_initial.json",
        "character_decision_tree.json"
    )
    
    print("Available decisions:", len(creator.available_decisions()))
    print("\nFirst 10 available:")
    for i, d in enumerate(creator.available_decisions()[:10]):
        print(f"  {i+1}. {d['id']}")
