' Flowmate launcher — runs the production executable directly.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\amuly\Documents\Work\Flowmate"
sh.Run "src-tauri\target\release\flowmate-desktop.exe", 0, False
