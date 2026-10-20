// Run against bin/dev start. Screenshots are optional via PROJECT_UI_SCREENSHOTS.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";
const screenshots = process.env.PROJECT_UI_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, { recursive: true });

async function screenshot(page, name) {
  if (!screenshots) return;
  // Let the 160ms crossfade and native history restoration finish first.
  await page.waitForTimeout(220);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true, animations: "disabled" });
}

async function visit(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
}

async function noOverflow(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    `${page.url()}: viewport overflow`
  );
}

async function contrast(page, selectors) {
  const values = await page.evaluate((selectors) => {
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    const luminance = (value) =>
      rgb(value)
        .slice(0, 3)
        .map((value) => (value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [];
      let ancestor = element;
      while (ancestor && rgb(getComputedStyle(ancestor).backgroundColor)[3] === 0) ancestor = ancestor.parentElement;
      const background = getComputedStyle(ancestor || document.documentElement).backgroundColor;
      const [a, b] = [luminance(getComputedStyle(element).color), luminance(background)].sort((a, b) => a - b);
      return [{ selector, ratio: (b + 0.05) / (a + 0.05) }];
    });
  }, selectors);
  for (const value of values) assert.ok(value.ratio >= 4.5 - 0.01, `${page.url()} ${value.selector}: contrast ${value.ratio}`);
}

// Browser-only fixtures exercise content shapes absent from the real projects.
// They never touch Markdown, production output or the next navigation.
async function stressContent(page) {
  await page.evaluate(() => {
    for (const selector of [".project-facts-topics .project-fact-values", ".project-facts-stack .project-fact-values"]) {
      const list = document.querySelector(selector);
      for (let index = 0; index < 8; index++) {
        const item = document.createElement("li");
        item.textContent = index === 7 ? "VeryLongUnbrokenIdentifier".repeat(6) : `Wrapping fixture ${index}`;
        list.append(item);
      }
    }
    const prose = document.querySelector(".nano-prose");
    const pre = document.createElement("pre");
    pre.id = "overflow-code-fixture";
    const code = document.createElement("code");
    code.textContent = "long_code_line_".repeat(60);
    pre.append(code);
    const table = document.createElement("table");
    table.id = "overflow-table-fixture";
    const row = table.insertRow();
    for (let index = 0; index < 12; index++) {
      const cell = row.insertCell();
      cell.textContent = `UnbrokenColumnValue${index}`;
      cell.style.whiteSpace = "nowrap";
    }
    const image = document.createElement("img");
    image.id = "image-ratio-fixture";
    image.alt = "Browser-only image size fixture";
    image.width = 120;
    image.height = 80;
    image.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="gray"/></svg>')}`;
    const paragraph = document.createElement("p");
    const link = document.createElement("a");
    link.href = "#contributions";
    link.textContent = "https://example.org/" + "long-url-segment/".repeat(15);
    paragraph.append(link);
    prose.append(pre, table, image, paragraph);
  });
  await page.locator("#image-ratio-fixture").evaluate((image) => image.decode());
  await noOverflow(page);
  for (const selector of ["#overflow-code-fixture", "#overflow-table-fixture"]) {
    const scroll = await page.locator(selector).evaluate((element) => {
      element.scrollLeft = 150;
      return { left: element.scrollLeft, overflow: getComputedStyle(element).overflowX, width: element.clientWidth, content: element.scrollWidth };
    });
    assert.equal(scroll.overflow, "auto");
    assert.ok(scroll.content > scroll.width && scroll.left > 0, `${selector}: expected local horizontal scrolling`);
  }
  const image = await page.locator("#image-ratio-fixture").boundingBox();
  assert.ok(Math.abs(image.width - 120) <= 0.1 && Math.abs(image.height - 80) <= 0.1, "Small images must preserve their size and aspect ratio");
  const link = page.locator(".nano-prose p a").last();
  await link.focus();
  // A preceding image click establishes pointer modality. Exercise real keyboard
  // navigation before checking :focus-visible, then return to the same link.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.ok(await link.evaluate((element) => element === document.activeElement), "Keyboard navigation must return to the prose link");
  assert.equal(await link.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
  await contrast(page, [".nano-prose p a"]);
}

(async () => {
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
  let configurations = 0;
  try {
    for (const locale of ["/zh", ""]) {
      for (const width of [375, 768, 1440]) {
        for (const colorScheme of ["light", "dark"]) {
          const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          try {
            const label = `${locale ? "zh" : "en"}-${width}-${colorScheme}`;
            const listUrl = `${base}${locale}/projects/`;
            await visit(page, listUrl);
            assert.equal(await page.locator("html").getAttribute("data-theme"), colorScheme);
            const cards = page.locator(".project-card-primary");
            const expectedSlugs = [
              "olfactory-flavor-perception",
              "family-recipe-manager",
              "portable-ai-voice-terminal",
              "integrated-test-control",
              "railway-accident-graph",
              "railway-knowledge",
            ];
            expectedSlugs.splice(1, 0, "multimodal-sentiment-analysis");
            assert.equal(await cards.count(), expectedSlugs.length);
            assert.equal(await page.locator(".project-group, #work, #fun").count(), 0);
            assert.deepEqual(
              await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("href").split("/").filter(Boolean).at(-1))),
              expectedSlugs
            );
            const projects = [];
            for (const card of await cards.all()) {
              const title = await card.locator("h2").textContent();
              const description = await card.locator("p").textContent();
              const bounds = await card.boundingBox();
              const sequence = await card.evaluate((element) =>
                ["h2", "p", ".project-card-labels"].map((selector) => element.querySelector(selector).getBoundingClientRect().top)
              );
              assert.ok(
                sequence.every((top, index) => index === 0 || top > sequence[index - 1]),
                "Cards must read title, summary, then the shared metadata row"
              );
              const labels = card.locator(".project-card-labels");
              assert.equal(await card.locator(".project-card-meta").count(), 0);
              assert.equal(await labels.locator(":scope > .project-card-date").count(), 1);
              assert.equal(await labels.locator(":scope > .project-card-kind").count(), 1);
              assert.ok((await labels.locator(":scope > .project-card-topic").count()) > 0);
              const kind = await labels.locator(".project-card-kind").boundingBox();
              const firstTopic = await labels.locator(".project-card-topic").first().boundingBox();
              if (width >= 768) {
                const date = await labels.locator(".project-card-date").boundingBox();
                assert.ok(Math.abs(kind.y - firstTopic.y) <= 0.1, "Kind and first direction should share a line when space permits");
                assert.ok(
                  Math.abs(date.y + date.height / 2 - kind.y - kind.height / 2) <= 0.1,
                  "Date and labels should share a line when space permits"
                );
              }
              for (const selector of [".project-card-date", ".project-card-kind", ".project-card-topic"]) {
                assert.equal(
                  await labels
                    .locator(selector)
                    .first()
                    .evaluate((element) => getComputedStyle(element).fontSize),
                  selector === ".project-card-date" ? "14px" : "13px"
                );
              }
              assert.ok(
                await labels
                  .locator("li")
                  .evaluateAll((items) =>
                    items.every((item) => item.getBoundingClientRect().right <= item.parentElement.getBoundingClientRect().right + 1)
                  ),
                "Labels must wrap inside their row"
              );
              assert.equal(await page.getByRole("link", { name: title, exact: true }).count(), 1, "Card must have a concise accessible name");
              assert.equal(await card.locator("img, .project-resources, .project-facts-stack").count(), 0);
              assert.ok(
                await card.locator("h2").evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
                "Project title must not be clipped"
              );
              assert.ok(
                await card.locator("p").evaluate((element) => element.clientHeight <= parseFloat(getComputedStyle(element).lineHeight) * 3 + 1)
              );
              projects.push({
                title,
                description,
                bounds,
                href: await card.getAttribute("href"),
                kind: await card.locator(".project-card-kind").textContent(),
                period: await card.locator(".project-card-date").textContent(),
              });
            }
            await noOverflow(page);
            await contrast(page, [".project-card h2", ".project-card p", ".project-card-kind", ".project-card-date", ".project-card-topic"]);
            const first = cards.first();
            const before = await first.boundingBox();
            await first.hover();
            await page.waitForTimeout(320);
            assert.deepEqual(await first.boundingBox(), before, "Hover must preserve card geometry");
            assert.equal(await first.locator(".arrow-stem").evaluate((element) => getComputedStyle(element).transform), "none");
            await contrast(page, [".project-card:hover p", ".project-card:hover .project-card-kind"]);
            await page.mouse.move(0, 0);
            await first.focus();
            assert.equal(await first.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
            await page.keyboard.press("Tab");
            assert.ok(await cards.nth(1).evaluate((element) => element === document.activeElement), "Each card must occupy one keyboard tab stop");
            await first.focus();
            await page.keyboard.press("Enter");
            // Match visit(): verify the destination DOM without waiting on optional CDN assets.
            await page.waitForURL((url) => url.pathname === projects[0].href, { waitUntil: "domcontentloaded" });
            await page.locator(".nano-back").focus();
            await page.keyboard.press("Enter");
            await page.waitForURL((url) => url.pathname === new URL(listUrl).pathname, { waitUntil: "domcontentloaded" });
            await page.evaluate(() => {
              document.activeElement.blur();
              scrollTo(0, 0);
            });
            await screenshot(page, `list-${label}`);

            for (const project of projects) {
              await visit(page, new URL(project.href, base).href);
              assert.equal(await page.locator(".detail-header h1").textContent(), project.title);
              assert.equal(await page.locator(".project-facts-overview dd").textContent(), project.description);
              assert.equal((await page.locator(".project-meta").textContent()).trim(), project.kind);
              assert.deepEqual(
                await page.locator(".project-facts dt").allTextContents(),
                locale === "/zh" ? ["项目概述", "项目方向", "核心技术"] : ["Project overview", "Project areas", "Core technologies"]
              );
              assert.ok((await page.locator(".project-context-period").textContent()).trim().endsWith(project.period));
              assert.equal(await page.locator(".project-context").count(), 1);
              await contrast(page, [".project-context-period", ".project-context-partner"]);
              assert.equal(
                await page
                  .locator(".detail-summary, .project-section-nav, .detail-cover, .project-resources, .nano-prose ul, .nano-prose ol")
                  .count(),
                0
              );
              assert.equal(await page.locator(".project-facts-topics .project-fact-values").count(), 1);
              assert.equal(await page.locator(".project-facts-stack .project-fact-values").count(), 1);
              const sizes = await page.evaluate(() =>
                [".detail-header h1", ".nano-prose h2", ".nano-prose h3", ".nano-prose > p"].map((selector) =>
                  parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)
                )
              );
              assert.ok(
                sizes.every((size, index) => index === 0 || size < sizes[index - 1]),
                "Heading sizes must descend from H1 through body"
              );
              for (const selector of [".project-detail", ".nano-prose"]) {
                const bounds = await page.locator(selector).boundingBox();
                for (const axis of ["x", "width"])
                  assert.ok(Math.abs(bounds[axis] - project.bounds[axis]) <= 0.1, "List and detail columns must align");
              }
              if (width === 375) {
                assert.ok(
                  await page
                    .locator(".project-facts > div")
                    .evaluateAll((rows) =>
                      rows.every(
                        (row) => row.querySelector("dd").getBoundingClientRect().top >= row.querySelector("dt").getBoundingClientRect().bottom
                      )
                    ),
                  "Mobile facts must stack"
                );
                for (const link of await page.locator(".project-pagination a").all()) {
                  assert.ok(
                    Math.abs((await link.boundingBox()).width - project.bounds.width) <= 0.1,
                    "Mobile sibling links must use the full column"
                  );
                }
              }
              await noOverflow(page);
              await contrast(page, [
                ".detail-header h1",
                ".nano-prose h2",
                ".nano-prose h3",
                ".nano-prose p",
                ".project-facts dt",
                ".project-facts-stack dd",
              ]);
              const slug = project.href.split("/").filter(Boolean).at(-1);
              if (slug === "multimodal-sentiment-analysis") {
                const diagram = page.locator(".nano-prose figure img");
                await diagram.scrollIntoViewIfNeeded();
                await diagram.evaluate((image) => image.decode());
                assert.deepEqual(await diagram.evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight })), {
                  width: 2400,
                  height: 1302,
                });
                const bounds = await diagram.boundingBox();
                assert.ok(Math.abs(bounds.width / bounds.height - 2400 / 1302) < 0.01, "TARF architecture must preserve its aspect ratio");
                assert.equal(await page.locator(".nano-prose figure a").count(), 0, "TARF architecture must display inline");
                await noOverflow(page);
              }
              if (slug === "olfactory-flavor-perception") {
                const diagram = page.locator(".nano-prose figure img");
                await diagram.scrollIntoViewIfNeeded();
                await diagram.evaluate((image) => image.decode());
                const dimensions = await diagram.evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight }));
                assert.deepEqual(dimensions, { width: 2400, height: 1350 });
                const text = await page.locator(".nano-prose").textContent();
                for (const count of locale === "/zh" ? ["30 名受试者", "908 个事件"] : ["30 participants", "908 events"])
                  assert.ok(text.includes(count), "The current localized dataset scope must remain visible");
                assert.ok(!/1,978|1978|49 名|62 个|49 unique|62 acquisition|Windows/.test(text), "Prose must show only the dataset actually used");
                assert.equal(await page.locator(".nano-prose figure a").count(), 0, "Architecture image must have no link");
                assert.ok(!(await page.locator(".nano-prose figcaption").innerText()).includes("点击图片"));
                const currentUrl = page.url();
                const openPages = page.context().pages().length;
                await diagram.click();
                assert.equal(page.url(), currentUrl, "Clicking the diagram must stay on the detail page");
                assert.equal(page.context().pages().length, openPages, "Clicking the diagram must not open a tab");
              }
              await screenshot(page, `${slug}-${label}`);
            }
            await stressContent(page);
            await screenshot(page, `stress-${label}`);
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.locator(".nano-back").focus();
            await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector(".nano-back")).transitionDuration) <= 0.01);
            assert.deepEqual(errors, []);
            configurations++;
            console.log(
              `Passed ${label}: ${projects.length} cards/details, keyboard entry/return, hierarchy, contrast, image sizing and local overflow.`
            );
          } finally {
            await page.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Projects UI passed ${configurations} viewport/theme/language configurations.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
