import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, Trash2, Loader2 } from 'lucide-react';

interface ScannedFile {
  path: string;
  size: number;
  type: string;
}

export default function LargeFiles() {
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const scanFiles = async () => {
    setIsLoading(true);
    try {
      const results = await window.ipcRenderer.invoke('find-large-files');
      setFiles(results);
      setHasScanned(true);
    } catch (err) {
      console.error(err);
      alert('Failed to scan for large files.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (path: string) => {
    const confirmed = confirm(`Are you sure you want to delete this file?\n${path}`);
    if (!confirmed) return;

    setDeletingPath(path);
    try {
      const success = await window.ipcRenderer.invoke('delete-path', path);
      if (success) {
        setFiles(prev => prev.filter(f => f.path !== path));
      } else {
        alert('Failed to delete file.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingPath(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          <h2 className="text-3xl font-bold tracking-tight text-white">Large Files</h2>
          <p className="text-white/50 mt-1">Find forgotten large files (&gt;100MB) in Downloads and Documents.</p>
        </div>
        
        <button
          onClick={scanFiles}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Files className="h-5 w-5" />}
          {isLoading ? 'Scanning...' : (hasScanned ? 'Rescan' : 'Start Scan')}
        </button>
      </header>

      <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col relative">
        {!hasScanned && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <Files className="h-16 w-16 mb-4 opacity-50" />
            <p>Click "Start Scan" to search for large files</p>
          </div>
        )}

        {hasScanned && files.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <p>No large files found. Good job!</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <AnimatePresence>
            {files.map((file, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                key={file.path}
                className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex flex-col truncate mr-4">
                  <span className="text-white font-medium truncate" title={file.path}>
                    {file.path.split('/').pop()}
                  </span>
                  <span className="text-xs text-white/40 font-mono truncate mt-1">
                    {file.path}
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="text-lg font-bold text-cyan-400 whitespace-nowrap">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    onClick={() => handleDelete(file.path)}
                    disabled={deletingPath === file.path}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                  >
                    {deletingPath === file.path ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
