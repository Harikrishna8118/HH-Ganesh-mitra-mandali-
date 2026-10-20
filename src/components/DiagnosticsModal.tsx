import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  X,
  Trash2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
  Bug,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { logger, LogEntry, LogLevel } from '../utils/logger.ts';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDebugMode, setIsDebugMode] = useState<boolean>(logger.isDebugMode());
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Sync logs and subscribe to real-time entries
  useEffect(() => {
    if (!isOpen) return;

    setLogs(logger.getLogs());
    setIsDebugMode(logger.isDebugMode());

    const unsubscribe = logger.subscribe(() => {
      setLogs([...logger.getLogs()]);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handleToggleDebug = () => {
    const nextState = !isDebugMode;
    logger.setDebugMode(nextState);
    setIsDebugMode(nextState);
    setLogs([...logger.getLogs()]);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
    setExpandedLogId(null);
  };

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logger.exportLogsAsJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(logger.exportLogsAsJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gmm-diagnostics-${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        log.tag.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q) ||
        (log.stack && log.stack.toLowerCase().includes(q))
      );
    });
  }, [logs, selectedLevel, searchTerm]);

  const levelCounts = useMemo(() => {
    const counts = { all: logs.length, error: 0, warn: 0, info: 0, debug: 0 };
    logs.forEach((l) => {
      if (l.level in counts) {
        counts[l.level as 'error' | 'warn' | 'info' | 'debug']++;
      }
    });
    return counts;
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-800/90 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  System Diagnostics & Logs
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-700 text-amber-300 px-2 py-0.5 rounded-full">
                  Centralized Logger
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live capture of component lifecycle events, error boundaries, and async state
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Debug Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleDebug}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                isDebugMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle verbose console output in developer tools"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Debug Mode: {isDebugMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition"
              aria-label="Close Diagnostics"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Filters & Actions */}
        <div className="p-3 sm:px-5 bg-slate-800/50 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                selectedLevel === 'all'
                  ? 'bg-amber-500 text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              All ({levelCounts.all})
            </button>
            <button
              onClick={() => setSelectedLevel('error')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedLevel === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400 hover:bg-slate-700/50'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Errors ({levelCounts.error})</span>
            </button>
            <button
              onClick={() => setSelectedLevel('warn')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedLevel === 'warn'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-400 hover:bg-slate-700/50'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Warnings ({levelCounts.warn})</span>
            </button>
            <button
              onClick={() => setSelectedLevel('info')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedLevel === 'info'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-sky-400 hover:bg-slate-700/50'
              }`}
            >
              <Info className="w-3 h-3" />
              <span>Info ({levelCounts.info})</span>
            </button>
            <button
              onClick={() => setSelectedLevel('debug')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedLevel === 'debug'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              <Bug className="w-3 h-3" />
              <span>Debug ({levelCounts.debug})</span>
            </button>
          </div>

          {/* Search Box & Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-[240px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter tag or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyLogs}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Copy JSON to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleDownloadLogs}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Download JSON report"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition"
              title="Clear in-memory buffer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs List Area */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Terminal className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">No log entries found for current filter.</p>
              <p className="text-[11px] text-slate-600">
                Component errors and async events captured during this session will appear here.
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isExpanded = expandedLogId === entry.id;
              const time = entry.timestamp.split('T')[1]?.slice(0, 8) || '';

              const badgeColors = {
                debug: 'bg-slate-800 text-slate-400 border-slate-700',
                info: 'bg-sky-950 text-sky-300 border-sky-800',
                warn: 'bg-amber-950 text-amber-300 border-amber-800',
                error: 'bg-rose-950 text-rose-300 border-rose-800',
              };

              return (
                <div
                  key={entry.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer select-text ${
                    entry.level === 'error'
                      ? 'bg-rose-950/20 border-rose-800/50 hover:bg-rose-950/30'
                      : entry.level === 'warn'
                      ? 'bg-amber-950/20 border-amber-800/40 hover:bg-amber-950/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {time}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          badgeColors[entry.level]
                        }`}
                      >
                        {entry.level}
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                        {entry.tag}
                      </span>
                      {entry.repeatCount && entry.repeatCount > 1 && (
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                          +{entry.repeatCount} repeats
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-slate-200 break-words leading-relaxed">
                    {entry.message}
                  </p>

                  {/* Expanded Stack or Payload */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-2 animate-in fade-in">
                      {entry.data !== undefined && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                            Payload Context:
                          </span>
                          <pre className="p-2 rounded-lg bg-black/50 text-slate-300 text-[10px] overflow-x-auto whitespace-pre-wrap">
                            {typeof entry.data === 'string'
                              ? entry.data
                              : JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {entry.stack && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-rose-400 block mb-0.5">
                            Error Stack:
                          </span>
                          <pre className="p-2 rounded-lg bg-black/60 text-rose-200/90 text-[10px] overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {entry.stack}
                          </pre>
                        </div>
                      )}

                      {entry.componentStack && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-400 block mb-0.5">
                            Component Hierarchy Stack:
                          </span>
                          <pre className="p-2 rounded-lg bg-black/60 text-amber-200/90 text-[10px] overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {entry.componentStack.trim()}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 px-5 bg-slate-800/80 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            Captured {logs.length} entries in memory buffer ({logger.getLevel().toUpperCase()} filter threshold)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
