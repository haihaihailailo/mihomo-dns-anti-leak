# Read-only exact-file occupancy gate. No shutdown/restart API, privilege/ACL or attribute changes.
$ErrorActionPreference = 'Stop'
$paths = @([Console]::In.ReadToEnd() | ConvertFrom-Json)
if (!$paths.Count -or $paths.Count -gt 64) { throw 'Invalid usage batch' }
foreach ($file in $paths) {
    if (![IO.Path]::IsPathFullyQualified($file) -or $file.Length -ge 260) { throw 'Usage registration not verifiable; preserve' }
    $item = Get-Item -LiteralPath $file -Force
    if ($item.PSIsContainer) { throw 'Not a file' }
    $cursor = $item
    while ($cursor) {
        if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point; preserve' }
        $cursor = if ($cursor -is [IO.FileInfo]) { $cursor.Directory } else { $cursor.Parent }
    }
    $stream = [IO.FileStream]::new($file, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
    $stream.Dispose()
}
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class ArtifactUsage {
 [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] static extern int RmStartSession(out uint h,uint f,StringBuilder k);
 [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] static extern int RmRegisterResources(uint h,uint n,string[] files,uint a,IntPtr p,uint s,IntPtr q);
 [DllImport("rstrtmgr.dll")] static extern int RmGetList(uint h,out uint needed,ref uint count,IntPtr list,ref uint reasons);
 [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint h);
 public static bool Clear(string[] files) {
  uint h; int start=RmStartSession(out h,0,new StringBuilder(33)); if(start!=0)throw new Exception("RmStartSession: "+start);
  try { int register=RmRegisterResources(h,(uint)files.Length,files,0,IntPtr.Zero,0,IntPtr.Zero);
   if(register!=0)throw new Exception("RmRegisterResources: "+register);
   uint needed,count=0,reasons=0; int result=RmGetList(h,out needed,ref count,IntPtr.Zero,ref reasons);
   return result==0 && needed==0 && count==0 && reasons==0;
  } finally { if(RmEndSession(h)!=0)throw new Exception("RmEndSession failed"); }
 }
}
'@
if (![ArtifactUsage]::Clear([string[]]$paths)) { throw 'Occupied or unknown; preserve' }
'{"clear":true}'
