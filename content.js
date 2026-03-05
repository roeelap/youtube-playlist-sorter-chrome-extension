(function () {
  const SEARCH_BAR_CLASS = "yt-playlist-sorter-search";
  let sheetCounter = 0;

  function getPlaylistTitle(item) {
    const titleEl = item.querySelector(".yt-list-item-view-model__title");
    return titleEl ? titleEl.textContent.trim() : "";
  }

  function isPlaylistSaveSheet(sheetEl) {
    const header = sheetEl.querySelector("yt-panel-header-view-model");
    if (!header) return false;

    const ariaLabel = header.getAttribute("aria-label") || "";
    if (/save|playlist/i.test(ariaLabel)) return true;

    const createBtn = sheetEl.querySelector(
      'button[aria-label*="playlist" i], button[aria-label*="Playlist" i]'
    );
    if (createBtn) return true;

    const titleText = header.textContent.trim().toLowerCase();
    return titleText.includes("save");
  }

  function getList(sheetEl) {
    return sheetEl.querySelector('yt-list-view-model[role="list"]');
  }

  function sortPlaylistItems(sheetEl) {
    const list = getList(sheetEl);
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

  function injectSearchBar(sheetEl) {
    const headerContainer = sheetEl.querySelector(
      ".ytContextualSheetLayoutHeaderContainer"
    );
    if (!headerContainer) return;

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = SEARCH_BAR_CLASS + "-" + (++sheetCounter);
    searchInput.className = SEARCH_BAR_CLASS;
    searchInput.placeholder = "Search playlists...";
    searchInput.autocomplete = "off";

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      const list = getList(sheetEl);
      if (!list) return;

      const items = list.querySelectorAll("toggleable-list-item-view-model");
      items.forEach((item) => {
        const title = getPlaylistTitle(item).toLowerCase();
        item.style.display = title.includes(query) ? "" : "none";
      });
    });

    searchInput.addEventListener("keydown", (e) => e.stopPropagation());
    searchInput.addEventListener("keyup", (e) => e.stopPropagation());
    searchInput.addEventListener("keypress", (e) => e.stopPropagation());

    headerContainer.appendChild(searchInput);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => searchInput.focus());
    });
  }

  function observeListChanges(sheetEl, listObserverRef) {
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
    listObserverRef.observer = listObserver;

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
    if (!isPlaylistSaveSheet(sheetEl)) return;

    const existingSearch = sheetEl.querySelector("." + SEARCH_BAR_CLASS);
    if (existingSearch) {
      sortPlaylistItems(sheetEl);
      existingSearch.value = "";
      existingSearch.dispatchEvent(new Event("input"));
      return;
    }

    sortPlaylistItems(sheetEl);
    injectSearchBar(sheetEl);

    const listObserverRef = {};
    observeListChanges(sheetEl, listObserverRef);
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
})();
