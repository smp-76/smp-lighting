(function () {
  const gallery = document.getElementById("electroGallery");
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll(".gallery-slide")];
  const thumbs = [...gallery.querySelectorAll(".gallery-thumb")];
  const counter = document.getElementById("galleryCurrent");
  const viewport = gallery.querySelector(".gallery-viewport");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImg = lightbox.querySelector("img");
  let current = 0,
    startX = null,
    deltaX = 0;
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((el, i) => el.classList.toggle("active", i === current));
    thumbs.forEach((el, i) => {
      el.classList.toggle("active", i === current);
      el.setAttribute("aria-pressed", String(i === current));
    });
    counter.textContent = String(current + 1).padStart(2, "0");
    thumbs[current].scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
      inline: "center",
    });
  }
  const prevButton = gallery.querySelector(".gallery-prev");
  const nextButton = gallery.querySelector(".gallery-next");
  prevButton.addEventListener("pointerdown", (e) => e.stopPropagation());
  nextButton.addEventListener("pointerdown", (e) => e.stopPropagation());
  prevButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    show(current - 1);
  });
  nextButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    show(current + 1);
  });
  thumbs.forEach((btn) =>
    btn.addEventListener("click", () => show(Number(btn.dataset.index))),
  );
  slides.forEach((slide) =>
    slide.querySelector(".gallery-zoom").addEventListener("click", () => {
      lightboxImg.src = slide.querySelector("img").src;
      lightboxImg.alt = slide.querySelector("img").alt;
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    }),
  );
  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }
  lightbox
    .querySelector(".gallery-lightbox-close")
    .addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  viewport.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".gallery-arrow")) return;
    startX = e.clientX;
    deltaX = 0;
  });
  viewport.addEventListener("pointermove", (e) => {
    if (startX !== null) {
      deltaX = e.clientX - startX;
      if (Math.abs(deltaX) > 8) viewport.setPointerCapture(e.pointerId);
    }
  });
  viewport.addEventListener("pointerup", () => {
    if (Math.abs(deltaX) > 55) show(current + (deltaX < 0 ? 1 : -1));
    startX = null;
    deltaX = 0;
  });
  viewport.addEventListener("pointercancel", () => {
    startX = null;
    deltaX = 0;
  });
  thumbs.forEach((el, i) =>
    el.setAttribute("aria-pressed", String(i === current)),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("open"))
      closeLightbox();
    else if (
      (gallery.contains(document.activeElement) ||
        lightbox.classList.contains("open")) &&
      e.key === "ArrowLeft"
    )
      show(current - 1);
    else if (
      (gallery.contains(document.activeElement) ||
        lightbox.classList.contains("open")) &&
      e.key === "ArrowRight"
    )
      show(current + 1);
  });
})();
