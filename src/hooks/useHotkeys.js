import { useEffect } from 'react';

/**
 * Hook for global keyboard shortcuts
 * @param {Object} keyMap - Mapping of actions to key codes (e.g., { playPause: 'Space' })
 * @param {Object} handlers - Mapping of actions to functions
 */
export function useHotkeys(keyMap, handlers) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      // Iterate over map to find matching action
      const action = Object.keys(keyMap).find((key) => keyMap[key] === e.code);

      if (action && handlers[action]) {
        e.preventDefault();
        handlers[action]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyMap, handlers]);
}
