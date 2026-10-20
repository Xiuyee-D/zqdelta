// Create the same-origin viewer only after an explicit request. Static artwork
// and the reserved viewport remain available with JavaScript or WebGL disabled.
const figures = [...document.querySelectorAll("[data-voice-terminal]")];
const sessions = new Map();
const theme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const sendTheme = (frame) => frame.contentWindow?.postMessage({ channel: "voice-terminal", type: "theme", theme: theme() }, location.origin);

for (const figure of figures) {
  const button = figure.querySelector("[data-vt-activate]");
  const status = figure.querySelector("[data-vt-status]");
  button.hidden = false;
  const fail = () => {
    const session = sessions.get(figure);
    if (session) {
      clearTimeout(session.timeout);
      session.frame.remove();
      sessions.delete(figure);
    }
    figure.classList.remove("is-ready");
    figure.removeAttribute("aria-busy");
    button.disabled = false;
    button.textContent = figure.dataset.retry;
    status.textContent = figure.dataset.error;
  };
  button.addEventListener("click", () => {
    if (sessions.has(figure)) return;
    button.disabled = true;
    figure.setAttribute("aria-busy", "true");
    status.textContent = figure.dataset.loading;
    const frame = document.createElement("iframe");
    const url = new URL(figure.dataset.src, location.href);
    if (url.origin !== location.origin) {
      fail();
      return;
    }
    url.searchParams.set("theme", theme());
    frame.src = url.href;
    frame.title = figure.dataset.title;
    frame.className = "vt-frame";
    const timeout = setTimeout(fail, 25000);
    sessions.set(figure, { frame, timeout, fail });
    figure.querySelector(".voice-terminal-media").append(frame);
  });
}
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.channel !== "voice-terminal") return;
  const entry = [...sessions].find(([, session]) => session.frame.contentWindow === event.source);
  if (!entry) return;
  const [figure, session] = entry;
  if (event.data.type === "error") {
    session.fail();
    return;
  }
  if (event.data.type !== "ready") return;
  clearTimeout(session.timeout);
  figure.removeAttribute("aria-busy");
  figure.querySelector("[data-vt-status]").textContent = "";
  sendTheme(session.frame);
  figure.classList.add("is-ready");
  session.frame.contentDocument?.querySelector("canvas")?.focus({ preventScroll: true });
});
new MutationObserver(() => {
  for (const { frame } of sessions.values()) sendTheme(frame);
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
