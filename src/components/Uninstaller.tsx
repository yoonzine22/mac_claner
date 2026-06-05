import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertCircle, Search, Shield, ShieldAlert, FolderSearch } from 'lucide-react';
import { cn } from '../App';

interface ScannedFile {
  path: string;
  size: number;
  type: string;
}

interface ScanResult {
  bundleId: string;
  appName: string;
  appPath: string;
  files: ScannedFile[];
  totalSize: number;
}

export default function Uninstaller() {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [includeSystem, setIncludeSystem] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setError(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      let appPath = window.ipcRenderer.getPathForFile(files[0]) || (files[0] as any).path;
      
      if (!appPath) {
        setError('Could not read the file path. Ensure you are dropping a file from Finder.');
        return;
      }

      if (appPath.endsWith('/')) {
        appPath = appPath.slice(0, -1);
      }

      if (!appPath.endsWith('.app')) {
        setError(`Please drop a valid .app application. You dropped: ${appPath.split('/').pop()}`);
        return;
      }
      
      setIsScanning(true);
      try {
        const result = await window.ipcRenderer.invoke('scan-app', appPath, includeSystem);
        setScanResult(result);
      } catch (err) {
        console.error(err);
        setError('Failed to scan app. It might be protected by macOS.');
      } finally {
        setIsScanning(false);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async () => {
    if (!scanResult) return;
    const confirmed = confirm(`Are you sure you want to delete ${scanResult.appName} and all its related files?`);
    if (!confirmed) return;

    setDeleting(true);
    let successCount = 0;
    
    for (const file of scanResult.files) {
      try {
        await window.ipcRenderer.invoke('delete-path', file.path);
        successCount++;
      } catch (err) {
        console.error('Failed to delete', file.path);
      }
    }

    setDeleting(false);
    alert(`Deleted ${successCount} out of ${scanResult.files.length} files successfully.`);
    setScanResult(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 h-full flex flex-col"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Smart Uninstaller</h2>
          <p className="text-white/50 mt-1">Deep clean applications and their hidden leftover files.</p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-1.5 border border-white/10">
          <button
            onClick={() => setIncludeSystem(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              !includeSystem ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"
            )}
          >
            <Shield className="h-4 w-4" />
            User Only
          </button>
          <button
            onClick={() => setIncludeSystem(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              includeSystem ? "bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/20" : "text-white/50 hover:text-white"
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            System + User
          </button>
        </div>
      </header>

      {!scanResult ? (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-6 transition-all duration-300",
            isDragging
              ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
              : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10",
            isScanning && "opacity-50 pointer-events-none"
          )}
        >
          {isScanning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="p-6 rounded-full bg-cyan-500/20"
            >
              <Search className="h-12 w-12 text-cyan-400" />
            </motion.div>
          ) : (
            <div className="p-6 rounded-full bg-white/5 ring-1 ring-white/10">
              <FolderSearch className="h-12 w-12 text-white/40" />
            </div>
          )}

          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              {isScanning ? 'Deep Scanning...' : 'Drop an Application Here'}
            </h3>
            <p className="text-white/50 max-w-sm mx-auto">
              {isScanning
                ? 'Hunting down caches, preferences, and container files...'
                : 'Drag and drop any .app file from your Applications folder to completely uninstall it.'}
            </p>
          </div>
          
          {error && (
            <div className="mt-4 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-8 border-b border-white/10 flex items-start justify-between bg-white/5">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{scanResult.appName}</h3>
              <p className="text-white/50 font-mono text-sm mb-4">{scanResult.bundleId}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-sm font-medium border border-rose-500/20">
                <AlertCircle className="h-4 w-4" />
                Found {formatBytes(scanResult.totalSize)} of data
              </div>
            </div>
            <button
              onClick={() => setScanResult(null)}
              className="text-sm font-medium text-white/50 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-3">
            <AnimatePresence>
              {scanResult.files.map((file, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={file.path}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4 truncate mr-4">
                    <div className="px-3 py-1 rounded-md bg-white/10 text-xs font-mono text-white/70 whitespace-nowrap">
                      {file.type}
                    </div>
                    <span className="text-sm text-white/80 truncate font-mono">{file.path}</span>
                  </div>
                  <span className="text-sm font-medium text-white/60 whitespace-nowrap">
                    {formatBytes(file.size)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-6 border-t border-white/10 bg-white/5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(244,63,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-5 w-5" />
              {deleting ? 'Deleting...' : 'Delete Completely'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
