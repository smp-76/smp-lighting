/* Behavioural checks for the educational illustration, not photometric validation. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.SMP_QA_BASE_URL || "http://127.0.0.1:8000";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SMP_QA_CHROMIUM || "/usr/bin/chromium",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [],
      requested = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requested.push(request.url()));
    await page.goto(base + "/", { waitUntil: "networkidle" });
    assert.ok(
      !requested.some((url) => url.includes("paint-inspection-scene")),
      "Below-fold scene fetched before needed",
    );
    const lab = page.locator("#light-quality");
    await lab.scrollIntoViewIfNeeded();
    await page
      .locator(".quality-scene-image")
      .first()
      .evaluate((img) => img.decode());
    const sources = await page
      .locator(".quality-scene-image")
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")));
    assert.equal(
      new Set(sources).size,
      1,
      "Different scenes used for light states",
    );
    const geometry = await page
      .locator(".quality-scene")
      .evaluate((el) => ({ width: el.clientWidth, height: el.clientHeight }));
    const snapshots = {};
    for (const [mode, values] of [
      ["cri", ["70", "80", "90", "95"]],
      ["cct", ["3000", "4000", "5000", "6500"]],
    ]) {
      await page.locator(`#quality-tab-${mode}`).click();
      assert.equal(
        await page
          .locator(`#quality-tab-${mode}`)
          .getAttribute("aria-selected"),
        "true",
      );
      assert.ok(await page.locator(`#quality-panel-${mode}`).isVisible());
      for (const value of values) {
        await page
          .locator(`input[name="quality-${mode}"][value="${value}"]`)
          .check();
        await page.waitForFunction(
          (key) =>
            document.querySelector("#light-quality").dataset.sceneKey === key,
          `${mode}-${value}`,
        );
        await page.waitForFunction(
          () =>
            document
              .querySelector(".quality-scene")
              .getAttribute("aria-busy") === "false",
        );
        assert.deepEqual(
          await page.locator(".quality-scene").evaluate((el) => ({
            width: el.clientWidth,
            height: el.clientHeight,
          })),
          geometry,
          "Object framing changes with light setting",
        );
        if (
          ["cri-70", "cri-95", "cct-3000", "cct-6500"].includes(
            `${mode}-${value}`,
          )
        )
          snapshots[`${mode}-${value}`] = await page
            .locator(".quality-scene")
            .screenshot();
      }
    }
    assert.ok(
      !snapshots["cri-70"].equals(snapshots["cri-95"]),
      "CRI grades have no visible difference",
    );
    assert.ok(
      !snapshots["cct-3000"].equals(snapshots["cct-6500"]),
      "CCT grades have no visible difference",
    );
    console.log(
      "PASS lazy image, shared scene, eight states, stable framing and visible changes",
    );

    await page.locator("#quality-tab-cri").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator("#quality-tab-cct").getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Home");
    assert.equal(
      await page.locator("#quality-tab-cri").getAttribute("aria-selected"),
      "true",
    );
    await page.locator('input[name="quality-cri"][value="70"]').check();
    await page.locator('input[name="quality-cri"][value="95"]').check();
    await page.locator('input[name="quality-cri"][value="80"]').check();
    await page.waitForFunction(
      () =>
        document.querySelector("#light-quality").dataset.sceneKey ===
          "cri-80" &&
        document.querySelector(".quality-scene").getAttribute("aria-busy") ===
          "false",
    );
    await page.locator("#quality-tab-cct").click();
    await page.locator("#quality-tab-cri").click();
    assert.ok(
      await page.locator('input[name="quality-cri"][value="80"]').isChecked(),
      "Preset lost when switching tabs",
    );
    console.log(
      "PASS keyboard tabs, rapid selections, latest state and per-mode memory",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await page.locator('input[name="quality-cri"][value="95"]').check();
    await page.waitForFunction(
      () =>
        document.querySelector("#light-quality").dataset.sceneKey === "cri-95",
    );
    assert.equal(
      await page.locator(".quality-scene").getAttribute("aria-busy"),
      "false",
    );
    for (const width of [375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await lab.scrollIntoViewIfNeeded();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow at ${width}`,
      );
      assert.ok(await page.locator("#quality-tab-cri").isVisible());
      const targets = await page
        .locator("#quality-panel-cri .quality-values label > span")
        .evaluateAll((spans) =>
          spans.map((span) => span.getBoundingClientRect().height),
        );
      assert.ok(
        targets.every((height) => height >= 44),
        "Touch targets too small",
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS reduced motion, six widths, touch target sizes, no browser exceptions",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
