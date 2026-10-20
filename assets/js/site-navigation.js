// Keep native navigation and its old snapshot until visible images are ready.
// This listener must be registered in the head, before the first page reveal.
(() => {
  addEventListener("pagereveal", (event) => {
    const transition = event.viewTransition;
    if (!transition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    root.classList.add("site-navigation-pending");
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(timeout);
      root.classList.remove("site-navigation-pending");
    };
    // A missing or slow image must never leave navigation stuck.
    const timeout = setTimeout(release, 800);

    transition.ready
      .then(async () => {
        const images = [...document.querySelectorAll(".about-avatar, .blog-card-cover img")].filter((image) => {
          const bounds = image.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
        });
        await Promise.allSettled(
          images.map((image) => {
            // History may return to a cover farther down the lazy-loaded list.
            image.loading = "eager";
            return image.decode();
          })
        );
        release();
      })
      .catch(release);
    transition.finished.then(release, release);
  });
})();
