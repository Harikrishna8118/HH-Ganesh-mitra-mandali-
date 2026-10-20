/**
 * Ganesh Mitra Mandali - Centralized Logging Utility
 *
 * Provides a debug-mode-aware, structured logging system with:
 * - Configurable log levels (debug, info, warn, error, silent)
 * - Automatic detection of development environment and user debug preferences
 * - Scoped loggers for React components and system services (e.g. logger.forComponent('ChatView'))
 * - In-memory ring buffer capturing recent logs and errors for runtime diagnostics
 * - Error boundary & async catch integration with stack formatting
 * - Deduplication of repetitive log messages
 * - Subscription mechanism for diagnostic UI panels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  tag: string;
  message: string;
  data?: unknown;
  stack?: string;
  componentStack?: string;
  repeatCount?: number;
}

export interface ComponentLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  captureError: (error: unknown, customMessage?: string) => LogEntry;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const DEBUG_STORAGE_KEY = 'gmm_debug_logging_enabled';
const MAX_BUFFER_SIZE = 120;

class CentralizedLogger {
  private buffer: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private lastEntrySignature: string | null = null;
  private lastEntryTime: number = 0;
  private activeLevel: LogLevel;
  private isDevEnvironment: boolean;

  constructor() {
    this.isDevEnvironment = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
    this.activeLevel = this.determineInitialLevel();

    // Listen for debug flag changes across browser tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === DEBUG_STORAGE_KEY) {
          this.activeLevel = this.determineInitialLevel();
        }
      });
    }
  }

  private determineInitialLevel(): LogLevel {
    if (typeof window !== 'undefined') {
      try {
        // Query param override: ?debug=true or ?debug=1
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === '1' || params.get('debug') === 'true') {
          return 'debug';
        }
        // LocalStorage override
        const stored = localStorage.getItem(DEBUG_STORAGE_KEY);
        if (stored === 'true') return 'debug';
        if (stored === 'silent') return 'silent';
      } catch {
        // Ignore storage access errors
      }
    }

    // Default to 'debug' in development, 'warn' in production
    return this.isDevEnvironment ? 'debug' : 'warn';
  }

  public isDebugMode(): boolean {
    return this.activeLevel === 'debug';
  }

  public setDebugMode(enabled: boolean): void {
    try {
      if (enabled) {
        localStorage.setItem(DEBUG_STORAGE_KEY, 'true');
        this.activeLevel = 'debug';
      } else {
        localStorage.removeItem(DEBUG_STORAGE_KEY);
        this.activeLevel = this.isDevEnvironment ? 'debug' : 'warn';
      }
    } catch {
      this.activeLevel = enabled ? 'debug' : 'warn';
    }
  }

  public setLevel(level: LogLevel): void {
    this.activeLevel = level;
  }

  public getLevel(): LogLevel {
    return this.activeLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.activeLevel];
  }

  private pushToBuffer(entry: LogEntry): void {
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push(entry);

    // Notify registered listeners (e.g. diagnostics drawer)
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch {
        // Prevent listener failures from breaking application code
      }
    });
  }

  public write(
    level: 'debug' | 'info' | 'warn' | 'error',
    tag: string,
    message: string,
    data?: unknown,
    errorObj?: Error,
    componentStack?: string
  ): LogEntry {
    const now = Date.now();
    const signature = `${level}:${tag}:${message}`;

    // Suppress rapid identical repetitive logs (within 1.5 seconds)
    if (this.lastEntrySignature === signature && now - this.lastEntryTime < 1500) {
      const last = this.buffer[this.buffer.length - 1];
      if (last) {
        last.repeatCount = (last.repeatCount || 1) + 1;
        return last;
      }
    }

    this.lastEntrySignature = signature;
    this.lastEntryTime = now;

    let stack: string | undefined;
    if (errorObj?.stack) {
      stack = errorObj.stack;
    } else if (data instanceof Error) {
      stack = data.stack;
    }

    const entry: LogEntry = {
      id: `log_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      data: data instanceof Error ? { name: data.name, message: data.message } : data,
      stack,
      componentStack,
    };

    // Store in ring buffer for diagnostics inspection
    this.pushToBuffer(entry);

    // Output formatted console log if level threshold is met
    if (this.shouldLog(level)) {
      this.formatAndOutputToConsole(entry);
    }

    return entry;
  }

  private formatAndOutputToConsole(entry: LogEntry): void {
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    const timeStr = entry.timestamp.split('T')[1]?.slice(0, 8) || '';

    if (!isBrowser) {
      console.log(`[${timeStr}] [${entry.level.toUpperCase()}] [${entry.tag}] ${entry.message}`, entry.data || '');
      return;
    }

    // Badge styling for browser developer tools
    const levelStyles: Record<string, { badge: string; text: string }> = {
      debug: {
        badge: 'background: #64748b; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 4px;',
        text: 'color: #64748b; font-weight: normal;',
      },
      info: {
        badge: 'background: #0284c7; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 4px;',
        text: 'color: #0369a1; font-weight: normal;',
      },
      warn: {
        badge: 'background: #d97706; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 4px;',
        text: 'color: #b45309; font-weight: 500;',
      },
      error: {
        badge: 'background: #dc2626; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 4px;',
        text: 'color: #b91c1c; font-weight: bold;',
      },
    };

    const style = levelStyles[entry.level] || levelStyles.info;
    const tagStyle = 'background: #7c2d12; color: #ffedd5; font-weight: bold; padding: 2px 5px; border-radius: 4px; margin-right: 4px;';
    const timeStyle = 'color: #94a3b8; font-size: 10px; margin-right: 4px;';

    const prefix = `%c${timeStr}%c[${entry.tag}]%c${entry.level.toUpperCase()}%c ${entry.message}`;
    const args: unknown[] = [timeStyle, tagStyle, style.badge, style.text];

    if (entry.data !== undefined) {
      args.push(entry.data);
    }
    if (entry.componentStack) {
      args.push({ componentStack: entry.componentStack });
    }

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  // --- Convenience Direct Logging ---

  public debug(tag: string, message: string, ...data: unknown[]): LogEntry {
    const extra = data.length === 1 ? data[0] : data.length > 1 ? data : undefined;
    return this.write('debug', tag, message, extra);
  }

  public info(tag: string, message: string, ...data: unknown[]): LogEntry {
    const extra = data.length === 1 ? data[0] : data.length > 1 ? data : undefined;
    return this.write('info', tag, message, extra);
  }

  public warn(tag: string, message: string, ...data: unknown[]): LogEntry {
    const extra = data.length === 1 ? data[0] : data.length > 1 ? data : undefined;
    return this.write('warn', tag, message, extra);
  }

  public error(tag: string, message: string, ...data: unknown[]): LogEntry {
    const extra = data.length === 1 ? data[0] : data.length > 1 ? data : undefined;
    const errorObj = extra instanceof Error ? extra : undefined;
    return this.write('error', tag, message, extra, errorObj);
  }

  /**
   * Specialized method to capture React Component errors from ErrorBoundary
   */
  public captureComponentError(
    componentName: string,
    error: Error | unknown,
    errorInfo?: { componentStack?: string | null }
  ): LogEntry {
    const errObj = error instanceof Error ? error : new Error(String(error));
    return this.write(
      'error',
      componentName || 'Component',
      errObj.message || 'Unhandled component render failure',
      { name: errObj.name, message: errObj.message },
      errObj,
      errorInfo?.componentStack || undefined
    );
  }

  /**
   * Specialized helper to capture async action / service failures cleanly
   */
  public captureAsyncError(
    contextTag: string,
    error: unknown,
    customMessage?: string
  ): LogEntry {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const msg = customMessage ? `${customMessage}: ${errObj.message}` : errObj.message;
    return this.write('warn', contextTag, msg, { name: errObj.name, original: error }, errObj);
  }

  /**
   * Creates a dedicated, tag-scoped logger for a React component or utility module
   */
  public forComponent(componentName: string): ComponentLogger {
    return {
      debug: (message: string, ...args: unknown[]) => this.debug(componentName, message, ...args),
      info: (message: string, ...args: unknown[]) => this.info(componentName, message, ...args),
      warn: (message: string, ...args: unknown[]) => this.warn(componentName, message, ...args),
      error: (message: string, ...args: unknown[]) => this.error(componentName, message, ...args),
      captureError: (error: unknown, customMessage?: string) =>
        this.captureAsyncError(componentName, error, customMessage),
    };
  }

  // --- Diagnostics & In-Memory Inspection ---

  public getLogs(filter?: { level?: LogLevel; tag?: string }): LogEntry[] {
    let result = [...this.buffer];
    if (filter?.level) {
      result = result.filter((e) => e.level === filter.level);
    }
    if (filter?.tag) {
      const lower = filter.tag.toLowerCase();
      result = result.filter((e) => e.tag.toLowerCase().includes(lower));
    }
    return result;
  }

  public getErrorLogs(): LogEntry[] {
    return this.buffer.filter((e) => e.level === 'error' || e.level === 'warn');
  }

  public clearLogs(): void {
    this.buffer = [];
    this.lastEntrySignature = null;
  }

  public subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public exportLogsAsJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        environment: this.isDevEnvironment ? 'development' : 'production',
        logCount: this.buffer.length,
        entries: this.buffer,
      },
      null,
      2
    );
  }
}

export const logger = new CentralizedLogger();
export default logger;
