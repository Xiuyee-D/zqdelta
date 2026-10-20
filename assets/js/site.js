// Small enhancements; links and native details continue to work without JS.
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = new WeakMap();
  const disclosureDuration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-motion-expand")) || 240;

  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    backToTop.setAttribute("role", "button");
    backToTop.setAttribute("aria-label", document.body.dataset.backToTopLabel);
    backToTop.querySelector("svg")?.setAttribute("aria-hidden", "true");
    const updateBackToTop = () => {
      const hidden = backToTop.classList.contains("hidden");
      backToTop.tabIndex = hidden ? -1 : 0;
      backToTop.setAttribute("aria-hidden", String(hidden));
      if (hidden && document.activeElement === backToTop) backToTop.blur();
    };
    updateBackToTop();
    new MutationObserver(updateBackToTop).observe(backToTop, { attributes: true, attributeFilter: ["class"] });
    backToTop.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) backToTop.click();
    });
  }

  const themeToggle = document.getElementById("light-toggle");
  if (themeToggle && typeof setThemeSetting === "function" && typeof toggleThemeSetting === "function") {
    const root = document.documentElement;
    // Keep core's early initialization and theme integrations. Its click handler
    // calls this binding, so replace only the three-setting cycling policy.
    toggleThemeSetting = () => {
      const current = ["light", "dark"].includes(root.dataset.themeSetting) ? root.dataset.themeSetting : root.dataset.theme;
      setThemeSetting(current === "dark" ? "light" : "dark");
    };
    const updateThemeLabel = () => {
      const label = root.dataset.theme === "dark" ? themeToggle.dataset.lightLabel : themeToggle.dataset.darkLabel;
      themeToggle.setAttribute("aria-label", label);
      themeToggle.title = label;
    };
    updateThemeLabel();
    new MutationObserver(updateThemeLabel).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }

  // Return past this detail's fragment entries to the actual list, retaining
  // native scroll/focus restoration. Keep the normal list URL as a fallback.
  const returnLinks = document.querySelectorAll("[data-project-return], [data-blog-return]");
  if (returnLinks.length) {
    const arrivalHistoryLength = history.length;
    let traversedWithinPage = false;
    addEventListener("hashchange", () => (traversedWithinPage = true));
    addEventListener("popstate", () => (traversedWithinPage = true));
    const listHistoryOffset = (destination) => {
      const current = window.navigation?.currentEntry;
      if (current && typeof window.navigation.entries === "function") {
        const earlier = window.navigation
          .entries()
          .filter((entry) => entry.index < current.index)
          .reverse();
        for (const entry of earlier) {
          if (!entry.url) return null;
          const url = new URL(entry.url);
          if (entry.sameDocument || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)) {
            continue;
          }
          return url.origin === destination.origin && url.pathname === destination.pathname ? entry.index - current.index : null;
        }
        return null;
      }
      // Older browsers cannot inspect entries. A single back step is safe only
      // before any fragment/history traversal; otherwise follow the list link.
      if (traversedWithinPage || location.hash || history.length !== arrivalHistoryLength || history.length <= 1 || !document.referrer) return null;
      const previous = new URL(document.referrer);
      return previous.origin === destination.origin && previous.pathname === destination.pathname ? -1 : null;
    };
    returnLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const offset = listHistoryOffset(new URL(link.href));
        if (offset === null) return;
        event.preventDefault();
        history.go(offset);
      });
    });
  }

  // Only overflowing reading regions need an extra stop for native arrow-key scrolling.
  const readingRegions = [...document.querySelectorAll(".nano-prose pre, .nano-prose .blog-table, .project-detail .nano-prose table")];
  if (readingRegions.length) {
    const updateReadingFocus = () => {
      for (const region of readingRegions) {
        if (region.scrollWidth > region.clientWidth + 1) region.tabIndex = 0;
        else region.removeAttribute("tabindex");
      }
    };
    updateReadingFocus();
    document.fonts.ready.then(updateReadingFocus);
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(updateReadingFocus);
      readingRegions.forEach((region) => observer.observe(region));
    } else addEventListener("resize", updateReadingFocus);
  }

  const article = document.querySelector(".blog-detail .nano-prose");
  const outlines = [...document.querySelectorAll("[data-blog-toc]")];
  if (article && outlines.length) {
    const links = outlines.flatMap((outline) => [...outline.querySelectorAll("a[href^='#']")]);
    const destinations = new Map(links.map((link) => [link, decodeURIComponent(link.hash.slice(1))]));
    const outlinedIds = new Set(destinations.values());
    const headings = [...article.querySelectorAll("h2[id], h3[id]")].filter((heading) => outlinedIds.has(heading.id));
    let activeId;
    let queued = false;
    const updateOutline = () => {
      queued = false;
      if (!headings.length) return;
      const threshold = parseFloat(getComputedStyle(headings[0]).scrollMarginTop) + 2;
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > threshold) break;
        current = heading;
      }
      if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = headings.at(-1);
      if (current.id === activeId) return;
      activeId = current.id;
      for (const link of links) {
        if (destinations.get(link) === activeId) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
      // Scroll only the desktop outline; never move the article or author column.
      const desktop = document.querySelector(".blog-outline .blog-toc-nav");
      const active = desktop?.querySelector('[aria-current="location"]');
      if (active && desktop.clientHeight) {
        const box = active.getBoundingClientRect();
        const viewport = desktop.getBoundingClientRect();
        if (box.top < viewport.top || box.bottom > viewport.bottom) desktop.scrollTop += box.top - viewport.top - 8;
      }
    };
    const queueOutline = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(updateOutline);
    };
    addEventListener("scroll", queueOutline, { passive: true });
    addEventListener("resize", queueOutline);
    addEventListener("hashchange", queueOutline);
    document.fonts.ready.then(queueOutline);
    updateOutline();
  }

  document.querySelectorAll("details[data-disclosure]").forEach((details) => {
    const summary = details.querySelector(":scope > summary");
    const body = details.querySelector(":scope > .disclosure-body");
    if (!summary || !body) return;
    summary.addEventListener("click", (event) => {
      if (reducedMotion.matches || !body.animate) return;
      event.preventDefault();
      const previous = states.get(details);
      const expanding = previous ? !previous.expanding : !details.open;
      const height = details.open ? body.getBoundingClientRect().height : 0;
      previous?.animation.cancel();
      details.open = true;
      body.classList.add("is-animating");
      const animation = body.animate(
        [
          { height: `${height}px`, opacity: height ? 1 : 0 },
          { height: `${expanding ? body.scrollHeight : 0}px`, opacity: expanding ? 1 : 0 },
        ],
        { duration: disclosureDuration, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" }
      );
      states.set(details, { animation, expanding });
      animation.finished
        .then(() => {
          details.open = expanding;
          animation.cancel();
          body.classList.remove("is-animating");
          states.delete(details);
        })
        .catch(() => {});
    });
  });

  const toggle = document.querySelector("[data-site-nav-toggle]");
  const menu = toggle && document.getElementById(toggle.dataset.siteNavToggle);
  if (toggle && menu) {
    const mobile = window.matchMedia("(max-width: 575px)");
    const setMenu = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.classList.toggle("collapsed", !open);
      menu.classList.toggle("show", open);
      menu.inert = mobile.matches && !open;
    };
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
    mobile.addEventListener("change", () => setMenu(false));
    setMenu(false);
  }
})();
