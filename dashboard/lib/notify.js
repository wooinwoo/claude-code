import { spawn } from 'node:child_process';

/**
 * Show a Windows toast notification via PowerShell WinRT API.
 * Fires and forgets — the detached PowerShell process exits after showing the toast.
 */
export function showNotification(title, body) {
  const script = `
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]
$t=[System.Security.SecurityElement]::Escape($env:NT)
$b=[System.Security.SecurityElement]::Escape($env:NB)
$d=New-Object Windows.Data.Xml.Dom.XmlDocument
$d.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual></toast>")
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Cockpit').Show([Windows.UI.Notifications.ToastNotification]::new($d))`;
  try {
    const buf = Buffer.from(script, 'utf16le');
    const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', buf.toString('base64')], {
      windowsHide: true, detached: true, stdio: 'ignore',
      env: { ...process.env, NT: title, NB: body }
    });
    ps.unref();
  } catch (err) {
    console.error('[Notify] Failed:', err.message);
  }
}
