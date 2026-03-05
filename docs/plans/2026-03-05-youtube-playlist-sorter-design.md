# YouTube Playlist Sorter — Design Document

## Problem

When saving a YouTube video to a playlist, the "Save to..." dropdown lists playlists in an unsorted order. Users with many playlists must scroll through the entire list to find the desired one. There is no search or sort functionality.

## Solution

A Chrome extension (Manifest V3) that:

1. **Detects** when the "Save to playlist" dropdown opens on YouTube.
2. **Sorts** all playlist items in lexicographic (A-Z) order.
3. **Injects a search bar** between the header ("Save to...") and the playlist list.
4. **Filters** playlist items in real-time as the user types in the search bar.

## Architecture

**Content Script only** — no background service worker, no popup UI. The entire extension is a single content script that runs on `youtube.com`. It uses a `MutationObserver` to detect when the playlist dropdown DOM appears, then manipulates it.

### DOM Structure (YouTube's "Save to..." dropdown)

```
#contentWrapper (tp-yt-iron-dropdown)
  └── yt-sheet-view-model
      └── yt-contextual-sheet-layout
          ├── .ytContextualSheetLayoutHeaderContainer  ← "Save to..."
          ├── .ytContextualSheetLayoutContentContainer
          │   └── yt-list-view-model[role="list"]      ← playlist items
          │       ├── toggleable-list-item-view-model   ← one per playlist
          │       └── ...
          └── .ytContextualSheetLayoutFooterContainer   ← "New playlist" button
```

Each playlist item's name is inside:
`toggleable-list-item-view-model > yt-list-item-view-model .yt-list-item-view-model__title`

### Behavior

- **MutationObserver** watches for `yt-sheet-view-model` elements appearing in the DOM.
- When the dropdown opens, check if it's the "Save to..." playlist sheet (by matching the header text).
- Sort `toggleable-list-item-view-model` elements by their title text (case-insensitive).
- Inject a styled search `<input>` into the header container, below the title.
- On `input` events, hide/show playlist items whose title doesn't match the query (case-insensitive substring match).
- When the dropdown closes (element removed or hidden), clean up event listeners.

### Styling

The search bar matches YouTube's dark theme using CSS custom properties and YouTube's existing design tokens where possible. Fallback to hardcoded dark-theme colors.

## Non-Goals

- No popup/options page.
- No persistent storage or user preferences.
- No interaction with YouTube's API — purely DOM manipulation.
