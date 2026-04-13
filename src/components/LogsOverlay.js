import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LogsToolbar from './LogsToolbar';
import LogsViewer from './LogsViewer';
import './LogsOverlay.css';

function LogsOverlay({ logs, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [panelHeight, setPanelHeight] = useState(242);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(242);

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

  const stopResize = useCallback(() => {
    setIsResizing(false);
    document.body.style.userSelect = '';
  }, []);

  const onResizeMove = useCallback((event) => {
    const minHeight = 120;
    const maxHeight = Math.round(window.innerHeight * 0.75);
    const delta = resizeStartYRef.current - event.clientY;
    const next = resizeStartHeightRef.current + delta;
    const clamped = Math.max(minHeight, Math.min(maxHeight, next));
    setPanelHeight(clamped);
  }, []);

  const startResize = (event) => {
    event.preventDefault();
    if (!expanded) {
      return;
    }

    resizeStartYRef.current = event.clientY;
    resizeStartHeightRef.current = panelHeight;
    setIsResizing(true);
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, onResizeMove, stopResize]);

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
      <div
        className={`logs-overlay__panel${isResizing ? ' logs-overlay__panel--resizing' : ''}`}
        style={{ '--logs-panel-height': `${panelHeight}px` }}
      >
        {expanded ? (
          <>
            <div
              className="logs-overlay__resizer"
              onMouseDown={startResize}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize logs panel"
            />
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
