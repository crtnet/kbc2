import os
import re
from typing import Set, Dict

def get_all_ts_files(start_path: str) -> Set[str]:
    """Get all TypeScript and TypeScript React files in the project."""
    ts_files = set()
    for root, _, files in os.walk(start_path):
        for file in files:
            if file.endswith(('.ts', '.tsx')) and 'node_modules' not in root:
                full_path = os.path.join(root, file)
                # Convert to relative path
                relative_path = os.path.relpath(full_path, start_path)
                ts_files.add(relative_path)
    return ts_files

def get_imports_from_file(file_path: str) -> Set[str]:
    """Extract all imports from a file."""
    imports = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Match import statements
        import_patterns = [
            r'from\s+[\'"](.+?)[\'"]',  # from 'path' import
            r'import\s+[\'"](.+?)[\'"]',  # import 'path'
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                # Handle relative imports
                if match.startswith('.'):
                    # Convert relative import to file path
                    base_dir = os.path.dirname(file_path)
                    abs_path = os.path.normpath(os.path.join(base_dir, match))
                    imports.add(abs_path)
                    # Also add potential extensions
                    imports.add(f"{abs_path}.ts")
                    imports.add(f"{abs_path}.tsx")
                    imports.add(f"{abs_path}/index.ts")
                    imports.add(f"{abs_path}/index.tsx")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return imports

def find_unused_files(directory: str = "frontend") -> Set[str]:
    """Find all unused TypeScript files in the project."""
    # Get all TypeScript files
    all_files = get_all_ts_files(directory)
    
    # Track which files are imported
    imported_files = set()
    
    # Check imports in each file
    for file in all_files:
        full_path = os.path.join(directory, file)
        imports = get_imports_from_file(full_path)
        
        for imported_path in imports:
            # Convert absolute paths back to relative
            if os.path.exists(imported_path):
                rel_path = os.path.relpath(imported_path, directory)
                imported_files.add(rel_path)
    
    # Files that exist but are never imported
    unused_files = all_files - imported_files
    
    # Remove entry points (these are used but not imported)
    entry_points = {'index.ts', 'App.tsx'}
    unused_files = {f for f in unused_files if os.path.basename(f) not in entry_points}
    
    return unused_files

if __name__ == "__main__":
    unused = find_unused_files()
    if unused:
        print("\nUnused TypeScript files:")
        for file in sorted(unused):
            print(f"- {file}")
    else:
        print("\nNo unused TypeScript files found!")