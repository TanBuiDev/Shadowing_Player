import React from 'react';
import { ErrorBoundary } from '@/components';
import { SettingsProvider, FileSystemProvider, PlayerProvider } from '@/context';
import { MainLayout } from '@/layouts';

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <FileSystemProvider>
          <PlayerProvider>
            <MainLayout />
          </PlayerProvider>
        </FileSystemProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
