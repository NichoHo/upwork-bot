' Launches run-hunter.mjs with no console window. Task Scheduler runs
' node.exe in a visible console; wscript.exe has no window, and Run with
' window style 0 keeps the node child hidden too.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
sh.Run "node """ & here & "\run-hunter.mjs""", 0, True
