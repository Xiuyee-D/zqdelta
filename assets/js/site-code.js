// Local SVG controls keep code copying independent of icon fonts.
(() => {
  const labels = document.body.dataset;
  const copyIcon = '<path d="M9 5H6a2 2 0 0 0-2 2v13h14V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/>';
  const checkIcon = '<path d="m5 12 4 4L19 6"/>';
  for (const pre of document.querySelectorAll("pre")) {
    const code = pre.querySelector("pre:not(.lineno), code");
    if (!code || pre.closest(".code-display-wrapper")) continue;
    const wrapper = document.createElement("div");
    wrapper.className = "code-display-wrapper";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    const show = (copied) => {
      const label = copied ? labels.copiedCodeLabel : labels.copyCodeLabel;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${copied ? checkIcon : copyIcon}</svg>`;
    };
    show(false);
    let reset;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText.trim());
        clearTimeout(reset);
        show(true);
        reset = setTimeout(() => show(false), 3000);
      } catch {
        // Leave the original selectable code and label in place if copying is unavailable.
        show(false);
      }
    });
    pre.before(wrapper);
    wrapper.append(pre, button);
  }
})();
