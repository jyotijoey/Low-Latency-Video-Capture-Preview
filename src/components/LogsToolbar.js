import React from 'react';

const LEVELS = ['all', 'error', 'warn', 'info'];

function LogsToolbar({ search, onSearchChange, levelFilter, onLevelFilterChange, onClear, onCopyLastN }) {
  return (
    <div className="logs-toolbar">
      <input
        className="logs-toolbar__search"
        type="text"
        placeholder="Filter logs..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="logs-toolbar__levels">
        {LEVELS.map((level) => (
          <button
            key={level}
            className={`logs-toolbar__level-btn logs-toolbar__level-btn--${level}${levelFilter === level ? ' active' : ''}`}
            onClick={() => onLevelFilterChange(level)}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
      <div className="logs-toolbar__actions">
        <button className="logs-toolbar__btn" onClick={onClear}>Clear</button>
        <button className="logs-toolbar__btn" onClick={() => onCopyLastN(30)}>Copy 30s</button>
      </div>
    </div>
  );
}

export default LogsToolbar;
