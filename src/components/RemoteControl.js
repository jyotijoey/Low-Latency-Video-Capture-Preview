import React, { useState } from 'react';

const topButtons = [
  { keyName: 'Home', label: 'Home' },
  { keyName: 'Back', label: 'Back' },
  { keyName: 'Info', label: '* Options' },
];

const dpadButtons = [
  { keyName: 'Up',     label: '▲', className: 'dpad-up' },
  { keyName: 'Left',   label: '◀', className: 'dpad-left' },
  { keyName: 'Select', label: 'OK', className: 'dpad-center' },
  { keyName: 'Right',  label: '▶', className: 'dpad-right' },
  { keyName: 'Down',   label: '▼', className: 'dpad-down' },
];

const sideButtons = [
  { keyName: 'VolumeUp',   label: 'Vol +' },
  { keyName: 'VolumeDown', label: 'Vol -' },
  { keyName: 'VolumeMute', label: 'Mute' },
];

const mediaButtons = [
  { keyName: 'InstantReplay', label: '↩', title: 'Instant Replay' },
  { keyName: 'Rev',           label: '⏮', title: 'Rewind' },
  { keyName: 'Play',          label: '⏯', title: 'Play / Pause' },
  { keyName: 'Fwd',           label: '⏭', title: 'Fast Forward' },
];

const KEYPAD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

function RemoteControl({
  deviceAddress,
  onDeviceAddressChange,
  keyboardEnabled,
  onKeyboardEnabledChange,
  showKeyboardHelp,
  onKeyboardHelpToggle,
  onSendKeypress,
  remoteStatus,
  isSending,
}) {
  const [keypadsOpen, setKeypadsOpen] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);

  const sendChar = (char) => {
    onSendKeypress('Lit_' + (shiftActive ? char.toUpperCase() : char));
    setShiftActive(false);
  };

  return (
    <section className="remote-section" aria-label="Remote Control">
      <div className="section-header">
        <h2>Remote Control</h2>
      </div>

      <div className="control-group">
        <label htmlFor="device-address">Device IP Address</label>
        <input
          id="device-address"
          type="text"
          value={deviceAddress}
          onChange={(event) => onDeviceAddressChange(event.target.value)}
          placeholder="192.168.1.50 or 192.168.1.50:8060"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      <div className="remote-toggle-row">
        <label className="toggle-label" htmlFor="keyboard-remote-toggle">
          <span>Use Keyboard Remote Control</span>
          <button
            type="button"
            className="info-button"
            aria-label="Show keyboard mappings"
            aria-expanded={showKeyboardHelp}
            onClick={onKeyboardHelpToggle}
          >
            i
          </button>
        </label>
        <button
          id="keyboard-remote-toggle"
          type="button"
          className={`toggle-switch ${keyboardEnabled ? 'enabled' : ''}`}
          role="switch"
          aria-checked={keyboardEnabled}
          onClick={() => onKeyboardEnabledChange(!keyboardEnabled)}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {showKeyboardHelp && (
        <div className="keyboard-help" role="dialog" aria-label="Keyboard mappings">
          <p>Arrow keys: D-pad</p>
          <p>Enter: OK/Select</p>
          <p>Backspace: Back</p>
          <p>Home: Home</p>
          <p>Space: Play/Pause</p>
        </div>
      )}

      <div className="remote-shell">
        <div className="remote-top-buttons">
          {topButtons.map((button) => (
            <button
              key={button.keyName}
              type="button"
              className="remote-button remote-pill-button"
              onClick={() => onSendKeypress(button.keyName)}
              disabled={isSending}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div className="remote-body">
          <div className="dpad">
            {dpadButtons.map((button) => (
              <button
                key={button.keyName}
                type="button"
                className={`remote-button dpad-button ${button.className}`}
                onClick={() => onSendKeypress(button.keyName)}
                disabled={isSending}
              >
                {button.label}
              </button>
            ))}
          </div>

          <div className="side-button-column">
            {sideButtons.map((button) => (
              <button
                key={button.keyName}
                type="button"
                className="remote-button side-button"
                onClick={() => onSendKeypress(button.keyName)}
                disabled={isSending}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>

        <div className="remote-media-row">
          {mediaButtons.map((button) => (
            <button
              key={button.keyName}
              type="button"
              className="remote-button media-button"
              title={button.title}
              onClick={() => onSendKeypress(button.keyName)}
              disabled={isSending}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      {remoteStatus && (
        <div className={`remote-status ${remoteStatus.type}`}>
          {remoteStatus.message}
        </div>
      )}

      <div className="keypad-section">
        <button
          type="button"
          className={`keypad-toggle-btn ${keypadsOpen ? 'open' : ''}`}
          onClick={() => setKeypadsOpen((prev) => !prev)}
        >
          <span>⌨ Text Input</span>
          <span className="keypad-chevron">{keypadsOpen ? '▲' : '▼'}</span>
        </button>

        {keypadsOpen && (
          <div className="keypad">
            {KEYPAD_ROWS.map((row, rowIndex) => (
              <div className="keypad-row" key={rowIndex}>
                {row.map((char) => (
                  <button
                    key={char}
                    type="button"
                    className="key-btn"
                    onClick={() => sendChar(char)}
                    disabled={isSending}
                  >
                    {shiftActive ? char.toUpperCase() : char}
                  </button>
                ))}
              </div>
            ))}
            <div className="keypad-row keypad-action-row">
              <button
                type="button"
                className={`key-btn shift-btn ${shiftActive ? 'active' : ''}`}
                onClick={() => setShiftActive((prev) => !prev)}
                disabled={isSending}
                title="Shift"
              >
                ⇧
              </button>
              <button
                type="button"
                className="key-btn sym-btn"
                onClick={() => sendChar('@')}
                disabled={isSending}
              >
                @
              </button>
              <button
                type="button"
                className="key-btn space-btn"
                onClick={() => onSendKeypress('Lit_ ')}
                disabled={isSending}
              >
                Space
              </button>
              <button
                type="button"
                className="key-btn sym-btn"
                onClick={() => sendChar('.')}
                disabled={isSending}
              >
                .
              </button>
              <button
                type="button"
                className="key-btn backspace-btn"
                onClick={() => onSendKeypress('Backspace')}
                disabled={isSending}
                title="Backspace"
              >
                ⌫
              </button>
              <button
                type="button"
                className="key-btn enter-btn"
                onClick={() => onSendKeypress('Enter')}
                disabled={isSending}
                title="Enter"
              >
                ↵
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default RemoteControl;
