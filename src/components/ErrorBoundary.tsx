import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Home, RotateCcw, Terminal } from 'lucide-react';
import { logger } from '../utils/logger.ts';
import { DiagnosticsModal } from './DiagnosticsModal.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  viewName?: string;
  compact?: boolean;
  fullPage?: boolean;
  onReset?: () => void;
  showHomeButton?: boolean;
  onNavigateHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  showDiagnosticsModal: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    showDiagnosticsModal: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Use centralized logging utility to capture, format, and store component render failure
    logger.captureComponentError(this.props.viewName || 'Component', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      showDiagnosticsModal: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Section Temporarily Unavailable',
        fallbackDescription = 'An unexpected rendering issue occurred in this section. The rest of the mandali portal remains accessible.',
        viewName,
        compact = false,
        fullPage = false,
        showHomeButton = false,
        onNavigateHome,
      } = this.props;

      // Compact inline fallback (for modals, widgets, badges)
      if (compact) {
        return (
          <div className="p-3 my-2 rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">
                  {viewName ? `${viewName}: ` : ''}{fallbackTitle}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {fallbackDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 shadow-2xs transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        );
      }

      // Full-page recovery fallback (for top-level app crash protection)
      if (fullPage) {
        return (
          <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-amber-500 selection:text-white">
            <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center ring-4 ring-amber-500/10">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
                  Ganesh Mitra Mandali Portal
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {fallbackTitle}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {fallbackDescription}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    window.location.reload();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => this.setState({ showDiagnosticsModal: true })}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Diagnostics</span>
                </button>
              </div>

              {this.state.error && (
                <div className="text-left pt-2">
                  <button
                    type="button"
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 mx-auto"
                  >
                    <span>{this.state.showDetails ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
                    {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {this.state.showDetails && (
                    <div className="mt-3 p-3 rounded-xl bg-black/60 border border-slate-700 text-[10px] font-mono text-amber-200 overflow-x-auto max-h-36">
                      <p className="font-bold text-rose-300">{this.state.error.message}</p>
                      {this.state.errorInfo?.componentStack && (
                        <pre className="text-slate-400 whitespace-pre-wrap mt-1">
                          {this.state.errorInfo.componentStack.trim()}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DiagnosticsModal
              isOpen={this.state.showDiagnosticsModal}
              onClose={() => this.setState({ showDiagnosticsModal: false })}
            />
          </div>
        );
      }

      // Default section/view level boundary
      return (
        <div className="p-6 my-4 rounded-3xl bg-amber-50/70 border border-amber-200 text-slate-800 shadow-xs max-w-xl mx-auto animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                  {viewName ? `${viewName} Module` : 'GMM Notice'}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {fallbackTitle}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {fallbackDescription}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Section</span>
                </button>

                {showHomeButton && onNavigateHome && (
                  <button
                    type="button"
                    onClick={() => {
                      this.handleReset();
                      onNavigateHome();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Go to Home</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                >
                  <span>{this.state.showDetails ? 'Hide Details' : 'Details'}</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => this.setState({ showDiagnosticsModal: true })}
                  className="px-2 py-1 text-[11px] text-amber-800 hover:text-amber-950 flex items-center gap-1 font-semibold transition"
                >
                  <Terminal className="w-3 h-3 text-amber-700" />
                  <span>System Logs</span>
                </button>
              </div>

              {/* Expandable Technical Details */}
              {this.state.showDetails && this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto space-y-1">
                  <p className="text-rose-400 font-bold">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[10px] text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {this.state.errorInfo.componentStack.trim()}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>

          <DiagnosticsModal
            isOpen={this.state.showDiagnosticsModal}
            onClose={() => this.setState({ showDiagnosticsModal: false })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
