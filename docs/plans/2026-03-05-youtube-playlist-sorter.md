# YouTube Playlist Sorter — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that sorts YouTube's "Save to playlist" dropdown alphabetically and adds a search/filter bar.

**Architecture:** Content-script-only Manifest V3 Chrome extension. A MutationObserver detects the playlist dropdown, sorts its items, and injects a search input. No background worker, no popup, no API calls.

**Tech Stack:** Vanilla JavaScript, Chrome Extension Manifest V3, CSS.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `manifest.json`
- Create: `content.js`
- Create: `styles.css`
- Create: `README.md`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` (placeholder)

**Step 1: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "YouTube Playlist Sorter",
  "version": "1.0.0",
  "description": "Sorts YouTube playlists alphabetically and adds a search bar to the 'Save to playlist' dropdown.",
  "permissions": [],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create empty `content.js` and `styles.css`**

`content.js`:
```js
// Entry point — will be populated in subsequent tasks.
console.log("[YT Playlist Sorter] loaded");
```

`styles.css`:
```css
/* YouTube Playlist Sorter styles */
```

**Step 3: Create `README.md`**

Write a brief README explaining:
- What the extension does
- How to install it (load unpacked in `chrome://extensions`)
- How to use it (just save a video to a playlist on YouTube)

**Step 4: Create placeholder icons**

Generate minimal 16x16, 48x48, 128x128 PNG icons. These can be simple colored squares for now — just enough for Chrome to accept the manifest.

**Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold chrome extension with manifest v3"
```

---

### Task 2: Detect the Playlist Dropdown

**Files:**
- Modify: `content.js`

**Step 1: Implement MutationObserver to detect dropdown appearance**

The observer watches the entire document for added nodes. When a `yt-sheet-view-model` element appears, we check if it's the playlist save sheet by looking for the header text containing "Save" (handles "Save to...", "Save video to...").

```js
(function () {
  const SEARCH_BAR_ID = "yt-playlist-sorter-search";

  function getPlaylistTitle(item) {
    const titleEl = item.querySelector(".yt-list-item-view-model__title");
    return titleEl ? titleEl.textContent.trim() : "";
  }

  function isPlaylistSaveSheet(sheetEl) {
    const header = sheetEl.querySelector("yt-panel-header-view-model");
    if (!header) return false;
    const titleText = header.textContent.trim().toLowerCase();
    return titleText.includes("save");
  }

  function handleSheet(sheetEl) {
    if (!isPlaylistSaveSheet(sheetEl)) return;
    if (sheetEl.querySelector(`#${SEARCH_BAR_ID}`)) return;

    sortPlaylistItems(sheetEl);
    injectSearchBar(sheetEl);
  }

  function sortPlaylistItems(sheetEl) {
    // Task 3
  }

  function injectSearchBar(sheetEl) {
    // Task 4
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.matches && node.matches("yt-sheet-view-model")) {
          handleSheet(node);
        }

        const sheets = node.querySelectorAll
          ? node.querySelectorAll("yt-sheet-view-model")
          : [];
        sheets.forEach(handleSheet);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
```

**Step 2: Test manually**

1. Open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the project folder.
2. Go to any YouTube video.
3. Click the "Save" button (or the three-dot menu → "Save to playlist").
4. Open DevTools console — confirm `[YT Playlist Sorter] loaded` appears (from the earlier log).
5. Confirm no errors in the console.

**Step 3: Commit**

```bash
git add content.js
git commit -m "feat: detect playlist save dropdown with MutationObserver"
```

---

### Task 3: Sort Playlist Items Alphabetically

**Files:**
- Modify: `content.js` — implement `sortPlaylistItems()`

**Step 1: Implement the sort function**

```js
function sortPlaylistItems(sheetEl) {
  const list = sheetEl.querySelector('yt-list-view-model[role="list"]');
  if (!list) return;

  const items = Array.from(
    list.querySelectorAll("toggleable-list-item-view-model")
  );
  if (items.length === 0) return;

  items.sort((a, b) => {
    const nameA = getPlaylistTitle(a).toLowerCase();
    const nameB = getPlaylistTitle(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  items.forEach((item) => list.appendChild(item));
}
```

This works by:
1. Grabbing all `toggleable-list-item-view-model` elements from the list.
2. Sorting them by their title text (case-insensitive, locale-aware).
3. Re-appending them in sorted order. `appendChild` moves existing DOM nodes.

**Step 2: Test manually**

1. Reload the extension in `chrome://extensions`.
2. Open a YouTube video → click "Save" → observe playlists are now sorted A-Z.

**Step 3: Commit**

```bash
git add content.js
git commit -m "feat: sort playlist items alphabetically"
```

---

### Task 4: Inject Search Bar and Filter Logic

**Files:**
- Modify: `content.js` — implement `injectSearchBar()`
- Modify: `styles.css` — style the search bar

**Step 1: Implement search bar injection and filtering**

```js
function injectSearchBar(sheetEl) {
  const headerContainer = sheetEl.querySelector(
    ".ytContextualSheetLayoutHeaderContainer"
  );
  if (!headerContainer) return;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = SEARCH_BAR_ID;
  searchInput.placeholder = "Search playlists...";
  searchInput.autocomplete = "off";

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const list = sheetEl.querySelector('yt-list-view-model[role="list"]');
    if (!list) return;

    const items = list.querySelectorAll("toggleable-list-item-view-model");
    items.forEach((item) => {
      const title = getPlaylistTitle(item).toLowerCase();
      item.style.display = title.includes(query) ? "" : "none";
    });
  });

  // Prevent YouTube from capturing keypresses (e.g. spacebar = pause)
  searchInput.addEventListener("keydown", (e) => e.stopPropagation());
  searchInput.addEventListener("keyup", (e) => e.stopPropagation());
  searchInput.addEventListener("keypress", (e) => e.stopPropagation());

  headerContainer.appendChild(searchInput);

  // Auto-focus the search bar for immediate typing
  requestAnimationFrame(() => searchInput.focus());
}
```

**Key detail:** The `stopPropagation` calls on key events are critical. Without them, YouTube's global keyboard shortcuts intercept keypresses (e.g., spacebar pauses the video, `k` toggles play, etc.).

**Step 2: Style the search bar**

```css
#yt-playlist-sorter-search {
  display: block;
  width: calc(100% - 24px);
  margin: 8px 12px 4px 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-family: "Roboto", "Arial", sans-serif;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

#yt-playlist-sorter-search::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

#yt-playlist-sorter-search:focus {
  border-color: #3ea6ff;
  background: rgba(255, 255, 255, 0.15);
}
```

**Step 3: Test manually**

1. Reload extension.
2. Open "Save to playlist" dropdown.
3. Confirm search bar appears below the "Save to..." header.
4. Type a playlist name — only matching playlists should show.
5. Clear the input — all playlists reappear.
6. Confirm typing does NOT trigger YouTube shortcuts (spacebar doesn't pause, etc.).

**Step 4: Commit**

```bash
git add content.js styles.css
git commit -m "feat: add search bar with real-time playlist filtering"
```

---

### Task 5: Edge Cases and Polish

**Files:**
- Modify: `content.js`

**Step 1: Handle re-opening the dropdown**

YouTube may reuse the same DOM element when re-opening the dropdown. Add a check: if the sheet already has our search bar, skip injection but re-sort (in case playlists changed).

```js
function handleSheet(sheetEl) {
  if (!isPlaylistSaveSheet(sheetEl)) return;

  const existingSearch = sheetEl.querySelector(`#${SEARCH_BAR_ID}`);
  if (existingSearch) {
    // Re-sort but don't inject again
    sortPlaylistItems(sheetEl);
    existingSearch.value = "";
    existingSearch.dispatchEvent(new Event("input"));
    return;
  }

  sortPlaylistItems(sheetEl);
  injectSearchBar(sheetEl);
}
```

**Step 2: Handle late-loading playlist items**

YouTube may load playlist items asynchronously after the sheet appears. Add a secondary observer inside `handleSheet` that watches the list for new children, re-sorts, and re-filters when they appear.

```js
function observeListChanges(sheetEl) {
  const list = sheetEl.querySelector('yt-list-view-model[role="list"]');
  if (!list) return;

  let debounceTimer;
  const listObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sortPlaylistItems(sheetEl);
      const searchInput = sheetEl.querySelector(`#${SEARCH_BAR_ID}`);
      if (searchInput) {
        searchInput.dispatchEvent(new Event("input"));
      }
    }, 100);
  });

  listObserver.observe(list, { childList: true });

  // Disconnect when sheet is removed from DOM
  const cleanupObserver = new MutationObserver(() => {
    if (!document.contains(sheetEl)) {
      listObserver.disconnect();
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });
}
```

Call `observeListChanges(sheetEl)` at the end of `handleSheet`.

**Step 3: Handle attribute-based visibility**

YouTube may also toggle the dropdown via attributes (e.g., `aria-hidden`, `style` changes) rather than adding/removing nodes. Add an attribute observer on the `#contentWrapper` or `tp-yt-iron-dropdown` parent.

```js
// Inside the main IIFE, add another observer for attribute changes
const attrObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type !== "attributes") continue;
    const target = mutation.target;
    if (
      target.matches &&
      target.matches("tp-yt-iron-dropdown") &&
      !target.hasAttribute("aria-hidden")
    ) {
      const sheet = target.querySelector("yt-sheet-view-model");
      if (sheet) handleSheet(sheet);
    }
  }
});

attrObserver.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ["aria-hidden"],
});
```

**Step 4: Test manually**

1. Open/close the dropdown multiple times — search bar should appear each time, no duplicates.
2. Create a new playlist, re-open the dropdown — new playlist should appear sorted.
3. Confirm no console errors.

**Step 5: Commit**

```bash
git add content.js
git commit -m "feat: handle re-opens, async loading, and attribute toggles"
```

---

### Task 6: Final Assembly and README

**Files:**
- Verify: all files are complete and consistent
- Modify: `README.md` — finalize

**Step 1: Review the complete `content.js`**

Read through the full file. Ensure:
- No duplicate function definitions
- All functions referenced are defined
- The IIFE wraps everything
- No leftover `console.log` statements (remove the initial one)

**Step 2: Finalize `README.md`**

```markdown
# YouTube Playlist Sorter

A Chrome extension that sorts your YouTube playlists alphabetically and adds a search bar to the "Save to playlist" dropdown.

## Features

- **Alphabetical sorting** — playlists are sorted A-Z when the dropdown opens.
- **Search bar** — type to instantly filter playlists by name.
- **Keyboard-safe** — typing in the search bar won't trigger YouTube shortcuts.

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
```

**Step 3: Commit**

```bash
git add .
git commit -m "docs: finalize README"
```

---

## Summary of Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest (V3) |
| `content.js` | Core logic: observer, sort, search, filter |
| `styles.css` | Search bar styling (YouTube dark theme) |
| `README.md` | Installation and usage docs |
| `icons/icon*.png` | Extension icons (16, 48, 128) |
