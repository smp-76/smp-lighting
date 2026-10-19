/* V2 interaction contracts: presentation must not alter engineering state. */
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
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.waitForSelector(".light-stage.is-ready");
    await page.locator(".hero-fixture img").evaluate((img) => img.decode());
    await page.waitForTimeout(1200);
    const heroPhoto = await page
      .locator(".hero-fixture img")
      .getAttribute("src");
    assert.equal(await page.locator(".home-hero canvas").count(), 0);
    await page.evaluate(() => {
      window.qaUpdates = 0;
      new MutationObserver(
        (records) => (window.qaUpdates += records.length),
      ).observe(document.querySelector(".home-hero"), {
        attributes: true,
        attributeFilter: ["style"],
      });
    });
    const draws = await page.evaluate(() => window.qaUpdates);
    const still = await page.screenshot();
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => window.qaUpdates),
      draws,
      "Hero keeps updating without input",
    );
    assert.ok(
      (await page.screenshot()).equals(still),
      "Hero pixels change without input",
    );
    await page.mouse.move(1200, 250);
    await page.waitForTimeout(2400);
    assert.ok(
      (await page.evaluate(() => window.qaUpdates)) > draws,
      "Light does not react to pointer",
    );
    assert.ok(
      !(await page.screenshot()).equals(still),
      "Pointer does not affect photo and light scene",
    );
    assert.equal(
      await page.locator(".hero-fixture img").getAttribute("src"),
      heroPhoto,
    );
    const aim = await page
      .locator(".home-hero")
      .evaluate((el) =>
        ["--hero-x", "--hero-y"].map((name) =>
          Number(el.style.getPropertyValue(name)),
        ),
      );
    assert.ok(
      aim.every((value) => value >= -1 && value <= 1),
      "Aim exceeds bounded photo angles",
    );
    assert.ok(
      aim.some((value) => value !== 0),
      "Aim did not change",
    );
    const ambient = Number(
      await page
        .locator(".hero-room")
        .evaluate((el) => getComputedStyle(el).opacity),
    );
    assert.ok(
      ambient > 0 && ambient <= 0.18,
      "Warehouse needs a restrained ambient layer outside the lit area",
    );
    const heroBounds = await page.locator(".home-hero").boundingBox();
    for (const [horizontal, vertical] of [
      [0.2, 0.3],
      [0.88, 0.58],
    ]) {
      const target = {
        x: heroBounds.x + heroBounds.width * horizontal,
        y: heroBounds.y + heroBounds.height * vertical,
      };
      await page.mouse.move(target.x, target.y);
      await page.waitForFunction(
        ({ horizontal, vertical }) => {
          const style = document.querySelector(".home-hero").style;
          return (
            Math.abs(
              parseFloat(style.getPropertyValue("--spot-x")) - horizontal * 100,
            ) < 0.05 &&
            Math.abs(
              parseFloat(style.getPropertyValue("--spot-y")) - vertical * 100,
            ) < 0.05
          );
        },
        { horizontal, vertical },
      );
      const projection = await page.locator(".home-hero").evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const gradient = el.querySelector("#fhbBeam");
        const emitter = el
          .querySelector(".hero-emitter")
          .getBoundingClientRect();
        const mount = el.querySelector(".hero-mount").getBoundingClientRect();
        const mountingHole = el
          .querySelector(".hero-mount-point")
          .getBoundingClientRect();
        return {
          x:
            (Number.parseFloat(el.style.getPropertyValue("--spot-x")) / 100) *
            rect.width,
          y:
            (Number.parseFloat(el.style.getPropertyValue("--spot-y")) / 100) *
            rect.height,
          sourceX: (Number(gradient.getAttribute("x1")) / 1000) * rect.width,
          sourceY: (Number(gradient.getAttribute("y1")) / 1000) * rect.height,
          opticX: emitter.left - rect.left,
          opticY: emitter.top - rect.top,
          mountError: Math.hypot(
            mountingHole.left - (mount.left + mount.width / 2),
            mountingHole.top - mount.bottom,
          ),
        };
      });
      assert.ok(
        Math.abs(projection.x - heroBounds.width * horizontal) < 2,
        "Spot does not follow cursor across entire hero",
      );
      assert.ok(
        Math.abs(projection.y - heroBounds.height * vertical) < 2,
        "Spot vertical position misses cursor",
      );
      assert.ok(
        Math.abs(projection.sourceX - projection.opticX) < 2 &&
          Math.abs(projection.sourceY - projection.opticY) < 2,
        "Beam origin detached from real optic",
      );
      assert.ok(
        projection.mountError < 1,
        "Fixture drifts away from its fixed mounting point",
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".hero-fixture-pivot"))
          .transform === "none",
    );
    assert.equal(
      await page
        .locator(".hero-fixture-pivot")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => window.scrollTo(0, 240));
    assert.equal(
      await page.evaluate(() => scrollY),
      240,
      "Native scrolling was intercepted",
    );
    await page.locator("#tasks").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const offscreen = await page.evaluate(() => window.qaUpdates);
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => window.qaUpdates),
      offscreen,
      "Offscreen hero still renders",
    );
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await mobile.goto(base + "/", { waitUntil: "networkidle" });
    assert.equal(await mobile.locator(".light-stage.is-ready").count(), 0);
    assert.equal(
      await mobile
        .locator(".hero-fixture-pivot")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    assert.ok(await mobile.locator(".hero-fixture img").isVisible());
    const mobileProjection = await mobile.locator(".home-hero").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const emitter = el
        .querySelector(".hero-emitter")
        .getBoundingClientRect();
      const gradient = el.querySelector("#fhbBeamMobile");
      return Math.hypot(
        (Number(gradient.getAttribute("x1")) / 1000) * rect.width -
          (emitter.left - rect.left),
        (Number(gradient.getAttribute("y1")) / 1000) * rect.height -
          (emitter.top - rect.top),
      );
    });
    assert.ok(mobileProjection < 1, "Static mobile beam detached from optic");
    await mobile.close();
    const scenes = page.locator(".task-scene");
    assert.equal(await scenes.count(), 6);
    await scenes.nth(2).locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".task-scene[open]").count(), 1);
    assert.equal(await scenes.nth(2).getAttribute("open"), "");
    console.log(
      "PASS idle light, whole-hero cursor spotlight, attached beam, reduced motion, native scroll, offscreen stop, keyboard narrative",
    );

    await page.locator("#industry-industrial").click();
    await page.locator("#industry-roads").click();
    await page.locator("#industry-sports").click();
    await page.waitForTimeout(1400);
    assert.equal(
      await page.locator("#industry-sports").getAttribute("aria-selected"),
      "true",
    );
    assert.match(
      await page.locator("#industry-title").innerText(),
      /Спортивные/,
    );
    assert.equal(await page.locator("#industry-projects li").count(), 4);
    assert.ok(
      (await page.locator("#industry-description").innerText()).length > 30,
    );
    const background = await page
      .locator("#industry-bg")
      .evaluate((el) => el.style.backgroundImage);
    assert.ok(
      background.includes("reference-sports.webp"),
      "Rapid selections left a stale background",
    );
    await page.locator("[data-brand-preview=LEDEL]").focus();
    await page.waitForFunction(() =>
      document
        .querySelector("#brand-preview-image")
        .getAttribute("src")
        .includes("ledel-l-lego"),
    );
    await page.locator("[data-brand-preview=PLG]").focus();
    assert.ok(await page.locator("#brand-preview-placeholder").isVisible());
    assert.ok(await page.locator("#brand-preview-image").isHidden());
    console.log(
      "PASS industry race handling, project lists, keyboard brand composition and honest PLG placeholder",
    );

    await page.goto(base + "/catalog.html", { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.querySelectorAll("#grid .card").length === 174,
    );
    await page.selectOption("#brand", "LEDEL");
    await page.waitForFunction(
      () => document.querySelectorAll("#grid .card").length === 35,
    );
    await page.locator("[data-compare]").first().click();
    const selected = await page
      .locator(".card.is-compared")
      .getAttribute("data-id");
    await page.locator("[data-catalog-view=cards]").click();
    assert.equal(
      await page.locator("#grid").getAttribute("data-view"),
      "cards",
    );
    assert.equal(await page.locator("#grid .card").count(), 35);
    assert.equal(await page.locator("#brand").inputValue(), "LEDEL");
    assert.equal(
      await page.locator(".card.is-compared").getAttribute("data-id"),
      selected,
    );
    await page.locator("[data-catalog-view=list]").click();
    assert.equal(await page.locator("#grid").getAttribute("data-view"), "list");
    assert.equal(
      await page
        .locator("[data-catalog-view=list]")
        .getAttribute("aria-pressed"),
      "true",
    );
    console.log(
      "PASS view changes preserve filters, complete results and comparison selection",
    );

    await page.goto(base + "/series.html?series=ledel-l-lego-ii", {
      waitUntil: "networkidle",
    });
    const photo = page.locator(".series-photo"),
      image = photo.locator("img");
    const src = await image.getAttribute("src");
    const rect = await photo.boundingBox();
    await page.mouse.move(
      rect.x + rect.width * 0.8,
      rect.y + rect.height * 0.3,
    );
    await page.waitForTimeout(300);
    assert.notEqual(
      await photo.evaluate((el) => el.style.getPropertyValue("--tilt-y")),
      "",
    );
    assert.equal(
      await image.getAttribute("src"),
      src,
      "Tilt substitutes a fabricated product image",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await image.evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(base + "/selection.html", { waitUntil: "networkidle" });
    await page.fill("#powerMin", "100");
    assert.equal(await page.locator("#requirementCount").innerText(), "1");
    await page.locator("#reset").click();
    assert.equal(await page.locator("#requirementCount").innerText(), "0");
    console.log(
      "PASS real-photo tilt, reduced motion and read-only requirement summary",
    );
    assert.deepEqual(errors, [], "Uncaught browser exceptions");
    await page.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
