import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { OAuthTokens } from "../types.js";

const WINCRED_PS1_CONTENT = `param(
    [string]$Action = "write",
    [string]$Target = "gemini:antigravity",
    [string]$JsonFile = ""
)

$source = @"
using System;
using System.Runtime.InteropServices;

public class WinCredNative {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int flags, out IntPtr pCred);

    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree([In] IntPtr pCred);
}
"@

if (-not ([System.Management.Automation.PSTypeName]'WinCredNative').Type) {
    Add-Type -TypeDefinition $source
}

if ($Action -eq "read") {
    $pCred = [IntPtr]::Zero
    if ([WinCredNative]::CredRead($Target, 1, 0, [ref]$pCred)) {
        try {
            $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($pCred, [type][WinCredNative+CREDENTIAL])
            $bytes = New-Object byte[] $cred.CredentialBlobSize
            [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
            $text = [System.Text.Encoding]::UTF8.GetString($bytes)
            Write-Output $text
        } finally {
            [WinCredNative]::CredFree($pCred)
        }
    }
} else {
    $blobText = [System.IO.File]::ReadAllText($JsonFile, [System.Text.Encoding]::UTF8)
    $blobBytes = [System.Text.Encoding]::UTF8.GetBytes($blobText)
    $blobPtr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($blobBytes.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($blobBytes, 0, $blobPtr, $blobBytes.Length)

    $cred = New-Object WinCredNative+CREDENTIAL
    $cred.Flags = 0
    $cred.Type = 1
    $cred.TargetName = $Target
    $cred.UserName = "antigravity"
    $cred.Persist = 2
    $cred.CredentialBlobSize = $blobBytes.Length
    $cred.CredentialBlob = $blobPtr

    $res = [WinCredNative]::CredWrite([ref]$cred, 0)
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($blobPtr)
    if ($res) {
        Write-Output "OK"
    } else {
        Write-Error "CredWrite failed"
    }
}
`;

export interface WindowsGeminiCredential {
  token?: {
    access_token?: string;
    token_type?: string;
    refresh_token?: string;
    expiry?: string;
    expires_in?: number;
  };
  auth_method?: string;
  id_token_email?: string;
  writer_id?: string;
}

let cachedEmail: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2000;

export function getWincredScriptPath(): string {
  const configDir = path.join(os.homedir(), ".gemini", "config");
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch { /* ignore */ }
  }
  const scriptPath = path.join(configDir, "wincred.ps1");
  try {
    if (!fs.existsSync(scriptPath) || fs.readFileSync(scriptPath, "utf-8") !== WINCRED_PS1_CONTENT) {
      fs.writeFileSync(scriptPath, WINCRED_PS1_CONTENT, "utf-8");
    }
  } catch { /* ignore */ }
  return scriptPath;
}

export function readWindowsCredential(): WindowsGeminiCredential | null {
  if (process.platform !== "win32") return null;
  try {
    const scriptPath = getWincredScriptPath();
    const raw = execFileSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Action", "read", "-Target", "gemini:antigravity"],
      { encoding: "utf-8", timeout: 3500 },
    );
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(trimmed) as WindowsGeminiCredential;
    if (parsed.id_token_email) {
      cachedEmail = parsed.id_token_email;
      cacheTimestamp = Date.now();
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getWindowsCredentialEmail(force = false): string | null {
  if (process.platform !== "win32") return null;
  if (!force && cachedEmail && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEmail;
  }
  const cred = readWindowsCredential();
  return cred?.id_token_email || null;
}

export function writeWindowsCredential(token: OAuthTokens, email: string): boolean {
  if (process.platform !== "win32") return false;
  try {
    const existing = readWindowsCredential();
    const expiryDate = token.expiryDateSeconds
      ? new Date(token.expiryDateSeconds * 1000)
      : new Date(Date.now() + 3600 * 1000);
    const expiresIn = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));

    const payload: WindowsGeminiCredential = {
      token: {
        access_token: token.accessToken,
        token_type: token.tokenType || "Bearer",
        refresh_token: token.refreshToken || existing?.token?.refresh_token || "",
        expiry: expiryDate.toISOString(),
        expires_in: expiresIn,
      },
      auth_method: existing?.auth_method || "consumer",
      id_token_email: email,
      writer_id: existing?.writer_id || "qpkAjUrw6tFihS2v1R0WCw",
    };

    const tmpFile = path.join(
      os.tmpdir(),
      `agypool_cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`,
    );
    fs.writeFileSync(tmpFile, JSON.stringify(payload), "utf-8");

    const scriptPath = getWincredScriptPath();
    const res = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-Action",
        "write",
        "-Target",
        "gemini:antigravity",
        "-JsonFile",
        tmpFile,
      ],
      { encoding: "utf-8", timeout: 4000 },
    );

    try {
      fs.unlinkSync(tmpFile);
    } catch { /* ignore */ }

    if (res.includes("OK")) {
      cachedEmail = email;
      cacheTimestamp = Date.now();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
