If you're uncomfortable with running the .exe in this folder, feel free to review the file:
- "patcher.py" 

That file contains everything that the patch.exe is doing. Run it through AI if you want it to look
for malicious things... but I can promise you there is no malicious stuff here.

If you want to feel extra safe YOU can build the .exe your self.

You will need to run:
- pip install pyinstaller

then run in the root (where patcher.py is):

NOTE: If the .exe already exists before running this, you may need to delete it.

- python -m PyInstaller --onefile --distpath patcher\ --name "patch" patcher.py

This will build the executable for you. 

Happy Patching!