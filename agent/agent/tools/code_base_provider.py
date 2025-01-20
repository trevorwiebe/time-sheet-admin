import os
import fnmatch

def read_gitignore(folder_path):
    """Reads the .gitignore file and returns a list of patterns to ignore."""
    gitignore_path = os.path.join(folder_path, '.gitignore')
    ignore_patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as gitignore_file:
            ignore_patterns = [line.strip() for line in gitignore_file if line.strip() and not line.startswith('#')]
    return ignore_patterns

def is_ignored(path, ignore_patterns, folder_path):
    """Checks if a given path matches any .gitignore pattern."""
    rel_path = os.path.relpath(path, folder_path)
    for pattern in ignore_patterns:
        if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(rel_path, os.path.join(pattern, '*')):
            return True
    return False

def process_folder(folder_path):
    """Processes files in a folder, respecting .gitignore, and returns formatted content."""
    result = []
    ignore_patterns = read_gitignore(folder_path)

    for root, _, files in os.walk(folder_path):
        for file_name in files:
            file_path = os.path.join(root, file_name)
            if is_ignored(file_path, ignore_patterns, folder_path):
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except (UnicodeDecodeError, FileNotFoundError):
                content = "[Error reading file]"

            relative_path = os.path.relpath(file_path, folder_path)
            result.append(f"{relative_path}:\n\n{content}\n//{'-' * 33}")

    return "\n".join(result)

class CodeBaseProvider:
    def __init__(self, folder_path):
        self.folder_path = folder_path
        self.output = None

    def run(self):
        self.output = process_folder(self.folder_path)
