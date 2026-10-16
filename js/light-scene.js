/* Photo renderer: original FEREKS FHB image, qualitative light projection.
   No product geometry or photometric values are generated here. */
export function startLightScene(stage) {
  const hero = stage.closest(".home-hero");
  if (!hero || stage.dataset.heroRenderer !== "photo") return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia(
    "(min-width: 901px) and (hover: hover) and (pointer: fine)",
  );
  let visible = false;
  let frame = 0;
  let previous = 0;
  let x = 0,
    y = 0,
    targetX = 0,
    targetY = 0;

  // The input/inertia controller is separate from this photo rendering adapter.
  // A future model renderer can consume the same bounded aim state.
  function render(state) {
    hero.style.setProperty("--hero-x", state.x.toFixed(4));
    hero.style.setProperty("--hero-y", state.y.toFixed(4));
  }
  const enabled = () =>
    desktop.matches && !reduced.matches && !navigator.connection?.saveData;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function reset() {
    stop();
    x = y = targetX = targetY = 0;
    hero.style.removeProperty("--hero-x");
    hero.style.removeProperty("--hero-y");
  }
  function schedule() {
    if (!frame && visible && enabled() && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    if (
      !visible ||
      !enabled() ||
      document.hidden ||
      rect.bottom <= 0 ||
      rect.top >= innerHeight
    ) {
      previous = 0;
      return;
    }
    const dt = previous ? Math.min(0.08, (now - previous) / 1000) : 0.016;
    previous = now;
    const inertia = 1 - Math.exp(-dt / 0.34);
    x += (targetX - x) * inertia;
    y += (targetY - y) * inertia;
    if (Math.abs(x - targetX) + Math.abs(y - targetY) < 0.001) {
      x = targetX;
      y = targetY;
    }
    render({ x, y });
    if (x !== targetX || y !== targetY) schedule();
    else previous = 0;
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!enabled() || event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
      );
      targetY = Math.max(
        -1,
        Math.min(1, 1 - ((event.clientY - rect.top) / rect.height) * 2),
      );
      schedule();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
    schedule();
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
    else stop();
  }).observe(hero);
  function updateMode() {
    reset();
    stage.classList.toggle("is-ready", enabled());
    if (enabled()) schedule();
  }
  reduced.addEventListener("change", updateMode);
  desktop.addEventListener("change", updateMode);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else schedule();
  });
  updateMode();
}
