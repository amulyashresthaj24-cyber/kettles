# PowerShell script to create a Desktop shortcut for Flowmate (Production)
$ErrorActionPreference = "Stop"

$desktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Flowmate.lnk")
$targetPath = "C:\Users\amuly\Documents\Work\Flowmate\scripts\Flowmate.bat"
$workingDir = "C:\Users\amuly\Documents\Work\Flowmate\scripts"
$iconPath = "C:\Users\amuly\Documents\Work\Flowmate\src-tauri\icons\icon.ico"

Write-Host "Creating Desktop shortcut for Flowmate..."
Write-Host "Destination: $desktopPath"
Write-Host "Target: $targetPath"

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($desktopPath)
    $Shortcut.TargetPath = $targetPath
    $Shortcut.WorkingDirectory = $workingDir
    $Shortcut.IconLocation = "$iconPath,0"
    $Shortcut.WindowStyle = 7  # Minimized — avoids the launcher console flashing
    $Shortcut.Description = "Flowmate - Task-linked time tracking, project management, and analytics"
    $Shortcut.Save()
    Write-Host "Desktop shortcut created successfully!"
} catch {
    Write-Error "Failed to create Desktop shortcut: $_"
}
