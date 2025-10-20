import { getDirname } from '@main/utils';
import extractFileIcon from 'extract-file-icon';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { tmpdir } from 'os';

const __dirname = getDirname(import.meta.url);

interface SystemTool {
  name: string;
  path: string;
  command: string;
  description: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

// 从 exe 文件提取图标（使用 extract-file-icon）
function extractIconFromExe(filePath: string, outputPath: string): boolean {
  try {
    const buffer = extractFileIcon(filePath, 32);

    if (!buffer || buffer.length === 0) {
      return false;
    }

    writeFileSync(outputPath, buffer);
    return true;
  } catch (e) {
    return false;
  }
}

// 从 cpl 文件提取图标（使用 PowerShell）
function extractIconFromCpl(filePath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const psScript = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Add-Type -AssemblyName System.Drawing
    
    $targetFile = "${filePath.replace(/\\/g, '\\\\')}"
    $outputPath = "${outputPath.replace(/\\/g, '\\\\')}"
    
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($targetFile)
    
    $fileStream = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $icon.Save($fileStream)
    $fileStream.Close()
    
    Write-Output "SUCCESS"
    
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`;

    const tempScriptPath = join(tmpdir(), `extract-cpl-${Date.now()}.ps1`);
    const BOM = '\uFEFF';
    writeFileSync(tempScriptPath, BOM + psScript, 'utf8');

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    }, (error, stdout) => {
      try {
        unlinkSync(tempScriptPath);
      } catch (e) {
        // 忽略清理错误
      }

      if (error || !stdout.includes('SUCCESS')) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// 从 dll 文件提取图标（使用 PowerShell + ExtractIconEx）
function extractIconFromDll(dllPath: string, iconIndex: number, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const psScript = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class IconExtractor {
    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern uint ExtractIconEx(
        string szFileName,
        int nIconIndex,
        IntPtr[] phiconLarge,
        IntPtr[] phiconSmall,
        uint nIcons
    );
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@

try {
    $dllPath = "${dllPath.replace(/\\/g, '\\\\')}"
    $iconIndex = ${iconIndex}
    $outputPath = "${outputPath.replace(/\\/g, '\\\\')}"
    
    $largeIcons = New-Object IntPtr[] 1
    $smallIcons = New-Object IntPtr[] 1
    
    # 负数索引在 ExtractIconEx 中表示资源 ID，尝试提取
    $result = [IconExtractor]::ExtractIconEx($dllPath, $iconIndex, $largeIcons, $smallIcons, 1)
    
    # 如果失败且是负数索引，回退到使用索引 0（第一个图标）
    if ($result -eq 0 -and $iconIndex -lt 0) {
        $iconIndex = 0
        $result = [IconExtractor]::ExtractIconEx($dllPath, $iconIndex, $largeIcons, $smallIcons, 1)
    }
    
    if ($result -eq 0) {
        throw "ExtractIconEx failed, result=$result"
    }
    
    # 优先使用大图标，如果为空则使用小图标
    $iconHandle = $largeIcons[0]
    if ($iconHandle -eq [IntPtr]::Zero) {
        $iconHandle = $smallIcons[0]
    }
    
    if ($iconHandle -eq [IntPtr]::Zero) {
        throw "Icon handle is null"
    }
    
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $bitmap = $icon.ToBitmap()
    
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $bitmap.Dispose()
    $icon.Dispose()
    [IconExtractor]::DestroyIcon($iconHandle)
    
    Write-Output "SUCCESS"
    
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`;

    const tempScriptPath = join(tmpdir(), `extract-dll-${Date.now()}.ps1`);
    const BOM = '\uFEFF';
    writeFileSync(tempScriptPath, BOM + psScript, 'utf8');

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    }, (error, stdout) => {
      try {
        unlinkSync(tempScriptPath);
      } catch (e) {
        // 忽略清理错误
      }

      if (error || !stdout.includes('SUCCESS')) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// 根据文件类型选择合适的提取方法
async function extractIcon(tool: SystemTool, outputPath: string): Promise<boolean> {
  const pathLower = tool.path.toLowerCase();

  // 检查是否是 dll 文件（带索引）
  const dllMatch = tool.path.match(/^(.+\.dll),(-?\d+)$/i);
  if (dllMatch) {
    const dllPath = dllMatch[1];
    const iconIndex = parseInt(dllMatch[2], 10);

    if (!existsSync(dllPath)) {
      return false;
    }

    return await extractIconFromDll(dllPath, iconIndex, outputPath);
  }

  // 检查文件是否存在
  if (!existsSync(tool.path)) {
    return false;
  }

  // cpl 文件
  if (pathLower.endsWith('.cpl')) {
    return await extractIconFromCpl(tool.path, outputPath);
  }

  // dll 文件（不带索引）
  if (pathLower.endsWith('.dll')) {
    return await extractIconFromDll(tool.path, 0, outputPath);
  }

  // exe 文件或其他
  return extractIconFromExe(tool.path, outputPath);
}

async function main() {
  const jsonPath = join(__dirname, 'system-tools-output.json');
  const imagesDir = join(__dirname, 'images');

  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  const jsonContent = readFileSync(jsonPath, 'utf-8');
  const tools: SystemTool[] = JSON.parse(jsonContent);

  let successCount = 0;
  let failCount = 0;

  console.log(`开始处理 ${tools.length} 个工具图标...`);

  for (const tool of tools) {
    const fileName = sanitizeFileName(tool.name) + '.png';
    const outputPath = join(imagesDir, fileName);

    const success = await extractIcon(tool, outputPath);

    if (success) {
      console.log(`✅ ${tool.name}`);
      successCount++;
    } else {
      console.log(`❌ ${tool.name} - ${tool.path}`);
      failCount++;
    }
  }

  console.log(`\n完成! 成功: ${successCount}, 失败: ${failCount}`);
}

main();

