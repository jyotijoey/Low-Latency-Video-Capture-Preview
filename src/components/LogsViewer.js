import React, { useEffect, useMemo, useRef, useState } from 'react';

const LEVEL_CLASS = {
  error: 'log-line--error',
  warn: 'log-line--warn',
  info: 'log-line--info',
  marker: 'log-line--marker',
};

function LogsViewer({ logs }) {
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [scrollTop, setScrollTop] = useState(0);

  const rowHeight = 22;
  const overscan = 20;

  const viewportHeight = containerRef.current?.clientHeight || 0;
  const totalHeight = logs.length * rowHeight;

  const visibleRange = useMemo(() => {
    if (logs.length === 0) {
      return { start: 0, end: 0 };
    }

    if (!viewportHeight) {
      return { start: Math.max(0, logs.length - 200), end: logs.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      logs.length,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan,
    );

    return { start, end };
  }, [logs.length, overscan, rowHeight, scrollTop, viewportHeight]);

  const visibleLogs = logs.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * rowHeight;

  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    setScrollTop(el.scrollTop);
  };

  return (
    <div className="logs-viewer" ref={containerRef} onScroll={handleScroll}>
      {logs.length === 0 ? (
        <div className="logs-viewer__empty">No logs yet.</div>
      ) : (
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              willChange: 'transform',
            }}
          >
            {visibleLogs.map((log) => (
              <div key={log.id} className={`log-line ${LEVEL_CLASS[log.level] || ''}`}>
                <span className="log-line__time">
                  {log.timeLabel || new Date(log.ts).toLocaleTimeString()}
                </span>
                <span className="log-line__text">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(LogsViewer);
