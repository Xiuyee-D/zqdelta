// Keep English list excerpts on whole words; CSS clamping remains the no-JS fallback.
(() => {
  const summaries = [...document.querySelectorAll(".project-card p:lang(en), .blog-card-description:lang(en)")].map((element) => ({
    element,
    text: element.textContent,
    lines: Number(getComputedStyle(element).webkitLineClamp),
    width: 0,
  }));
  if (!summaries.length) return;

  const fit = (summary) => {
    const { element, text, lines } = summary;
    const width = element.getBoundingClientRect().width;
    if (!width || width === summary.width || !lines) return;
    summary.width = width;
    const measure = element.cloneNode(false);
    measure.removeAttribute("data-word-clamp");
    Object.assign(measure.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      width: `${width}px`,
      display: "block",
      webkitLineClamp: "unset",
      height: "auto",
      maxHeight: "none",
      margin: "0",
    });
    element.after(measure);
    const limit = parseFloat(getComputedStyle(measure).lineHeight) * lines + 0.5;
    const fits = (value) => {
      measure.textContent = value;
      return measure.getBoundingClientRect().height <= limit;
    };
    try {
      if (fits(text)) {
        element.textContent = text;
        element.removeAttribute("data-word-clamp");
        return;
      }
      const ends = [...text.matchAll(/\S+/gu)].map((match) => match.index + match[0].length);
      let low = 0;
      let high = ends.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (fits(`${text.slice(0, ends[middle - 1])}…`)) low = middle;
        else high = middle - 1;
      }
      // An unusually long single word keeps the browser's native overflow handling.
      if (!low) {
        element.textContent = text;
        element.removeAttribute("data-word-clamp");
        return;
      }
      const end = ends[low - 1];
      const ellipsis = document.createElement("span");
      ellipsis.className = "summary-ellipsis";
      ellipsis.setAttribute("aria-hidden", "true");
      const remainder = document.createElement("span");
      remainder.className = "sr-only";
      remainder.textContent = text.slice(end);
      element.replaceChildren(document.createTextNode(text.slice(0, end)), ellipsis, remainder);
      element.dataset.wordClamp = lines;
    } finally {
      measure.remove();
    }
  };
  document.fonts.ready.then(() => {
    summaries.forEach(fit);
    if (typeof ResizeObserver === "function") {
      const byElement = new Map(summaries.map((summary) => [summary.element, summary]));
      const observer = new ResizeObserver((entries) => entries.forEach(({ target }) => fit(byElement.get(target))));
      summaries.forEach(({ element }) => observer.observe(element));
    } else {
      addEventListener("resize", () => summaries.forEach(fit));
    }
  });
})();
