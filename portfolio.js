const projectGrid = document.querySelector("[data-project-grid]");

if (projectGrid) {
  const cards = Array.from(projectGrid.querySelectorAll("[data-project-card]"));
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  const status = document.querySelector("[data-filter-status]");
  const loadMore = document.querySelector("[data-load-more]");
  const emptyState = document.querySelector("[data-empty-state]");
  const pageSize = Number(projectGrid.dataset.pageSize) || 6;
  const validFilters = new Set(filters.map((button) => button.dataset.filter));
  const params = new URLSearchParams(window.location.search);
  let activeFilter = validFilters.has(params.get("category")) ? params.get("category") : "all";
  let visibleCount = pageSize;
  const portfolioStorageKey = "kpdPortfolioState";

  try {
    const saved = JSON.parse(readSession(portfolioStorageKey) || "{}");
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const navigation = performance.getEntriesByType("navigation")[0];
    if (saved.url === currentUrl && navigation?.type === "back_forward" && Date.now() - saved.savedAt < 30 * 60 * 1000) {
      if (validFilters.has(saved.filter)) activeFilter = saved.filter;
      if (Number.isFinite(saved.visibleCount)) visibleCount = Math.max(pageSize, saved.visibleCount);
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: saved.scrollY || 0, behavior: "instant" })));
    }
  } catch {
    removeSession(portfolioStorageKey);
  }

  const updateUrl = () => {
    const url = new URL(window.location.href);
    if (activeFilter === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", activeFilter);
    window.history.replaceState({}, "", url);
  };

  const render = () => {
    const matching = cards.filter((card) =>
      activeFilter === "all" || card.dataset.categories.split(" ").includes(activeFilter),
    );

    cards.forEach((card) => {
      const match = matching.includes(card);
      const withinLimit = matching.indexOf(card) < visibleCount;
      card.hidden = !(match && withinLimit);
    });

    filters.forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    projectGrid.querySelectorAll("[data-project-link]").forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href, window.location.origin);
      url.searchParams.set("from", activeFilter);
      link.href = `${url.pathname}${url.search}`;
    });

    const activeButton = filters.find((button) => button.dataset.filter === activeFilter);
    const label = activeFilter === "all" ? "all" : activeButton?.childNodes[0]?.textContent.trim().toLowerCase();
    if (status) status.textContent = `Showing ${Math.min(visibleCount, matching.length)} of ${matching.length} ${label || "matching"} project${matching.length === 1 ? "" : "s"}`;
    if (loadMore) loadMore.hidden = matching.length <= visibleCount;
    if (emptyState) emptyState.hidden = matching.length !== 0;
    projectGrid.dispatchEvent(new Event("kpd:portfolio-updated"));
  };

  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    visibleCount = pageSize;
    updateUrl();
    render();
  }));

  loadMore?.addEventListener("click", () => {
    visibleCount += pageSize;
    render();
  });

  const savePortfolioState = () => {
    writeSession(portfolioStorageKey, JSON.stringify({
      url: `${window.location.pathname}${window.location.search}`,
      filter: activeFilter,
      visibleCount,
      scrollY: window.scrollY,
      savedAt: Date.now(),
    }));
  };

  projectGrid.querySelectorAll("[data-project-link]").forEach((link) => link.addEventListener("click", savePortfolioState));
  window.addEventListener("pagehide", savePortfolioState);

  render();
}
