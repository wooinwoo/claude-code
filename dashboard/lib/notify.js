import { spawn } from 'node:child_process';

/**
 * Show a Windows toast notification via PowerShell.
 * Uses BalloonTip (reliable on all Windows) + WinRT toast (Windows 10+) as fallback.
 */
export function showNotification(title, body) {
  // Method 1: BalloonTip — works reliably on all Windows versions
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$n=New-Object System.Windows.Forms.NotifyIcon
$n.Icon=[System.Drawing.SystemIcons]::Information
$n.BalloonTipIcon='Info'
$n.BalloonTipTitle=$env:NT
$n.BalloonTipText=$env:NB
$n.Visible=$true
$n.ShowBalloonTip(8000)
Start-Sleep -Seconds 9
$n.Dispose()`;
  try {
    const buf = Buffer.from(script, 'utf16le');
    const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', buf.toString('base64')], {
      windowsHide: true, detached: true, stdio: 'ignore',
      env: { ...process.env, NT: String(title), NB: String(body) }
    });
    ps.unref();
  } catch (err) {
    console.error('[Notify] Failed:', err.message);
  }
}
