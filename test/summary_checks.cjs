const assert = require("node:assert/strict");

module.exports = async function checkSummaries(page) {
  const html = await (await page.request.get(page.url())).text();
  const samples = await page.evaluate((source) => {
    const selector = ".project-card p:lang(en), .blog-card-description:lang(en)";
    const original = new DOMParser().parseFromString(source, "text/html");
    const expected = [...original.querySelectorAll(selector)].map((element) => element.textContent);
    return [...document.querySelectorAll(selector)].map((element, index) => {
      const style = getComputedStyle(element);
      const ellipsis = element.querySelector('[aria-hidden="true"]');
      const remainder = element.querySelector(".sr-only");
      return {
        expected: expected[index],
        text: [...element.childNodes]
          .filter((node) => node !== ellipsis)
          .map((node) => node.textContent)
          .join(""),
        truncated: !!ellipsis,
        tail: remainder?.textContent,
        ellipsis: ellipsis ? getComputedStyle(ellipsis, "::before").content : "",
        alignment: style.textAlign,
        height: element.getBoundingClientRect().height,
        limit: parseFloat(style.lineHeight) * (element.closest(".project-card") ? 3 : 2),
      };
    });
  }, html);
  assert.ok(samples.length, "Missing English excerpt fixtures");
  for (const sample of samples) {
    assert.equal(sample.alignment, "justify", "Keep English excerpt justification");
    assert.equal(sample.text, sample.expected, "Preserve the complete source excerpt for assistive reading");
    assert.ok(sample.height <= sample.limit + 1, "Excerpt exceeds its intended line count");
    if (sample.truncated) {
      assert.ok(sample.ellipsis.includes("…"), "Truncated excerpts need a visible ellipsis");
      assert.match(sample.tail, /^\s/, "Truncate at a word boundary");
    }
  }
};
