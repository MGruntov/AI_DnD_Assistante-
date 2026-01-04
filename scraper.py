import json
from pathlib import Path

from bs4 import BeautifulSoup
import requests

from urllib.parse import urljoin
import hashlib

BASE = "http://srdv.org/"
CACHE_DIR = Path("page_cache")
CACHE_DIR.mkdir(exist_ok=True)


def _get_cache_path(url):
    """Generate a cache file path for a URL."""
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return CACHE_DIR / f"{url_hash}.html"


def _fetch_cached(url):
    """Fetch URL from cache if available, else download and cache it."""
    cache_path = _get_cache_path(url)
    
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        html = response.text
        cache_path.write_text(html, encoding="utf-8")
        return html
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


def _clean_text(node):
    """Return whitespace-normalized text for a BeautifulSoup node."""
    text = node.get_text(" ", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def fetch_page_blocks(url, page_title=None):
    """Fetch a page and split it into blocks separated by headings.

    Each block becomes a separate entry so self-links within a page can
    point to distinct sections.
    
    Returns: list of {"title": str, "text": str, "has_heading": bool, "level": int}
             level = heading level (1-5), or 999 for auto-generated titles
    """
    html = _fetch_cached(url)
    if not html:
        return []

    soup = BeautifulSoup(html, features="html.parser")

    # Remove script and style elements before processing
    for script in soup(["script", "style"]):
        script.decompose()

    # Some pages (notably spells) use <div class="block"> for per-item content.
    # But they may also have standalone section headings (h2, h3) not inside blocks
    spell_blocks = soup.find_all("div", class_="block")
    if spell_blocks:
        blocks = []
        
        # Collect all standalone h2/h3 headings (not inside div.block) AND div.blocks in document order
        all_elements = []
        for elem in soup.find_all(["h2", "h3", "div"]):
            if elem.name == "div" and "block" in elem.get("class", []):
                all_elements.append(("block", elem))
            elif elem.name in ["h2", "h3"] and not elem.find_parent("div", class_="block"):
                all_elements.append(("heading", elem))
        
        # Process elements in document order
        for elem_type, elem in all_elements:
            if elem_type == "heading":
                # Standalone section heading
                title = elem.get_text(" ", strip=True)
                level = int(elem.name[1])
                
                # Skip if this heading matches the page title (it's the page name, not a section)
                if page_title and title == page_title:
                    continue
                
                # Gather text until next heading or div.block
                parts = []
                for sib in elem.next_siblings:
                    if getattr(sib, "name", None) in ["h2", "h3", "h4", "h5"]:
                        break
                    if getattr(sib, "name", None) == "div" and "block" in sib.get("class", []):
                        break
                    if hasattr(sib, "get_text"):
                        chunk = _clean_text(sib)
                        if chunk:
                            parts.append(chunk)
                
                text = "\n".join(parts).strip()
                blocks.append({"title": title, "text": text, "has_heading": True, "level": level})
                
            elif elem_type == "block":
                div = elem
                # Prefer an internal heading as title, else strong, else check previous heading, else first words.
                has_heading = False
                level = 999  # Auto-generated
                heading = div.find(["h1", "h2", "h3", "h4", "h5"])  # Include h5
                if heading:
                    title = heading.get_text(" ", strip=True)
                    has_heading = True
                    level = int(heading.name[1])  # h1 -> 1, h2 -> 2, etc.
                else:
                    strong = div.find("strong")
                    if strong:
                        title = strong.get_text(" ", strip=True)
                        has_heading = True
                        level = 999
                    else:
                        # Check if there's a heading immediately before this div or its parent
                        prev_heading = None
                        
                        # First check immediate previous siblings
                        for sib in div.previous_siblings:
                            if getattr(sib, "name", None) in ["h3", "h4"]:
                                prev_heading = sib
                                break
                            elif getattr(sib, "name", None) in ["div"]:
                                # Stop if we hit another div
                                break
                        
                        # If not found, check if parent has a previous h3/h4 sibling
                        if not prev_heading and div.parent:
                            for sib in div.parent.previous_siblings:
                                if getattr(sib, "name", None) in ["h3", "h4"]:
                                    prev_heading = sib
                                    break
                                elif getattr(sib, "name", None) in ["div"]:
                                    break
                        
                        if prev_heading:
                            title = prev_heading.get_text(" ", strip=True)
                            has_heading = True
                            level = int(prev_heading.name[1])
                        else:
                            text_preview = _clean_text(div)
                            title = " ".join(text_preview.split()[:6]) or "Section"
                            has_heading = False

                text = _clean_text(div)
                
                # If the div has an internal heading, remove the heading text from the content
                if heading and text.startswith(title):
                    # Remove the title from the start of text
                    text = text[len(title):].strip()
                
                if text:
                    blocks.append({"title": title, "text": text, "has_heading": has_heading, "level": level})

        if blocks:
            return blocks

    headings = soup.find_all(["h1", "h2", "h3", "h4", "h5"])

    if not headings:
        text = _clean_text(soup)
        fallback_title = page_title or "Full Page"
        return [{"title": fallback_title, "text": text, "has_heading": False, "level": 999}] if text else []

    blocks = []
    heading_names = {"h1", "h2", "h3", "h4", "h5"}
    
    # Skip the first heading if it matches the page title (it's the page name, not a section)
    start_idx = 0
    if headings and page_title:
        first_heading_text = headings[0].get_text(" ", strip=True)
        if first_heading_text == page_title:
            start_idx = 1

    for heading in headings[start_idx:]:
        title = heading.get_text(" ", strip=True) or "Section"
        level = int(heading.name[1])  # h1 -> 1, h2 -> 2, etc.

        # Gather text until the next heading of any level
        parts = []
        for sib in heading.next_siblings:
            if getattr(sib, "name", None) in heading_names:
                break
            if hasattr(sib, "get_text"):
                chunk = _clean_text(sib)
                if chunk:
                    parts.append(chunk)

        block_text = "\n".join(parts).strip()
        if block_text:
            blocks.append({"title": title, "text": block_text, "has_heading": True, "level": level})

    return blocks

with open("toc.html") as f:
    soup = BeautifulSoup(f, features="xml")

toc = soup.find("ul", class_="toc")


def walk_ul(ul, path, entries_map):
    for li in ul.find_all("li", recursive=False):
        a = li.find("a", recursive=False)
        if not a:
            continue

        title = a.get_text(strip=True)
        href = urljoin(BASE, a.get("href"))
        href_key = href.split("#", 1)[0]
        has_fragment = "#" in href

        current_path = path + [title]

        blocks = fetch_page_blocks(href_key, page_title=title)
        
        # Check if this TOC item has child items
        has_toc_children = li.find("ul", recursive=False) is not None

        # For non-fragment items, create individual block entries
        if not has_fragment:
            # Build hierarchical structure based on heading levels
            # Stack to track current parent at each level
            parent_stack = [(0, current_path, [])]  # (level, path, contents_list)
            
            for block in blocks:
                block_title = block["title"]
                block_level = block["level"]
                
                if block.get("has_heading", True):  # Only entries with headings
                    # Pop stack until we find the parent (level < current level)
                    while parent_stack and parent_stack[-1][0] >= block_level:
                        parent_stack.pop()
                    
                    # Current parent is top of stack
                    parent_level, parent_path, parent_contents = parent_stack[-1] if parent_stack else (0, current_path, [])
                    
                    # Build full path from parent
                    full_path = parent_path + [block_title]
                    key = (href_key, block_title)
                    
                    # Add this block to parent's contents
                    parent_contents.append(block_title)
                    
                    # Keep only the entry with the longest path (deepest breadcrumb)
                    existing = entries_map.get(key)
                    if not existing or len(full_path) > len(existing["full_path"]):
                        my_contents = []
                        entries_map[key] = {
                            "title": block_title,
                            "url": href_key,
                            "path": parent_path[:-1] if len(parent_path) > len(current_path) else path,
                            "full_path": full_path,
                            "text": block["text"],
                            "contents": my_contents,
                        }
                        
                        # Push this block onto stack as potential parent
                        parent_stack.append((block_level, full_path, my_contents))

            # Create page-level summary entry if page has content
            if blocks:  # Always create if page has any blocks
                # Get list of properly-headed blocks for contents
                proper_blocks = [b["title"] for b in blocks if b.get("has_heading", True)]
                
                # Concatenate block titles and texts for summary
                block_parts = []
                for b in blocks:
                    if b.get("has_heading", True):
                        block_parts.append(f"{b['title']}\n{b['text']}")
                    else:
                        block_parts.append(b['text'])
                summary_text = "\n\n".join(block_parts)
                
                page_key = (href_key, title)
                existing = entries_map.get(page_key)
                if not existing or len(current_path) > len(existing["full_path"]):
                    entries_map[page_key] = {
                        "title": title,
                        "url": href_key,
                        "path": path,
                        "full_path": current_path,
                        "text": summary_text,
                        "contents": proper_blocks,
                    }

        # Recurse into child TOC items (even for fragments, but keep the path context)
        sub = li.find("ul", recursive=False)
        if sub:
            walk_ul(sub, current_path if has_fragment else current_path, entries_map)


entries_map = {}
walk_ul(toc, [], entries_map)
entries = list(entries_map.values())


def post_process_entries(entries):
    """Apply data cleaning fixes to entries.
    
    This function handles known SRD parsing issues that are easier to fix
    in post-processing than in the scraper itself.
    """
    # Fix Rock Gnome - split feature content into separate entries
    entries_by_path = {tuple(e['full_path']): e for e in entries}
    
    rock_gnome_path = ('Races', 'Gnome', 'Rock Gnome')
    if rock_gnome_path in entries_by_path:
        rock_gnome = entries_by_path[rock_gnome_path]
        text = rock_gnome['text']
        
        # Split Rock Gnome text into features
        # Features are: Ability Score Increase, Artificer's Lore (with smart quote!), Tinker
        features = {}
        
        # Find positions of markers (using the actual smart quote U+2019)
        markers = [
            ("Ability Score Increase.", "Ability Score Increase"),
            ("Artificer\u2019s Lore.", "Artificer's Lore"),  # U+2019 = right single quotation mark
            ("Tinker.", "Tinker")
        ]
        
        # Find all marker positions
        positions = []
        for marker, feature_name in markers:
            if marker in text:
                pos = text.find(marker)
                positions.append((pos, feature_name, len(marker)))
        
        # Sort by position
        positions.sort()
        
        # Extract text for each feature
        for i, (pos, feature_name, marker_len) in enumerate(positions):
            # Find the start of next feature or end of text
            if i + 1 < len(positions):
                next_pos = positions[i + 1][0]
                feature_text = text[pos + marker_len:next_pos].strip()
            else:
                feature_text = text[pos + marker_len:].strip()
            
            features[feature_name] = feature_text
        
        # Create new entries for features that don't exist yet
        new_entries = []
        for feature_name in ["Ability Score Increase", "Artificer's Lore", "Tinker"]:
            feature_path = ('Races', 'Gnome', 'Rock Gnome', feature_name)
            if feature_path not in entries_by_path and feature_name in features:
                new_entry = {
                    'title': feature_name,
                    'url': rock_gnome['url'],
                    'path': ['Races', 'Gnome', 'Rock Gnome'],
                    'full_path': list(feature_path),
                    'text': features[feature_name],
                    'contents': []
                }
                new_entries.append(new_entry)
                entries_by_path[feature_path] = new_entry
        
        # Add new entries to the list
        entries.extend(new_entries)
        
        # Update Rock Gnome's contents to include the new features
        rock_gnome['contents'] = [
            "Ability Score Increase",
            "Artificer's Lore", 
            "Tinker"
        ]
    
    return entries


entries = post_process_entries(entries)

out = Path("toc_entries.json")

with out.open("w", encoding="utf-8") as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)

print(f"Saved {len(entries)} entries to {out}")