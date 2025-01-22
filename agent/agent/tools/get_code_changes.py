import subprocess
import os
import sys

def get_git_changes(folder):
    try:
        # Change to the specified folder
        os.chdir(folder)

        # Check if the specified folder is a git repository
        subprocess.run(["git", "status"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Get the full changes since the last commit
        changes = subprocess.check_output(["git", "diff", "--cached"], text=True).strip()

        if changes:
            return f"Changes since the last commit:\n\n {changes}"
        else:
            return None

    except subprocess.CalledProcessError:
        return "An error occurred while trying to get the last changes"
    except Exception as e:
        return "An error occurred while trying to get the last changes"


class CodeChangesProvider:
    def __init__(self, folder_path):
        self.folder_path = folder_path
        self.output = None

    def run(self):
        self.output = get_git_changes(self.folder_path)

