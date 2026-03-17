(function () {
  const SEARCH_BAR_CLASS = "yt-playlist-sorter-search";
  const DEBUG = false;
  let sheetCounter = 0;

  function log(...args) {
    if (DEBUG) console.log("[YT-Playlist-Sorter]", ...args);
  }

  log("Content script loaded on", window.location.href);

  function getPlaylistTitle(item) {
    const titleEl = item.querySelector(".yt-list-item-view-model__title");
    return titleEl ? titleEl.textContent.trim() : "";
  }

  function isPlaylistSaveSheet(sheetEl) {
    const header = sheetEl.querySelector("yt-panel-header-view-model");
    if (header) {
      const ariaLabel = header.getAttribute("aria-label") || "";
      log("isPlaylistSaveSheet: aria-label =", JSON.stringify(ariaLabel));
      if (/save|playlist/i.test(ariaLabel)) return true;

      const titleText = header.textContent.trim().toLowerCase();
      log("isPlaylistSaveSheet: header text =", JSON.stringify(titleText));
      if (titleText.includes("save")) return true;
    }

    const createBtn = sheetEl.querySelector(
      'button[aria-label*="playlist" i]'
    );
    if (createBtn) {
      log("isPlaylistSaveSheet: found playlist button");
      return true;
    }

    const list = sheetEl.querySelector('yt-list-view-model[role="list"]');
    if (list) {
      const toggleItems = list.querySelectorAll("toggleable-list-item-view-model");
      if (toggleItems.length > 0) {
        log("isPlaylistSaveSheet: found toggleable list items, assuming playlist sheet");
        return true;
      }
    }

    log("isPlaylistSaveSheet: no match found");
    return false;
  }

  function getList(sheetEl) {
    return sheetEl.querySelector('yt-list-view-model[role="list"]');
  }

  function clearFilterStyles(sheetEl) {
    const list = getList(sheetEl);
    if (!list) return;
    const items = list.querySelectorAll("toggleable-list-item-view-model");
    items.forEach((item) => {
      item.style.removeProperty("visibility");
      item.style.removeProperty("height");
      item.style.removeProperty("overflow");
      item.style.removeProperty("margin");
      item.style.removeProperty("padding");
      item.style.removeProperty("border");
    });
  }

  function isCreatePlaylistButton(item) {
    // The "New playlist" / "Create playlist" button is a non-toggleable item
    // or contains a specific aria-label — keep it pinned to the bottom
    const btn = item.querySelector('button[aria-label*="playlist" i], button[aria-label*="new" i], button[aria-label*="create" i]');
    if (btn) return true;
    const title = getPlaylistTitle(item).toLowerCase();
    return title.includes("new playlist") || title.includes("create playlist");
  }

  function sortPlaylistItems(sheetEl) {
    const list = getList(sheetEl);
    if (!list) {
      log("sortPlaylistItems: no list found");
      return;
    }

    const allItems = Array.from(
      list.querySelectorAll("toggleable-list-item-view-model")
    );
    log("sortPlaylistItems: found", allItems.length, "items");
    if (allItems.length === 0) return;

    // Separate "New/Create playlist" buttons from regular playlists
    const pinned = allItems.filter(isCreatePlaylistButton);
    const playlists = allItems.filter((item) => !isCreatePlaylistButton(item));

    playlists.sort((a, b) => {
      const nameA = getPlaylistTitle(a).toLowerCase();
      const nameB = getPlaylistTitle(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Append sorted playlists first, then pinned buttons at the bottom
    playlists.forEach((item) => list.appendChild(item));
    pinned.forEach((item) => list.appendChild(item));
    log("sortPlaylistItems: sorted", playlists.length, "playlists, pinned", pinned.length, "buttons");
  }

  function injectSearchBar(sheetEl) {
    const headerContainer = sheetEl.querySelector(
      ".ytContextualSheetLayoutHeaderContainer"
    );
    if (!headerContainer) {
      log("injectSearchBar: no header container found");
      return;
    }

    // Guard: only inject once per sheet element
    if (sheetEl.dataset.ytpsSorted) {
      log("injectSearchBar: already injected, skipping");
      return;
    }
    sheetEl.dataset.ytpsSorted = "1";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = SEARCH_BAR_CLASS + "-" + (++sheetCounter);
    searchInput.className = SEARCH_BAR_CLASS;
    searchInput.placeholder = "Search playlists...";
    searchInput.autocomplete = "off";

    const triggerFilter = () => {
      const query = searchInput.value.toLowerCase().trim();
      const list = getList(sheetEl);
      if (!list) return;

      const items = list.querySelectorAll("toggleable-list-item-view-model");
      let visibleCount = 0;
      items.forEach((item) => {
        const title = getPlaylistTitle(item).toLowerCase();
        const match = !query || title.includes(query);
        if (match) {
          item.style.removeProperty("visibility");
          item.style.removeProperty("height");
          item.style.removeProperty("overflow");
          item.style.removeProperty("margin");
          item.style.removeProperty("padding");
          item.style.removeProperty("border");
          visibleCount++;
        } else {
          item.style.visibility = "hidden";
          item.style.height = "0";
          item.style.overflow = "hidden";
          item.style.margin = "0";
          item.style.padding = "0";
          item.style.border = "0";
        }
      });
      noResults.style.display = visibleCount === 0 && query.length > 0 ? "block" : "none";
    };

    searchInput.addEventListener("input", triggerFilter);

    const stopAll = (e) => {
      // Escape: clear search and show all items
      if (e.type === "keydown" && e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (searchInput.value.length > 0) {
          // First Escape clears the search
          searchInput.value = "";
          triggerFilter();
          e.preventDefault();
        }
        // Second Escape (empty field) lets the event propagate to close the sheet naturally
        return;
      }
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Keyboard navigation: ↑/↓ to move through visible playlists, Enter to toggle
    searchInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;

      const list = getList(sheetEl);
      if (!list) return;

      const visibleItems = Array.from(
        list.querySelectorAll("toggleable-list-item-view-model")
      ).filter((item) => item.style.display !== "none" && !isCreatePlaylistButton(item));

      if (visibleItems.length === 0) return;

      const currentIndex = visibleItems.findIndex(
        (item) => item.dataset.ytpsHighlighted === "1"
      );

      if (e.key === "Enter") {
        e.preventDefault();
        if (currentIndex >= 0) {
          const checkbox = visibleItems[currentIndex].querySelector(
            'input[type="checkbox"], tp-yt-paper-checkbox, ytd-toggle-button-renderer'
          );
          if (checkbox) checkbox.click();
          else visibleItems[currentIndex].click();
        }
        return;
      }

      // Clear current highlight
      if (currentIndex >= 0) {
        visibleItems[currentIndex].dataset.ytpsHighlighted = "";
        visibleItems[currentIndex].classList.remove("ytps-highlighted");
      }

      let nextIndex;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
      }

      visibleItems[nextIndex].dataset.ytpsHighlighted = "1";
      visibleItems[nextIndex].classList.add("ytps-highlighted");
      visibleItems[nextIndex].scrollIntoView({ block: "nearest" });
      e.preventDefault();
    });

    searchInput.addEventListener("keyup", stopAll);
    searchInput.addEventListener("keypress", stopAll);
    searchInput.addEventListener("click", stopAll);
    searchInput.addEventListener("mousedown", stopAll);
    searchInput.addEventListener("mouseup", stopAll);
    searchInput.addEventListener("pointerdown", stopAll);
    searchInput.addEventListener("pointerup", stopAll);
    searchInput.addEventListener("focus", (e) => e.stopPropagation());

    headerContainer.appendChild(searchInput);
    const noResults = document.createElement("div");
    noResults.className = "yt-playlist-sorter-no-results";
    noResults.textContent = "No matching playlists";
    noResults.style.display = "none";
    noResults.style.padding = "8px 12px";
    noResults.style.color = "var(--yt-spec-text-secondary)";
    noResults.style.textAlign = "center";
    headerContainer.appendChild(noResults);

    const noResults = document.createElement("div");
    noResults.className = SEARCH_BAR_CLASS + "-empty";
    noResults.textContent = "No playlists found";
    noResults.style.display = "none";
    headerContainer.appendChild(noResults);
    log("injectSearchBar: search bar injected");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => searchInput.focus());
    });
  }

  function observeListChanges(sheetEl) {
    const list = getList(sheetEl);
    if (!list) return;

    let debounceTimer;
    const listObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        listObserver.disconnect();
        sortPlaylistItems(sheetEl);
        listObserver.observe(list, { childList: true });

        const searchInput = sheetEl.querySelector("." + SEARCH_BAR_CLASS);
        if (searchInput) {
          searchInput.dispatchEvent(new Event("input"));
        }
      }, 100);
    });

    listObserver.observe(list, { childList: true });

    const cleanupObserver = new MutationObserver(() => {
      if (!document.contains(sheetEl)) {
        clearTimeout(debounceTimer);
        listObserver.disconnect();
        cleanupObserver.disconnect();
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  }

  function handleSheet(sheetEl) {
    log("handleSheet called on", sheetEl.tagName, sheetEl.className);
    if (!isPlaylistSaveSheet(sheetEl)) {
      log("handleSheet: not a playlist save sheet, skipping");
      return;
    }

    log("handleSheet: IS a playlist save sheet!");

    // Re-open: sheet already processed, just re-sort and clear search
    if (sheetEl.dataset.ytpsSorted) {
      log("handleSheet: re-open detected, re-sorting");
      clearFilterStyles(sheetEl);
      sortPlaylistItems(sheetEl);
      const existingSearch = sheetEl.querySelector("." + SEARCH_BAR_CLASS);
      if (existingSearch) {
        existingSearch.value = "";
      }
      return;
    }

    sortPlaylistItems(sheetEl);
    injectSearchBar(sheetEl);
    observeListChanges(sheetEl);
  }

  function waitForSheetContent(sheetEl) {
    if (isPlaylistSaveSheet(sheetEl)) {
      handleSheet(sheetEl);
      return;
    }

    log("waitForSheetContent: sheet empty, watching for children...");
    let attempts = 0;
    const maxAttempts = 30;

    const contentObserver = new MutationObserver(() => {
      attempts++;
      if (isPlaylistSaveSheet(sheetEl)) {
        log("waitForSheetContent: content appeared after", attempts, "mutations");
        contentObserver.disconnect();
        handleSheet(sheetEl);
      } else if (attempts >= maxAttempts) {
        log("waitForSheetContent: gave up after", maxAttempts, "mutations");
        contentObserver.disconnect();
      }
    });

    contentObserver.observe(sheetEl, { childList: true, subtree: true });

    setTimeout(() => {
      contentObserver.disconnect();
    }, 5000);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.matches && node.matches("yt-sheet-view-model")) {
          log("MutationObserver: yt-sheet-view-model added directly");
          waitForSheetContent(node);
        }

        if (node.querySelectorAll) {
          const sheets = node.querySelectorAll("yt-sheet-view-model");
          if (sheets.length > 0) {
            log("MutationObserver: found", sheets.length, "yt-sheet-view-model inside added node", node.tagName);
          }
          sheets.forEach(waitForSheetContent);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  log("Main MutationObserver started on document.body");

  const attrObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "attributes") continue;
      const target = mutation.target;
      if (
        target.matches &&
        target.matches("tp-yt-iron-dropdown")
      ) {
        const hasAriaHidden = target.hasAttribute("aria-hidden");
        log("attrObserver: tp-yt-iron-dropdown aria-hidden changed, hidden =", hasAriaHidden);
        if (!hasAriaHidden) {
          const sheet = target.querySelector("yt-sheet-view-model");
          log("attrObserver: sheet inside dropdown =", !!sheet);
          if (sheet) waitForSheetContent(sheet);
        }
      }
    }
  });

  attrObserver.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["aria-hidden"],
  });
  log("Attribute observer started");
})();
