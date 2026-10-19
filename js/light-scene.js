/* Original FEREKS FHB photo, with a cursor-directed qualitative light projection.
   The image remains a plane: no hidden product geometry or photometry is invented. */
export function startLightScene(stage) {
  const hero = stage.closest(".home-hero");
  const emitter = stage.querySelector(".hero-emitter");
  const image = stage.querySelector(".hero-fixture img");
  const beam = hero?.querySelector(".hero-beam-desktop");
  const gradient = hero?.querySelector("#fhbBeam");
  const mobileBeam = hero?.querySelector(".hero-beam-mobile");
  const mobileGradient = hero?.querySelector("#fhbBeamMobile");
  if (
    !hero ||
    !emitter ||
    !image ||
    !beam ||
    !gradient ||
    !mobileBeam ||
    !mobileGradient
  )
    return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 900px)");
  const desktop = matchMedia(
    "(min-width: 901px) and (hover: hover) and (pointer: fine)",
  );
  const defaults = { u: 0.77, v: 0.8 };
  let visible = false,
    frame = 0,
    previous = 0;
  let x = 0,
    y = 0,
    targetX = 0,
    targetY = 0;
  let u = defaults.u,
    v = defaults.v,
    targetU = u,
    targetV = v;
  const enabled = () =>
    desktop.matches && !reduced.matches && !navigator.connection?.saveData;
  const clamp = (value) => Math.max(-1, Math.min(1, value));

  // Photo rendering adapter: bounded inclination and a measured point on its optic.
  function render() {
    const activeBeam = compact.matches ? mobileBeam : beam;
    const activeGradient = compact.matches ? mobileGradient : gradient;
    hero.style.setProperty("--hero-x", x.toFixed(5));
    hero.style.setProperty("--hero-y", y.toFixed(5));
    hero.style.setProperty("--spot-x", (u * 100).toFixed(5) + "%");
    hero.style.setProperty("--spot-y", (v * 100).toFixed(5) + "%");
    const rect = hero.getBoundingClientRect();
    const origin = emitter.getBoundingClientRect();
    const sx = origin.left - rect.left,
      sy = origin.top - rect.top;
    const tx = u * rect.width,
      ty = v * rect.height;
    const dx = tx - sx,
      dy = ty - sy,
      distance = Math.hypot(dx, dy);
    const nx = -dy / Math.max(1, distance),
      ny = dx / Math.max(1, distance);
    const aperture = image.getBoundingClientRect().width * 0.18;
    const spread = Math.min(rect.width * 0.23, distance * 0.38);
    const point = (px, py) =>
      `${((px / rect.width) * 1000).toFixed(2)} ${((py / rect.height) * 1000).toFixed(2)}`;
    activeBeam.setAttribute(
      "d",
      `M${point(sx + nx * aperture, sy + ny * aperture)} L${point(tx + nx * spread, ty + ny * spread)} Q${point(tx + (dx / Math.max(1, distance)) * spread * 0.3, ty + (dy / Math.max(1, distance)) * spread * 0.3)} ${point(tx - nx * spread, ty - ny * spread)} L${point(sx - nx * aperture, sy - ny * aperture)}Z`,
    );
    // Short throws lose the airborne cone instead of producing a bright blob.
    activeBeam.style.opacity = Math.min(1, distance / 180).toFixed(3);
    const endpoints = [
      (sx / rect.width) * 1000,
      (sy / rect.height) * 1000,
      u * 1000,
      v * 1000,
    ];
    ["x1", "y1", "x2", "y2"].forEach((name, i) =>
      activeGradient.setAttribute(name, endpoints[i].toFixed(2)),
    );
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function reset() {
    stop();
    x = y = targetX = targetY = 0;
    u = targetU = compact.matches ? 0.5 : defaults.u;
    v = targetV = compact.matches ? 0.84 : defaults.v;
    ["--hero-x", "--hero-y", "--spot-x", "--spot-y"].forEach((name) =>
      hero.style.removeProperty(name),
    );
    render();
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
    // One time constant keeps the inclination and light target in sync.
    const response = 1 - Math.exp(-dt / 0.22);
    x += (targetX - x) * response;
    y += (targetY - y) * response;
    u += (targetU - u) * response;
    v += (targetV - v) * response;
    if (Math.abs(x - targetX) + Math.abs(y - targetY) < 0.0005) {
      x = targetX;
      y = targetY;
    }
    if (Math.abs(u - targetU) + Math.abs(v - targetV) < 0.00005) {
      u = targetU;
      v = targetV;
    }
    render();
    if (x !== targetX || y !== targetY || u !== targetU || v !== targetV)
      schedule();
    else previous = 0;
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!enabled() || event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      targetU = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
      targetV = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height),
      );
      const horizontal = targetU - defaults.u,
        vertical = defaults.v - targetV;
      targetX = clamp(
        horizontal / (horizontal >= 0 ? 1 - defaults.u : defaults.u),
      );
      targetY = clamp(vertical / (vertical >= 0 ? defaults.v : 1 - defaults.v));
      schedule();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
    targetU = defaults.u;
    targetV = defaults.v;
    schedule();
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
    else stop();
  }).observe(hero);
  new ResizeObserver(() => {
    if (enabled()) schedule();
    else render();
  }).observe(hero);
  function updateMode() {
    reset();
    stage.classList.toggle("is-ready", enabled());
    if (enabled()) schedule();
  }
  reduced.addEventListener("change", updateMode);
  desktop.addEventListener("change", updateMode);
  compact.addEventListener("change", updateMode);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else schedule();
  });
  updateMode();
}
