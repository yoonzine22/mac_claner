import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, Trash2, Files, LayoutDashboard, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Dashboard from './components/Dashboard';
import Uninstaller from './components/Uninstaller';
import LargeFiles from './components/LargeFiles';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type View = 'dashboard' | 'uninstaller' | 'large-files';

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'uninstaller', label: 'Uninstaller', icon: Trash2 },
    { id: 'large-files', label: 'Large Files', icon: Files },
  ] as const;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0c] text-white selection:bg-cyan-500/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/5 bg-white/5 p-4 flex flex-col gap-6 backdrop-blur-3xl relative z-10">
        <div className="flex items-center gap-3 px-2 pt-4 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
            <HardDrive className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-white">Mac Cleaner</h1>
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Pro Edition</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive ? "text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 rounded-xl bg-white/10 border border-white/10 shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn("relative z-10 h-5 w-5", isActive ? "text-cyan-400" : "")} />
                <span className="relative z-10">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        {/* Background glow effect */}
        <div className="pointer-events-none fixed top-0 left-64 w-full h-full overflow-hidden">
          <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-cyan-600/10 blur-[120px]" />
          <div className="absolute -bottom-[30%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 p-8 h-full max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && <Dashboard key="dashboard" />}
            {activeView === 'uninstaller' && <Uninstaller key="uninstaller" />}
            {activeView === 'large-files' && <LargeFiles key="large-files" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;