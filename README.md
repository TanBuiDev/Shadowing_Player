# Shadowing Audio Player

A modern, feature-rich audio player built specifically for language learners practicing the "shadowing" technique. This application allows users to upload local audio files or folders, organizes them in a playlist, and provides specialized playback controls to facilitate effective listening and repetition practice.

## Features

### 🎧 Specialized Playback Controls

- **Adjustable Playback Speed**: Slow down or speed up audio without altering pitch to match your learning pace.
- **Auto-Pause**: Option to automatically pause playback after each track, giving you time to repeat/shadow what you heard.
- **Loop Current Track**: Repeat a single track indefinitely for intensive practice.
- **Smart Navigation**: Seek backward/forward by 5 seconds for quick implementation of the "A-B repeat" style manual workflow.

### 📂 File Management & Persistence

- **Local File Support**: Upload individual audio files or entire directories while preserving the folder structure.
- **Drag & Drop**: Intuitive drag-and-drop interface for adding files.
- **Data Persistence**: Uses **IndexedDB** to save your playlist and files locally in the browser. Your study materials remain available even after you refresh or close the page.
- **Playlist Management**: View files in a hierarchical tree structure and clear the playlist with a single click.

### 💻 Modern UI/UX

- **Responsive Design**: Built with Tailwind CSS for a sleek, dark-mode-first aesthetic.
- **Keyboard Shortcuts**:
  - `Space`: Play/Pause
  - `Arrow Left` / `Arrow Right`: Seek -5s / +5s
  - `Arrow Up` / `Arrow Down`: Previous / Next Track
- **Visual Feedback**: Dynamic audio visualizer animations during playback.

## Technology Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & `lucide-react` for icons.
- **State Persistence**: [idb](https://www.npmjs.com/package/idb) (IndexedDB wrapper).
- **Utility**: `clsx` and `tailwind-merge` for robust class handling.

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd shadowing_audio_player
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Usage Guide

1. **Adding Audio**:
   - Click the "Files" button to select individual audio tracks.
   - Click the "Folder" button to import a directory of audio files.
   - Or, simply drag and drop files anywhere onto the window.

2. **Practicing**:
   - Select a track from the sidebar playlist to start playing.
   - Use the controls at the bottom to toggle **Loop**, **Auto-Pause**, or adjust **Speed**.
   - Use the keyboard arrows to quickly rewind if you missed a phrase.

## Project Structure

```
src/
├── components/        # UI Components
│   ├── Controls.jsx   # Playback control bar (play, pause, speed, etc.)
│   ├── Playlist.jsx   # Sidebar file tree/playlist
│   └── ErrorBoundary.jsx # React error boundary for safe crash handling
├── lib/               # Utilities
│   ├── db.js          # IndexedDB service configuration
│   ├── filesystem.js  # File processing and sorting logic
│   └── utils.js       # Helper functions (class merging)
├── App.jsx            # Main application layout and state logic
└── main.jsx           # Entry point
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
