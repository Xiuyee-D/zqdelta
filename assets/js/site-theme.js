// Run in the head, after core initializes the theme and before the first body paint.
// Keep core's preference handling and crossfade complete theme snapshots.
(() => {
  if (typeof transTheme !== "function") return;
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let cleanup;
  let active;
  root.classList.remove("transition");
  transTheme = () => {
    cancelAnimationFrame(cleanup);
    root.classList.add("site-theme-changing");
    // Restore color feedback after the new palette has painted. Transform and
    // opacity keep their own transitions throughout, including on rapid toggles.
    cleanup = requestAnimationFrame(() => {
      cleanup = requestAnimationFrame(() => root.classList.remove("site-theme-changing"));
    });
  };

  if (typeof applyTheme !== "function") return;
  const applyPalette = applyTheme;
  const prepareImages = async () => {
    const images = [...document.querySelectorAll(".voice-terminal:not(.is-ready) .voice-terminal-media > img")].filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    });
    if (!images.length) return;
    let timeout;
    await Promise.race([
      Promise.allSettled(
        images.map((image) => {
          image.loading = "eager";
          return image.decode();
        })
      ),
      new Promise((resolve) => (timeout = setTimeout(resolve, 800))),
    ]);
    clearTimeout(timeout);
  };
  const finish = (transition) => {
    if (active !== transition) return;
    active = null;
    root.classList.remove("site-theme-transition");
  };
  applyTheme = () => {
    // Rapid toggles always resolve to the latest preference, without queuing
    // snapshots or letting an earlier callback restore an outdated palette.
    if (active) {
      const previous = active;
      previous.skipTransition();
      finish(previous);
      applyPalette();
      return;
    }
    if (
      !document.startViewTransition ||
      document.readyState === "loading" ||
      document.hidden ||
      reducedMotion.matches ||
      root.dataset.theme === determineComputedTheme()
    ) {
      applyPalette();
      return;
    }
    // The profile/header belong to the same viewport snapshot for theme
    // changes. Normal page navigation keeps its separate, stationary chrome.
    root.classList.add("site-theme-transition");
    const transition = document.startViewTransition(async () => {
      applyPalette();
      await prepareImages();
    });
    active = transition;
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.then(
      () => finish(transition),
      () => finish(transition)
    );
  };
  const stop = () => {
    if (!active) return;
    const previous = active;
    previous.skipTransition();
    finish(previous);
  };
  addEventListener("pageswap", stop);
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) stop();
  });
})();
