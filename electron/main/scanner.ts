import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const HOME_DIR = os.homedir();

export interface ScannedFile {
  path: string;
  size: number;
  type: 'Cache' | 'Preference' | 'Application Support' | 'Log' | 'Container' | 'App' | 'Other';
}

export interface AppScanResult {
  bundleId: string;
  appName: string;
  appPath: string;
  files: ScannedFile[];
  totalSize: number;
}

// Helper to get folder size recursively
export async function getPathSize(targetPath: string): Promise<number> {
  try {
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) return stats.size;
    
    // For directories, calculate recursively or use du for speed on mac
    if (stats.isDirectory()) {
      try {
        const { stdout } = await execAsync(`du -sk "${targetPath}"`);
        const match = stdout.match(/^(\d+)/);
        if (match) {
          return parseInt(match[1], 10) * 1024; // du -k returns KB
        }
      } catch (e) {
        // du might fail on some protected files, fallback to simple stat size
      }
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

// Read Info.plist to get bundle ID and Name
export async function parseInfoPlist(appPath: string): Promise<{ bundleId: string | null, name: string | null }> {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  try {
    const { stdout } = await execAsync(`defaults read "${plistPath}" CFBundleIdentifier`);
    const bundleId = stdout.trim();
    
    let name = path.basename(appPath, '.app');
    try {
      const { stdout: nameOut } = await execAsync(`defaults read "${plistPath}" CFBundleName`);
      if (nameOut.trim()) name = nameOut.trim();
    } catch (e) {}

    return { bundleId, name };
  } catch (error) {
    return { bundleId: null, name: path.basename(appPath, '.app') };
  }
}

// Find app related files
export async function scanAppFiles(appPath: string, includeSystem: boolean = false): Promise<AppScanResult> {
  const { bundleId, name } = await parseInfoPlist(appPath);
  
  const files: ScannedFile[] = [];
  
  // 1. Add the app itself
  files.push({
    path: appPath,
    size: await getPathSize(appPath),
    type: 'App'
  });

  if (!bundleId || !name) {
    return { bundleId: bundleId || 'Unknown', appName: name || 'Unknown', appPath, files, totalSize: files[0].size };
  }

  const searchPaths = [
    { dir: path.join(HOME_DIR, 'Library', 'Application Support', name), type: 'Application Support' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Application Support', bundleId), type: 'Application Support' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Caches', bundleId), type: 'Cache' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Caches', name), type: 'Cache' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Preferences', `${bundleId}.plist`), type: 'Preference' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Logs', name), type: 'Log' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Logs', bundleId), type: 'Log' as const },
    { dir: path.join(HOME_DIR, 'Library', 'Containers', bundleId), type: 'Container' as const }
  ];

  if (includeSystem) {
    searchPaths.push(
      { dir: path.join('/Library', 'Application Support', name), type: 'Application Support' as const },
      { dir: path.join('/Library', 'Application Support', bundleId), type: 'Application Support' as const },
      { dir: path.join('/Library', 'Caches', bundleId), type: 'Cache' as const },
      { dir: path.join('/Library', 'Preferences', `${bundleId}.plist`), type: 'Preference' as const },
    );
  }

  for (const sp of searchPaths) {
    if (fsSync.existsSync(sp.dir)) {
      const size = await getPathSize(sp.dir);
      files.push({
        path: sp.dir,
        size,
        type: sp.type
      });
    }
  }

  // Filter out duplicates (e.g. if name == bundleId)
  const uniqueFiles = files.filter((v, i, a) => a.findIndex(t => (t.path === v.path)) === i);
  const totalSize = uniqueFiles.reduce((acc, curr) => acc + curr.size, 0);

  return {
    bundleId,
    appName: name,
    appPath,
    files: uniqueFiles,
    totalSize
  };
}

export async function deleteFileOrFolder(targetPath: string): Promise<boolean> {
  try {
    // macOS specific move to trash:
    // osascript -e 'tell application "Finder" to delete POSIX file "path"'
    await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${targetPath}"'`);
    return true;
  } catch (error) {
    console.error('Delete failed', error);
    return false;
  }
}

export async function getStorageInfo(): Promise<{total: number, free: number}> {
  try {
    const { stdout } = await execAsync(`df -k / | tail -1 | awk '{print $2, $4}'`);
    const [total, free] = stdout.trim().split(' ').map(s => parseInt(s, 10) * 1024);
    return { total, free };
  } catch (error) {
    return { total: 0, free: 0 };
  }
}

// Find files > 100MB in Downloads/Documents
export async function findLargeFiles(): Promise<ScannedFile[]> {
  const dirs = [
    path.join(HOME_DIR, 'Downloads'),
    path.join(HOME_DIR, 'Documents')
  ];
  
  const largeFiles: ScannedFile[] = [];
  
  for (const dir of dirs) {
    try {
      // Find files larger than 100MB (+100000k)
      const { stdout } = await execAsync(`find "${dir}" -type f -size +100000k -exec ls -lh {} \\; | awk '{print $5, $9}'`);
      const lines = stdout.trim().split('\\n');
      for (const line of lines) {
        if (!line) continue;
        const parts = line.split(' ');
        const filePath = parts.slice(1).join(' ');
        if (filePath && fsSync.existsSync(filePath)) {
           largeFiles.push({
             path: filePath,
             size: await getPathSize(filePath),
             type: 'Other'
           });
        }
      }
    } catch (error) {
      // ignore
    }
  }
  
  // Sort descending
  return largeFiles.sort((a, b) => b.size - a.size);
}
