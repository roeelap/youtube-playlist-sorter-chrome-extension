# YouTube Playlist Sorter

A Chrome extension that sorts your YouTube playlists alphabetically and adds a search bar to the "Save to playlist" dropdown.

## Features

- **Alphabetical sorting** — playlists are sorted A-Z when the dropdown opens.
- **Search bar** — type to instantly filter playlists by name.
- **Keyboard-safe** — typing in the search bar won't trigger YouTube shortcuts.
- **Light & dark theme** — adapts to YouTube's current theme.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right).
4. Click **Load unpacked** and select this project folder.
5. Navigate to any YouTube video and click "Save" — your playlists will be sorted with a search bar.

## How It Works

The extension injects a content script on YouTube pages. When the "Save to playlist" dropdown appears, the script:

1. Sorts all playlist items alphabetically.
2. Injects a search input for real-time filtering.
3. Watches for late-loading items and re-sorts as needed.

No data leaves your browser. No YouTube API calls. No permissions required.
