#!/usr/bin/env python3
"""
Anki .apkg file parser

This script parses Anki .apkg package files and generates a cards.json file
containing all cards with their front and back content, along with associated
media files (images and audio).

Usage:
    python3 parse_anki.py <path_to_apkg_file>
    
Output:
    - <apkg_filename>/: Directory named after the .apkg file (without extension)
        - cards.json: JSON file with all cards, each containing:
            - front: { content, media: { images: [], audio: [] } }
            - back: { content, media: { images: [], audio: [] } }
        - media/images/: Directory containing extracted image files
        - media/audio/: Directory containing extracted audio files
"""

import zipfile
import sqlite3
import json
import tempfile
import re
import hashlib
from pathlib import Path


def parse_apkg(apkg_path):
    """
    Parse an Anki .apkg file and generate cards.json.
    
    Args:
        apkg_path: Path to the .apkg file
    """
    apkg_path = Path(apkg_path)
    
    if not apkg_path.exists():
        print(f"Error: File '{apkg_path}' not found.")
        return
    
    # Create output directory with the same name as the .apkg file (without extension)
    apkg_stem = apkg_path.stem  # Gets filename without extension
    output_dir = apkg_path.parent / apkg_stem
    output_dir.mkdir(parents=True, exist_ok=True)
    
    media_output_dir = output_dir / "media"
    images_dir = media_output_dir / "images"
    audio_dir = media_output_dir / "audio"
    
    # Create media directories
    images_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a temporary directory to extract the package
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Extract the ZIP file
        try:
            with zipfile.ZipFile(apkg_path, 'r') as zip_ref:
                zip_ref.extractall(temp_path)
        except zipfile.BadZipFile:
            print("Error: Invalid ZIP file")
            return
        except Exception as e:
            print(f"Error extracting ZIP: {e}")
            return
        
        # Find the SQLite database file
        db_files = list(temp_path.rglob('*.anki2')) + list(temp_path.rglob('*.db'))
        if not db_files:
            print("Error: No database file found in the package")
            return
        
        # Get media dictionary if available
        media_dict = None
        media_file = temp_path / 'media'
        if media_file.exists() and media_file.is_file():
            try:
                with open(media_file, 'r') as f:
                    media_dict = json.load(f)
            except:
                pass
        
        # Extract media files from temp directory to output media directory
        extracted_media = extract_media_files(temp_path, images_dir, audio_dir, media_dict)
        
        # Process database and generate JSON
        for db_file in db_files:
            generate_json_from_database(db_file, output_dir, media_dict, extracted_media, images_dir, audio_dir)


def extract_media_files(temp_path, images_dir, audio_dir, media_dict):
    """
    Extract media files (images and audio) from temp directory to output directories.
    
    Args:
        temp_path: Temporary directory where .apkg was extracted
        images_dir: Directory to save extracted image files
        audio_dir: Directory to save extracted audio files
        media_dict: Dictionary mapping media IDs to filenames
        
    Returns:
        Dictionary mapping original filename to extracted file path
    """
    extracted_media = {}
    
    if not media_dict:
        return extracted_media
    
    import shutil
    
    # Image file extensions
    image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']
    # Audio file extensions
    audio_extensions = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.opus']
    
    # Find all media files in temp directory (they're numbered files)
    for media_id, filename in media_dict.items():
        # Look for the file by its numeric ID in temp directory
        media_file = temp_path / str(media_id)
        if media_file.exists() and media_file.is_file():
            try:
                # Determine if it's an image or audio file
                filename_lower = filename.lower()
                is_image = any(filename_lower.endswith(ext) for ext in image_extensions)
                is_audio = any(filename_lower.endswith(ext) for ext in audio_extensions)
                
                if is_image:
                    # Copy to images directory
                    output_file = images_dir / filename
                    shutil.copy2(media_file, output_file)
                    # Store relative path for JSON
                    extracted_media[filename] = f"media/images/{filename}"
                elif is_audio:
                    # Copy to audio directory
                    output_file = audio_dir / filename
                    shutil.copy2(media_file, output_file)
                    # Store relative path for JSON
                    extracted_media[filename] = f"media/audio/{filename}"
                else:
                    # Unknown type, default to images directory
                    output_file = images_dir / filename
                    shutil.copy2(media_file, output_file)
                    extracted_media[filename] = f"media/images/{filename}"
            except Exception as e:
                pass
    
    return extracted_media


def parse_template_fields(template_str, field_names, include_typing_fields=False):
    """
    Parse a template string to find which fields are referenced.
    Returns a set of field indices that are used in the template.
    
    Handles formats like:
    - {{FieldName}}
    - {{type:FieldName}} - typing field (only included if include_typing_fields=True)
    - {{Cloze:FieldName}}
    - {{Cloze}}
    
    Args:
        template_str: The template string to parse
        field_names: List of field names
        include_typing_fields: If False, exclude fields used only for typing (type:FieldName)
    """
    referenced_fields = set()
    if not template_str:
        return referenced_fields
    
    # Find all field references like {{FieldName}}, {{type:FieldName}}, {{Cloze:FieldName}}
    # Match everything between {{ and }}, then extract the actual field name
    field_pattern = r'\{\{([^}]+)\}\}'
    matches = re.findall(field_pattern, template_str)
    
    for match in matches:
        match_stripped = match.strip()
        
        # Skip typing fields if include_typing_fields is False
        if not include_typing_fields and match_stripped.startswith('type:'):
            continue
        
        # Remove modifiers like "type:", "Cloze:", etc.
        # Split by colon and take the last part as the field name
        parts = match.split(':')
        field_name = parts[-1].strip()
        
        # Handle special case: if it's just "Cloze" without a colon, it's the Cloze field
        if match_stripped == 'Cloze' or field_name == 'Cloze':
            field_name = 'Cloze'
        
        # Find the index of this field
        if field_name in field_names:
            field_index = field_names.index(field_name)
            referenced_fields.add(field_index)
    
    return referenced_fields


def generate_json_from_database(db_path, output_dir, media_dict, extracted_media, images_dir, audio_dir):
    """
    Generate JSON file directly from database.
    
    Args:
        db_path: Path to SQLite database file
        output_dir: Directory to save JSON file
        media_dict: Dictionary mapping media IDs to filenames
        extracted_media: Dictionary mapping filenames to paths
        images_dir: Directory where image files are stored
        audio_dir: Directory where audio files are stored
    """
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get model information including templates
        model_info = {}
        template_info = {}  # model_id -> {ord: {front_fields: set, back_fields: set}}
        
        cursor.execute("SELECT models FROM col LIMIT 1")
        models_data = cursor.fetchone()
        if models_data and models_data[0]:
            try:
                models = json.loads(models_data[0])
                for model_id, model in models.items():
                    field_names = [field['name'] for field in model.get('flds', [])]
                    model_info[model_id] = {
                        'name': model.get('name', 'Unknown'),
                        'fields': field_names
                    }
                    
                    # Parse templates to find which fields appear on front vs back
                    templates = model.get('tmpls', [])
                    template_info[model_id] = {}
                    for template in templates:
                        ord_val = template.get('ord', 0) if isinstance(template, dict) else 0
                        qfmt = template.get('qfmt', '') if isinstance(template, dict) else ''
                        afmt = template.get('afmt', '') if isinstance(template, dict) else ''
                        
                        # Front: exclude typing fields (they don't display content, just create input)
                        # Back: include typing fields (the answer is shown on the back)
                        front_fields = parse_template_fields(qfmt, field_names, include_typing_fields=False)
                        back_fields = parse_template_fields(afmt, field_names, include_typing_fields=True)
                        
                        template_info[model_id][ord_val] = {
                            'front_fields': front_fields,
                            'back_fields': back_fields
                        }
            except Exception as e:
                print(f"Error parsing models: {e}")
        
        # Get cards and notes
        cursor.execute("SELECT * FROM cards")
        cards = cursor.fetchall()
        
        cursor.execute("SELECT * FROM notes")
        notes = cursor.fetchall()
        
        # Create mapping from note_id to cards
        note_to_cards = {}
        for card in cards:
            nid = card['nid']
            if nid not in note_to_cards:
                note_to_cards[nid] = []
            note_to_cards[nid].append(card)
        
        # Create mapping from note_id to note data
        notes_dict = {note['id']: note for note in notes}
        
        # Generate cards data
        cards_data = {}
        
        for note in notes:
            nid = note['id']
            fields = note['flds'].split('\x1f') if note['flds'] else []
            mid = str(note['mid'])
            
            # Create cards for this note
            if nid in note_to_cards:
                for card in note_to_cards[nid]:
                    card_id = str(card['id'])
                    ord_val = card['ord'] if 'ord' in card.keys() else 0
                    
                    # Get template information for this card
                    front_field_indices = set()
                    back_field_indices = set()
                    
                    if mid in template_info and ord_val in template_info[mid]:
                        front_field_indices = template_info[mid][ord_val]['front_fields']
                        back_field_indices = template_info[mid][ord_val]['back_fields']
                    else:
                        # Fallback: if no template info, use first field for front, rest for back
                        if len(fields) > 0:
                            front_field_indices = {0}
                        if len(fields) > 1:
                            back_field_indices = set(range(1, len(fields)))
                    
                    # Combine all fields that appear on front
                    front_content_parts = []
                    all_front_content = ''
                    for field_idx in front_field_indices:
                        if field_idx < len(fields) and fields[field_idx]:
                            field_content = fields[field_idx]
                            front_content_parts.append(field_content)
                            all_front_content += ' ' + field_content if all_front_content else field_content
                    
                    # Combine all fields that appear on back
                    back_content_parts = []
                    all_back_content = ''
                    for field_idx in back_field_indices:
                        if field_idx < len(fields) and fields[field_idx]:
                            field_content = fields[field_idx]
                            back_content_parts.append(field_content)
                            all_back_content += ' ' + field_content if all_back_content else field_content
                    
                    # Extract images and audio from front (all combined front content)
                    front_images = extract_images_from_content(all_front_content, media_dict, extracted_media)
                    front_audio = extract_audio_from_content(all_front_content, media_dict, extracted_media)
                    
                    # Extract images and audio from back (all combined back content)
                    back_images = extract_images_from_content(all_back_content, media_dict, extracted_media)
                    back_audio = extract_audio_from_content(all_back_content, media_dict, extracted_media)
                    
                    # Combine front content (join with space, but preserve structure)
                    combined_front_content = ' '.join(front_content_parts) if front_content_parts else ''
                    combined_back_content = ' '.join(back_content_parts) if back_content_parts else ''
                    
                    cards_data[card_id] = {
                        'front': {
                            'content': combined_front_content,
                            'media': {
                                'images': front_images,
                                'audio': front_audio
                            }
                        },
                        'back': {
                            'content': combined_back_content,
                            'media': {
                                'images': back_images,
                                'audio': back_audio
                            }
                        }
                    }
        
        # Write JSON file
        json_filename = output_dir / "cards.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(cards_data, f, indent=2, ensure_ascii=False)
        
        print(f"Generated cards.json with {len(cards_data)} cards")
        print(f"Output directory: {output_dir}")
        print(f"Extracted images to: {images_dir}")
        print(f"Extracted audio to: {audio_dir}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error processing database: {e}")


def extract_latex_blocks(content):
    """Extract LaTeX blocks from content."""
    latex_blocks = []
    if not content:
        return latex_blocks
    
    # Find all [latex]...[/latex] blocks
    latex_pattern = r'\[latex\](.*?)\[/latex\]'
    matches = re.findall(latex_pattern, content, re.DOTALL | re.IGNORECASE)
    for match in matches:
        cleaned = match.strip()
        latex_blocks.append(cleaned)
        # Also try a version with HTML tags removed
        cleaned_no_html = re.sub(r'<[^>]+>', '', cleaned).strip()
        if cleaned_no_html and cleaned_no_html != cleaned:
            latex_blocks.append(cleaned_no_html)
    
    # Also find standalone \[...\] blocks
    standalone_pattern = r'\\\[(.*?)\\\]'
    standalone_matches = re.findall(standalone_pattern, content, re.DOTALL)
    for match in standalone_matches:
        if match.strip() not in latex_blocks:
            latex_blocks.append(match.strip())
    
    return latex_blocks


def extract_latex_images(content, media_dict, extracted_media):
    """Extract images by matching LaTeX content to media files using hash."""
    images = []
    
    if not content or not media_dict:
        return images
    
    latex_blocks = extract_latex_blocks(content)
    
    for latex_block in latex_blocks:
        latex_clean = latex_block.strip()
        latex_hash = hashlib.sha1(latex_clean.encode('utf-8')).hexdigest()
        
        for media_id, filename in media_dict.items():
            if filename.startswith('latex-'):
                file_hash = filename.replace('latex-', '').replace('.png', '')
                if latex_hash == file_hash:
                    # Use extracted media path if available
                    if filename in extracted_media:
                        images.append(extracted_media[filename])
                    else:
                        images.append(f"media/images/{filename}")
                    break
    
    return images


def extract_images_from_content(content, media_dict=None, extracted_media=None):
    """Extract image references from content."""
    images = []
    
    if not content:
        return images
    
    # Find <img> tags with src attribute
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    img_matches = re.findall(img_pattern, content, re.IGNORECASE)
    for img in img_matches:
        img = img.split('?')[0].split('#')[0]
        # Check if it's in extracted media
        if extracted_media and img in extracted_media:
            images.append(extracted_media[img])
        elif extracted_media:
            # Try to find by filename
            for orig_name, path in extracted_media.items():
                if orig_name == img or img in orig_name:
                    images.append(path)
                    break
        else:
            images.append(f"media/images/{img}")
    
    # Find Anki media references like <img src="0"> where 0 is a media ID
    if media_dict:
        numeric_img_pattern = r'<img[^>]+src=["\'](\d+)["\']'
        numeric_matches = re.findall(numeric_img_pattern, content, re.IGNORECASE)
        for media_id in numeric_matches:
            if media_id in media_dict:
                filename = media_dict[media_id]
                image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']
                if any(filename.lower().endswith(ext) for ext in image_extensions):
                    if extracted_media and filename in extracted_media:
                        images.append(extracted_media[filename])
                    else:
                        images.append(f"media/images/{filename}")
    
    # Find references like [sound:filename] or [media:filename] that are images
    media_pattern = r'\[(?:sound|media):([^\]]+)\]'
    media_matches = re.findall(media_pattern, content, re.IGNORECASE)
    for media_file in media_matches:
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']
        if any(media_file.lower().endswith(ext) for ext in image_extensions):
            if extracted_media and media_file in extracted_media:
                images.append(extracted_media[media_file])
            else:
                images.append(f"media/images/{media_file}")
    
    # Extract LaTeX images
    latex_images = extract_latex_images(content, media_dict, extracted_media)
    images.extend(latex_images)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_images = []
    for img in images:
        if img not in seen:
            seen.add(img)
            unique_images.append(img)
    
    return unique_images


def extract_audio_from_content(content, media_dict=None, extracted_media=None):
    """Extract audio references from content."""
    audio_files = []
    
    if not content:
        return audio_files
    
    # Find <audio> tags with src attribute
    audio_pattern = r'<audio[^>]+src=["\']([^"\']+)["\']'
    audio_matches = re.findall(audio_pattern, content, re.IGNORECASE)
    for audio in audio_matches:
        audio = audio.split('?')[0].split('#')[0]
        if extracted_media and audio in extracted_media:
            audio_files.append(extracted_media[audio])
        else:
            audio_files.append(f"media/audio/{audio}")
    
    # Find Anki audio references like [sound:filename.mp3]
    sound_pattern = r'\[sound:([^\]]+)\]'
    sound_matches = re.findall(sound_pattern, content, re.IGNORECASE)
    for sound_file in sound_matches:
        if extracted_media and sound_file in extracted_media:
            audio_files.append(extracted_media[sound_file])
        else:
            audio_files.append(f"media/audio/{sound_file}")
    
    # Find media references that are audio files
    if media_dict:
        numeric_audio_pattern = r'<img[^>]+src=["\'](\d+)["\']'
        numeric_matches = re.findall(numeric_audio_pattern, content, re.IGNORECASE)
        for media_id in numeric_matches:
            if media_id in media_dict:
                filename = media_dict[media_id]
                audio_extensions = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.opus']
                if any(filename.lower().endswith(ext) for ext in audio_extensions):
                    if extracted_media and filename in extracted_media:
                        audio_files.append(extracted_media[filename])
                    else:
                        audio_files.append(f"media/audio/{filename}")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_audio = []
    for audio in audio_files:
        if audio not in seen:
            seen.add(audio)
            unique_audio.append(audio)
    
    return unique_audio


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        apkg_file = sys.argv[1]
    else:
        print("Usage: python3 parse_anki.py <path_to_apkg_file>")
        sys.exit(1)
    
    parse_apkg(apkg_file)
    
    # Get output directory name for final message
    apkg_path = Path(apkg_file)
    output_dir = apkg_path.parent / apkg_path.stem
    print(f"Done! Output saved to: {output_dir}/cards.json")
