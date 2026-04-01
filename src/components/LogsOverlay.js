import React, { useMemo, useState } from 'react';
import LogsToolbar from './LogsToolbar';
import LogsViewer from './LogsViewer';
import './LogsOverlay.css';

function LogsOverlay({ logs, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const latestLog = logs[logs.length - 1];
  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = useMemo(() => logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (normalizedSearch && !log.text.toLowerCase().includes(normalizedSearch)) return false;
    return true;
  }), [logs, levelFilter, normalizedSearch]);

  const copyLastNSeconds = (n) => {
    const cutoff = Date.now() - n * 1000;
    const recent = logs.filter((l) => l.ts >= cutoff);
    const text = recent
      .map((l) => `[${new Date(l.ts).toLocaleTimeString()}] [${l.level}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className={`logs-overlay${expanded ? ' logs-overlay--expanded' : ''}`}>
      <button
        className="logs-overlay__bar"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Toggle log console"
      >
        <span className="logs-overlay__arrow">{expanded ? '▼' : '▲'}</span>
        <span className="logs-overlay__preview">
          {latestLog ? latestLog.text : 'Console'}
        </span>
        <span className="logs-overlay__label">Logs</span>
      </button>
      <div className="logs-overlay__panel">
        {expanded ? (
          <>
            <LogsToolbar
              search={search}
              onSearchChange={setSearch}
              levelFilter={levelFilter}
              onLevelFilterChange={setLevelFilter}
              onClear={onClear}
              onCopyLastN={copyLastNSeconds}
            />
            <LogsViewer logs={filteredLogs} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default LogsOverlay;
