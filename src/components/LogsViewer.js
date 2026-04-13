import React, { useEffect, useRef } from 'react';

const LEVEL_CLASS = {
  error: 'log-line--error',
  warn: 'log-line--warn',
  info: 'log-line--info',
  marker: 'log-line--marker',
};

function LogsViewer({ logs }) {
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
  };

  return (
    <div className="logs-viewer" ref={containerRef} onScroll={handleScroll}>
      {logs.length === 0 ? (
        <div className="logs-viewer__empty">No logs yet.</div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className={`log-line ${LEVEL_CLASS[log.level] || ''}`}>
            <span className="log-line__time">
              {log.timeLabel || new Date(log.ts).toLocaleTimeString()}
            </span>
            <span className="log-line__text">{log.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default React.memo(LogsViewer);
