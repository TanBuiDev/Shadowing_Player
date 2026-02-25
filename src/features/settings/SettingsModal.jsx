import React, { useState, useEffect } from 'react';
import { X, Keyboard, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  // Local state for editing before saving
  const [localSettings, setLocalSettings] = useState(settings);
  const [listeningCoords, setListeningCoords] = useState(null); // { actionKey: string }

  // Sync local state when modal opens
  // Handled by parent remounting via key prop
  // DELETE THIS BLOCK

  // Handle Key Capture
  useEffect(() => {
    if (!listeningCoords) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore 'Escape' to cancel listening
      if (e.code === 'Escape') {
        setListeningCoords(null);
        return;
      }

      // Create new map
      const newKeyMap = { ...localSettings.keyMap };

      // 1. "Steal" logic: Check if this key is already bound to another action
      const existingActionKey = Object.keys(newKeyMap).find(
        (key) => newKeyMap[key] === e.code
      );

      if (existingActionKey && existingActionKey !== listeningCoords.actionKey) {
        // Unbind the old action (or set to null/empty)
        // We'll set it to null or remove the key entirely
        newKeyMap[existingActionKey] = null;
      }

      // 2. Bind to new action
      newKeyMap[listeningCoords.actionKey] = e.code;

      setLocalSettings((prev) => ({ ...prev, keyMap: newKeyMap }));
      setListeningCoords(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningCoords, localSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const handleIntervalChange = (e) => {
    const val = e.target.value;
    // Allow typing comma, convert momentarily or keep as string until blur
    setLocalSettings((prev) => ({
      ...prev,
      autoReplay: { ...prev.autoReplay, interval: val },
    }));
  };

  const handleIntervalBlur = () => {
    // Parse float on blur
    let val = localSettings.autoReplay.interval;
    if (typeof val === 'string') {
      val = val.replace(',', '.');
    }
    const num = parseFloat(val);
    setLocalSettings((prev) => ({
      ...prev,
      autoReplay: { ...prev.autoReplay, interval: isNaN(num) ? 0.5 : num },
    }));
  };

  const actions = [
    { id: 'playPause', label: 'Play / Pause' },
    { id: 'replay', label: 'Replay (From Start)' },
    { id: 'seekBack', label: 'Seek Backward 5s' },
    { id: 'seekForward', label: 'Seek Forward 5s' },
    { id: 'toggleRecord', label: 'Toggle Record' },
    { id: 'addMarker', label: 'Add Timestamp Marker' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-0 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Keyboard size={20} className="text-primary" />
            Settings & Preferences
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Keyboard Shortcuts */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Keyboard Shortcuts
            </h3>
            <div className="grid gap-3">
              {actions.map((action) => (
                <div key={action.id} className="flex items-center justify-between group">
                  <span className="text-sm font-medium text-foreground/80">{action.label}</span>
                  <button
                    onClick={() => setListeningCoords({ actionKey: action.id })}
                    className={cn(
                      'min-w-[100px] px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all border',
                      listeningCoords?.actionKey === action.id
                        ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                        : 'bg-secondary text-secondary-foreground border-border group-hover:border-primary/50'
                    )}
                  >
                    {listeningCoords?.actionKey === action.id
                      ? 'Press Key...'
                      : localSettings.keyMap[action.id] || 'Unbound'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Click a button to rebind. Press <b>Escape</b> to cancel.
            </p>
          </section>

          {/* Section 2: Auto-Replay */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
              <RotateCcw size={14} /> Auto-Replay
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/70">
                  Replay Count (0 = Disabled)
                </label>
                <input
                  type="number"
                  min="0"
                  value={localSettings.autoReplay.count}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      autoReplay: { ...prev.autoReplay, count: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/70">Interval (Seconds)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={localSettings.autoReplay.interval}
                  onChange={handleIntervalChange}
                  onBlur={handleIntervalBlur}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm font-bold"
          >
            <Save size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
