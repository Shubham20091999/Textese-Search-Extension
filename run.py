import zipfile
import os

def zip_files(zip_name, files_and_folders):
    # Create a ZipFile object
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in files_and_folders:
            if os.path.isdir(item):  # If it's a folder, walk through it
                for foldername, subfolders, filenames in os.walk(item):
                    for filename in filenames:
                        filepath = os.path.join(foldername, filename)
                        # Keep the folder structure inside the zip
                        arcname = os.path.relpath(filepath, start=os.path.dirname(item))
                        zipf.write(filepath, arcname)
            else:  # If it's a file, add it directly
                zipf.write(item, os.path.basename(item))  # Store only the filename, not the full path
    print(f"Created zip file: {zip_name}")

# Example usage
files_and_folders = ['icons', 'background.js', 'logic.html', 'logic.js', 'manifest.json']  # List your files/folders here
zip_name = 'output.zip'  # The name of the zip file to create
zip_files(zip_name, files_and_folders)
