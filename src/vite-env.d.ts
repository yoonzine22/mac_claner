/// <reference types="vite/client" />

interface Window {
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, func: (...args: any[]) => void): void;
    off(channel: string, func: (...args: any[]) => void): void;
    getPathForFile(file: File): string;
  }
}
interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
}
