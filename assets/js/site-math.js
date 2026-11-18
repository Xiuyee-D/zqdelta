// Extend al_math's configuration before the deferred MathJax engine runs.
// Resolve every resource relative to the versioned local engine, including baseurl.
(() => {
  const root = new URL(".", document.getElementById("MathJax-script").src).href.replace(/\/$/, "");
  MathJax.loader = {
    paths: { mathjax: root, sre: `${root}/sre/mathmaps` },
    pathFilters: [
      [
        (data) => {
          // Vendor bytes are unchanged; .min.js keeps Terser from processing them.
          if (data.name.startsWith(`${root}/`) && data.name.endsWith(".js") && !data.name.endsWith(".min.js")) {
            data.name = data.name.replace(/\.js$/, ".min.js");
          }
          return true;
        },
        30,
      ],
    ],
  };
  MathJax.chtml = { fontURL: `${root}/output/chtml/fonts/woff-v2` };
})();
