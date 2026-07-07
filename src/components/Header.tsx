import { useEffect, useState } from "react";
import { Wifi, WifiOff, ShieldCheck, Database, KeyRound } from "lucide-react";

interface HeaderProps {
  currentTab: 'student' | 'admin' | 'db-console';
  setCurrentTab: (tab: 'student' | 'admin' | 'db-console') => void;
  unsyncedCount: number;
  onManualSync: () => void;
  isSyncing: boolean;
}

export default function Header({
  currentTab,
  setCurrentTab,
  unsyncedCount,
  onManualSync,
  isSyncing
}: HeaderProps) {
  // SSR-safe state initialization
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    // Sync status on mount
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a] border-b border-[#1e293b] text-slate-100 py-3 px-6 shadow-md w-full" id="app-header">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/15 text-teal-400 rounded-lg border border-teal-500/30">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              GuardianQuiz <span className="text-xs bg-teal-900/50 text-teal-300 font-mono border border-teal-800 px-1.5 py-0.5 rounded font-normal">SECURE SUITE</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Offline-First AES Exam Terminal</p>
          </div>
        </div>

        {/* Tab Controls */}
        <nav className="flex items-center gap-1.5 bg-slate-900/95 p-1 rounded-lg border border-[#1e293b]">
          <button
            onClick={() => setCurrentTab('student')}
            id="nav-student-btn"
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentTab === 'student'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Student Portal
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            id="nav-admin-btn"
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              currentTab === 'admin'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Proctor Admin
          </button>
          <button
            onClick={() => setCurrentTab('db-console')}
            id="nav-db-btn"
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              currentTab === 'db-console'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            SQLite Console
          </button>
        </nav>

        {/* Right side connection / sync settings */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
            isOnline 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-950/40 text-rose-400 border-rose-500/20 animate-pulse'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>ONLINE (AUTO-SYNC READY)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>OFFLINE (SECURED CACHE ACTIVE)</span>
              </>
            )}
          </div>

          {/* Sync status */}
          {unsyncedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {unsyncedCount} PENDING SUBMISSION{unsyncedCount > 1 ? 'S' : ''}
              </span>
              <button
                onClick={onManualSync}
                disabled={isSyncing || !isOnline}
                id="header-sync-btn"
                className={`px-2.5 py-1 text-xs font-bold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 disabled:cursor-not-allowed transition-all`}
              >
                {isSyncing ? "SYNCING..." : "SYNC NOW"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
