import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Cpu, Zap, Archive } from 'lucide-react';

interface StorageInfo {
  total: number;
  free: number;
}

export default function Dashboard() {
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  useEffect(() => {
    async function fetchStorage() {
      try {
        const info = await window.ipcRenderer.invoke('get-storage');
        setStorage(info);
      } catch (err) {
        console.error(err);
      }
    }
    fetchStorage();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const used = storage ? storage.total - storage.free : 0;
  const percentage = storage ? (used / storage.total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white">System Status</h2>
        <p className="text-white/50 mt-1">Overview of your Mac's storage and health.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 text-cyan-400 mb-6">
            <HardDrive className="h-5 w-5" />
            <h3 className="font-semibold text-lg text-white">Storage Overview</h3>
          </div>

          <div className="flex flex-col items-center justify-center my-8">
            <div className="relative h-48 w-48">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  className="text-white/10 stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                />
                {/* Progress circle */}
                <motion.circle
                  className="text-cyan-400 stroke-current drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{percentage.toFixed(0)}%</span>
                <span className="text-xs text-white/50 uppercase tracking-widest mt-1">Used</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-sm text-white/50 mb-1">Total Space</p>
              <p className="text-xl font-semibold">{storage ? formatBytes(storage.total) : '---'}</p>
            </div>
            <div>
              <p className="text-sm text-white/50 mb-1">Available</p>
              <p className="text-xl font-semibold text-cyan-400">{storage ? formatBytes(storage.free) : '---'}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-rows-3 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex items-center justify-between group hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm text-white/50 mb-1">System Load</p>
              <p className="text-xl font-semibold">Optimal</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
          
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex items-center justify-between group hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm text-white/50 mb-1">Cache Optimization</p>
              <p className="text-xl font-semibold">Ready</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Zap className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex items-center justify-between group hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm text-white/50 mb-1">Deep Clean Status</p>
              <p className="text-xl font-semibold">Available</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Archive className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
