param(
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
