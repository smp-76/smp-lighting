/* Optional functional QA: uses Playwright + Chromium; no application build step. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "catalog-data.json")));
const base = process.env.SMP_QA_BASE_URL || "http://127.0.0.1:8000";
const out = process.env.SMP_QA_ARTIFACT_DIR || "/tmp/smp-lighting-qa";
fs.mkdirSync(out, { recursive: true });
const chosen = new Set(process.argv.slice(2));
const results = [];
const errors = [];
const badResponses = [];
let browser, page;
async function group(name, fn) {
  if (chosen.size && !chosen.has(name)) return;
  await fn();
  results.push({ name, status: "passed" });
  console.log("PASS", name);
}
async function navigate(url) {
  await page.goto(url.startsWith("http") ? url : base + url, {
    waitUntil: "networkidle",
  });
  if (url.includes("catalog.html") || url.includes("series.html"))
    await page.waitForFunction(
      () =>
        document.querySelector("#grid")?.getAttribute("aria-busy") === "false",
    );
  if (url.includes("selection.html"))
    await page.waitForFunction(
      () =>
        document
          .querySelector("#selectionResults")
          ?.getAttribute("aria-busy") === "false",
    );
}
async function cards(n) {
  await page.waitForFunction(
    (n) => document.querySelectorAll("#grid .card").length === n,
    n,
  );
}
async function reset() {
  await page.click("#reset");
  await cards(174);
}
async function compareOpen() {
  await page.click("#compareOpen");
  await page.waitForSelector("#compareModal.open");
}
(async () => {
  browser = await chromium.launch({
    executablePath: process.env.SMP_QA_CHROMIUM || "/usr/bin/chromium",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) =>
    errors.push({ url: page.url(), message: e.stack }),
  );
  page.on("response", (r) => {
    if (r.status() >= 400)
      badResponses.push({ url: r.url(), status: r.status() });
  });
  await group("layout", async () => {
    const pages = [
      "/",
      "/catalog.html",
      "/selection.html",
      "/series.html?series=ledel-l-lego-ii",
      "/elektrosnabzhenie.html",
      "/privacy.html",
    ];
    for (const width of [375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      for (const url of pages) {
        await navigate(url);
        assert.ok(await page.locator("h1").isVisible(), url + " H1");
        const dimensions = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          viewport: innerWidth,
        }));
        assert.ok(
          dimensions.scroll <= dimensions.viewport + 1,
          url + " overflows " + width + ": " + JSON.stringify(dimensions),
        );
        const broken = await page
          .locator("img")
          .evaluateAll((imgs) =>
            imgs
              .filter((i) => i.complete && i.currentSrc && !i.naturalWidth)
              .map((i) => i.currentSrc),
          );
        assert.deepEqual(broken, [], url + " broken images");
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: path.join(
              out,
              `${url.split("?")[0].replace(/\W/g, "") || "home"}-${width}.png`,
            ),
          });
      }
      console.log("  verified six pages at", width, "px");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await group("home", async () => {
    await navigate("/");
    const tabs = page.locator(".industry-tab");
    for (let i = 0; i < (await tabs.count()); i++) {
      await tabs.nth(i).click();
      await page.waitForFunction(
        (i) =>
          document
            .querySelectorAll(".industry-tab")
            [i].getAttribute("aria-selected") === "true",
        i,
      );
      assert.ok((await page.locator("#industry-projects li").count()) > 0);
    }
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click(".smp-menu");
    assert.equal(
      await page.locator(".smp-menu").getAttribute("aria-expanded"),
      "true",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".smp-menu").getAttribute("aria-expanded"),
      "false",
    );
    assert.ok(
      await page
        .locator(".smp-menu")
        .evaluate((el) => document.activeElement === el),
    );
    await page.click(".smp-menu");
    await page.locator('.smp-nav a[href="catalog.html"]').click();
    await page.waitForURL("**/catalog.html");
    await cards(174);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await group("catalog", async () => {
    await navigate("/catalog.html");
    await cards(174);
    assert.equal(
      (await page.locator("#modelStat").innerText()).replace(/\D/g, ""),
      "18226",
    );
    const verify = async (filter, control, value) => {
      await page.selectOption(control, value);
      const count = data.series.filter(filter).length;
      await cards(count);
      assert.ok(count > 0 && count < 174);
      await reset();
    };
    await verify((s) => s.brand === "LEDEL", "#brand", "LEDEL");
    await verify(
      (s) => s.categories.some((c) => c.section === "Наружное"),
      "#section",
      "Наружное",
    );
    await verify(
      (s) => s.categories.some((c) => c.subsection === "Общепромышленные"),
      "#subsection",
      "Общепромышленные",
    );
    await verify(
      (s) => s.models.some((m) => m.ip === "IP66"),
      "#catalogIp",
      "IP66",
    );
    await verify(
      (s) => s.models.some((m) => m.cri !== null && m.cri >= 90),
      "#catalogCri",
      "90",
    );
    await verify(
      (s) => s.models.some((m) => String(m.cct) === "4000"),
      "#catalogCct",
      "4000",
    );
    await page.selectOption("#catalogKss", "narrow:30");
    assert.ok((await page.locator("#grid .card").count()) > 0);
    assert.ok((await page.locator("#grid .card").count()) < 174);
    await reset();
    await page.fill("#powerMin", "135");
    await page.fill("#powerMax", "135");
    await cards(
      data.series.filter((s) => s.models.some((m) => m.power === 135)).length,
    );
    await reset();
    await page.selectOption("#brand", "LEDEL");
    await page.selectOption("#catalogCri", "70");
    await page.selectOption("#catalogCct", "4000");
    await page.selectOption("#catalogIp", "IP66");
    await page.fill("#powerMin", "135");
    await page.fill("#powerMax", "135");
    await page.waitForFunction(
      () => new URL(location.href).searchParams.get("powerMax") === "135",
    );
    await page.reload({ waitUntil: "networkidle" });
    for (const [id, value] of [
      ["brand", "LEDEL"],
      ["catalogCri", "70"],
      ["catalogCct", "4000"],
      ["catalogIp", "IP66"],
      ["powerMin", "135"],
      ["powerMax", "135"],
    ])
      assert.equal(await page.locator("#" + id).inputValue(), value);
    await page.click('[data-clear-filter="cri"]');
    assert.equal(await page.locator("#catalogCri").inputValue(), "");
    assert.equal(await page.locator("#brand").inputValue(), "LEDEL");
    await reset();
    await page.fill("#q", "LGII135-214-513-18");
    await cards(1);
    await page.click('[data-open-series="ledel-l-lego-ii"]');
    assert.equal(await page.locator("#modalTitle").innerText(), "L-lego II");
    await page.fill("#mq", "LGII135-214-513-18");
    assert.equal(await page.locator("[data-model-select]").count(), 1);
    await page.keyboard.press("Escape");
    await reset();
    await page.fill("#q", "impossible-smp-query-123456");
    await cards(0);
    assert.ok(
      (await page.locator("#grid .empty").innerText()).includes(
        "оборудование не найдено",
      ),
    );
    await page.click("#emptyReset");
    await cards(174);
    await page.selectOption("#brand", "PLG");
    assert.equal(await page.locator("#grid .image img").count(), 0);
    assert.equal(await page.locator("#grid .placeholder").count(), 41);
    await reset();
    const largest = [...data.series].sort(
      (a, b) => b.models.length - a.models.length,
    )[0];
    await navigate("/series.html?series=" + largest.id);
    assert.equal(await page.locator("[data-model-select]").count(), 100);
    await page.click("#modelsNext");
    assert.equal(
      await page.locator("[data-model-select]").first().innerText(),
      largest.models[100].sku,
    );
    await page.fill("#mq", largest.models.at(-1).sku);
    assert.equal(await page.locator("[data-model-select]").count(), 1);
    assert.ok(
      (await page.locator(".passport-title").innerText()).includes(
        largest.models.at(-1).sku,
      ),
    );
    const colored = data.series.find((s) =>
      s.models.some((m) => m.cri === null),
    );
    const model = colored.models.find((m) => m.cri === null);
    await navigate(
      "/series.html?series=" +
        colored.id +
        "&sku=" +
        encodeURIComponent(model.sku),
    );
    assert.ok(
      (await page.locator(".model-passport").innerText()).includes(
        "Не применяется",
      ),
    );
    console.log(
      "  full model pagination verified for",
      largest.id,
      largest.models.length,
      "models",
    );
  });
  await group("comparison", async () => {
    await navigate("/catalog.html");
    for (let i = 0; i < 3; i++)
      await page.locator("[data-compare]").nth(i).click();
    await compareOpen();
    assert.equal(await page.locator(".compare-table thead th").count(), 4);
    assert.ok((await page.locator(".compare-table .diff").count()) > 0);
    await page.locator("[data-remove-compare]").first().click();
    assert.equal(await page.locator(".compare-table thead th").count(), 3);
    await page.locator("[data-compare-close][aria-label]").click();
    assert.equal(
      await page.locator("#compareModal").getAttribute("aria-hidden"),
      "true",
    );
    await compareOpen();
    await page
      .locator("#compareModal .modal-backdrop")
      .click({ position: { x: 5, y: 5 } });
    assert.equal(
      await page.locator("#compareModal").getAttribute("aria-hidden"),
      "true",
    );
    await compareOpen();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#compareModal").getAttribute("aria-hidden"),
      "true",
    );
    await page.click("#compareClear");
    await page.locator("[data-open-series]").first().click();
    await page.locator("[data-compare-model]").nth(0).click();
    await page.locator("[data-compare-model]").nth(1).click();
    await page.click("#modelCompareLaunch");
    await page.waitForSelector("#compareModal.open");
    assert.equal(await page.locator(".compare-table thead th").count(), 3);
    assert.ok(
      (
        await page.locator(".compare-product strong").first().innerText()
      ).includes(" / "),
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#modal").getAttribute("aria-hidden"),
      "false",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#modal").getAttribute("aria-hidden"),
      "true",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate(
      "/catalog.html?compare=ledel-l-lego-ii&compare=ledel-l-line",
    );
    await page.waitForSelector("#compareModal.open");
    assert.ok(
      await page
        .locator(".compare-table-wrap")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    );
    const box = await page.locator(".compare-close").boundingBox();
    assert.ok(
      await page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y).closest(".compare-close") !== null,
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      ),
    );
    await page.keyboard.press("Escape");
    await page.click("#openFilters");
    await page.selectOption("#brand", "ARUNA");
    await page.keyboard.press("Escape");
    await cards(38);
    assert.equal(
      await page.locator("#openFilters").getAttribute("aria-expanded"),
      "false",
    );
    assert.ok(
      await page
        .locator("#openFilters")
        .evaluate((el) => document.activeElement === el),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await group("selection", async () => {
    await navigate("/selection.html");
    for (const [id, value] of [
      ["section", "Промышленное"],
      ["subsection", "Общепромышленные"],
      ["brand", "LEDEL"],
      ["ip", "IP66"],
      ["cct", "4000"],
      ["cri", "70"],
      ["mounting", "поворотное крепление"],
    ])
      await page.selectOption("#" + id, value);
    for (const [id, value] of [
      ["powerMin", "135"],
      ["powerMax", "135"],
      ["fluxMin", "17550"],
      ["fluxMax", "17550"],
    ])
      await page.fill("#" + id, value);
    await page.click("#kssToggle");
    await page.check('[data-optics-group="narrow"]');
    await page.click("#kssToggle");
    await page.click("#find");
    assert.ok((await page.locator("#output .card.exact").count()) > 0);
    await page.locator(".card.exact .variant-toggle").first().click();
    const baseline = JSON.parse(
      fs.readFileSync(path.join(__dirname, "selection-baseline.json")),
    ).find((x) => x.name === "LEDEL engineering");
    assert.equal(
      await page.locator(".card.exact .variant-row").count(),
      baseline.exact.count,
    );
    const selectionUrl = page.url();
    const count = await page.locator("#count").innerText();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#ip").inputValue(), "IP66");
    assert.equal(
      await page.locator('[data-optics-group="narrow"]').isChecked(),
      true,
    );
    assert.equal(await page.locator("#count").innerText(), count);
    await page.click("#reset");
    assert.equal(await page.locator("#output .card").count(), 0);
    assert.equal(new URL(page.url()).search, "");
    await page.selectOption("#brand", "LEDEL");
    await page.fill("#powerMin", "135");
    await page.fill("#powerMax", "135");
    await page.click("#find");
    await page.locator("[data-selection-compare]").nth(0).click();
    await page.locator("[data-selection-compare]").nth(1).click();
    await page.locator("#selectionCompareBar a").click();
    await page.waitForSelector("#compareModal.open");
    assert.equal(await page.locator(".compare-table thead th").count(), 3);
    await navigate(selectionUrl);
    await page.locator("#output a.open").first().click();
    await page.waitForSelector("#modal.open");
    assert.ok(await page.locator("#modalTitle").isVisible());
    await navigate("/selection.html");
    await page.check("#explosion");
    await page.click("#find");
    assert.ok((await page.locator("#output .card.exact").count()) > 0);
    await page.click("#reset");
    await page.fill("#powerMin", "9999999");
    await page.click("#find");
    assert.equal(await page.locator("#output .card").count(), 0);
    assert.ok(
      (await page.locator("#output .empty").innerText()).includes("не найдено"),
    );
    assert.ok(
      (
        await page.locator('#output a[href^="mailto:"]').getAttribute("href")
      ).includes("9999999"),
    );
  });
  await group("gallery", async () => {
    await navigate("/elektrosnabzhenie.html");
    await page.click(".gallery-next");
    assert.equal(await page.locator("#galleryCurrent").innerText(), "02");
    await page.locator(".gallery-thumb").nth(7).click();
    assert.equal(await page.locator("#galleryCurrent").innerText(), "08");
    await page.locator(".gallery-slide.active img").click();
    await page.waitForSelector("#galleryLightbox.open");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#galleryLightbox.open").count(), 0);
  });
  await group("fallback", async () => {
    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const rp = await reduced.newPage();
    await rp.goto(base + "/", { waitUntil: "networkidle" });
    assert.ok(await rp.locator("h1").isVisible());
    assert.equal(await rp.locator(".light-stage.is-ready").count(), 0);
    assert.ok(await rp.locator(".hero-fixture img").isVisible());
    assert.equal(
      await rp
        .locator(".hero-fixture-pivot")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    await reduced.close();
    const noGl = await browser.newContext();
    const gp = await noGl.newPage();
    await gp.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === "webgl" || type === "webgl2") return null;
        return original.call(this, type, ...args);
      };
    });
    await gp.goto(base + "/", { waitUntil: "networkidle" });
    assert.ok(await gp.locator("h1").isVisible());
    assert.ok(await gp.locator(".hero-fixture img").isVisible());
    assert.equal(await gp.locator(".home-hero canvas").count(), 0);
    await noGl.close();
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const np = await noJs.newPage();
    await np.goto(base + "/", { waitUntil: "networkidle" });
    assert.ok(await np.locator("h1").isVisible());
    assert.ok(await np.locator(".hero-fixture img").isVisible());
    assert.equal(await np.locator("#industry-projects li").count(), 5);
    assert.ok((await np.locator('a[href="catalog.html"]').count()) > 0);
    await noJs.close();
  });
  await group("pages-path", async () => {
    const pc = await browser.newContext();
    await pc.route("http://smp-76.github.io/**", async (route) => {
      const u = new URL(route.request().url());
      const ref = u.pathname.replace(/^\/smp-lighting/, "") || "/";
      const response = await pc.request.get(base + ref + u.search);
      await route.fulfill({ response });
    });
    const pp = await pc.newPage();
    await pp.goto("http://smp-76.github.io/smp-lighting/catalog.html", {
      waitUntil: "networkidle",
    });
    await pp.waitForFunction(
      () => document.querySelectorAll("#grid .card").length === 174,
    );
    assert.equal(
      await pp.locator(".smp-brand").getAttribute("href"),
      "/smp-lighting/",
    );
    await pp.locator("[data-open-series]").first().click();
    assert.equal(
      await pp.locator("#breadcrumbs a").first().getAttribute("href"),
      "/smp-lighting/",
    );
    await pc.close();
  });
  await group("edge-cases", async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: base,
    });
    await navigate(
      "/catalog.html?series=ledel-l-lego-ii&sku=LGII135-214-513-18",
    );
    await page.click("#copySeriesLink");
    await page.waitForFunction(() =>
      document
        .getElementById("shareStatus")
        .textContent.includes("Ссылка скопирована"),
    );
    assert.ok(
      (await page.evaluate(() => navigator.clipboard.readText())).includes(
        "series.html?series=ledel-l-lego-ii",
      ),
    );
    const copy = page.locator("[data-passport-copy]");
    const label = await copy.innerText();
    await copy.click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-passport-copy]").textContent ===
        "Скопировано",
    );
    await page.waitForFunction(
      (label) =>
        document.querySelector("[data-passport-copy]").textContent === label,
      label,
    );
    await page.keyboard.press("Escape");
    await page.locator("[data-compare]").nth(0).click();
    await page.locator("[data-compare]").nth(1).click();
    await compareOpen();
    await page.locator(".compare-close").focus();
    await page.keyboard.press("Shift+Tab");
    assert.ok(
      await page.evaluate(
        () => document.activeElement.closest("#compareModal") !== null,
      ),
    );
    await page.keyboard.press("Tab");
    assert.ok(
      await page.evaluate(
        () => document.activeElement.closest("#compareModal") !== null,
      ),
    );
    await page.keyboard.press("Escape");
    await navigate("/selection.html");
    await page.selectOption("#cct", "Amber (янтарный)");
    await page.click("#find");
    assert.ok((await page.locator("#output .card.exact").count()) > 0);
    assert.ok(
      (await page.locator("#output .card.exact").first().innerText()).includes(
        "CRI: не применяется",
      ),
    );
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#cct").inputValue(), "Amber (янтарный)");
    const nc = await browser.newContext();
    const np = await nc.newPage();
    await np.route("**/catalog-data.json", (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Expected test failure",
      }),
    );
    await np.goto(base + "/catalog.html", { waitUntil: "networkidle" });
    assert.ok(await np.locator("#retryCatalog").isVisible());
    await np.unroute("**/catalog-data.json");
    await np.click("#retryCatalog");
    await np.waitForFunction(
      () => document.querySelectorAll("#grid .card").length === 174,
    );
    await np.route("**/catalog-data.json", (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Expected test failure",
      }),
    );
    await np.goto(base + "/selection.html", { waitUntil: "networkidle" });
    assert.ok(await np.locator("#retrySelection").isVisible());
    await np.unroute("**/catalog-data.json");
    await np.click("#retrySelection");
    await np.waitForFunction(() => !document.querySelector("#find").disabled);
    await nc.close();
    assert.deepEqual(await context.cookies(), []);
  });
  assert.deepEqual(errors, [], "Browser exceptions");
  assert.deepEqual(badResponses, [], "HTTP failures");
  console.log("PASS no browser exceptions or failed HTTP resources");
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify({ results, errors, badResponses }, null, 2),
  );
})()
  .catch(async (e) => {
    console.error(e);
    if (page)
      await page
        .screenshot({ path: path.join(out, "failure.png"), fullPage: false })
        .catch(() => {});
    fs.writeFileSync(
      path.join(out, "failure.json"),
      JSON.stringify(
        { error: e.stack, results, errors, badResponses },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });
