import React from 'react';
import { Loader2, Music } from 'lucide-react';

export function ProcessingOverlay({ isProcessing, progress }) {
  if (!isProcessing) return null;

  const { processed, total, filename } = progress;
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl border border-white/10 shadow-2xl space-y-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Spinner & Title */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Importing Library...</h2>
        </div>

        {/* Progress Bar & Stats */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-medium text-gray-400">
            <span>Processing files</span>
            <span>
              {processed} / {total}
            </span>
          </div>

          <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-xs text-center text-gray-500 truncate font-mono px-4 h-5">
            {filename ? `Current: ${filename}` : 'Preparing...'}
          </p>
        </div>
      </div>
    </div>
  );
}
