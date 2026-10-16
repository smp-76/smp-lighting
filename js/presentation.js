/* Read-only presentation enhancements. Catalogue/selection state lives in the original scripts. */
(() => {
  const grid = document.getElementById("grid");
  const viewButtons = [...document.querySelectorAll("[data-catalog-view]")];
  if (grid && viewButtons.length) {
    grid.dataset.view = "list";
    viewButtons.forEach((button) =>
      button.addEventListener("click", () => {
        grid.dataset.view = button.dataset.catalogView;
        viewButtons.forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      }),
    );
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const attached = new WeakSet();
  function attachPhoto(photo) {
    if (attached.has(photo) || !photo.querySelector("img")) return;
    attached.add(photo);
    photo.addEventListener(
      "pointermove",
      (event) => {
        if (reduced.matches || !fine.matches || event.pointerType === "touch")
          return;
        const rect = photo.getBoundingClientRect();
        photo.style.setProperty(
          "--tilt-x",
          `${(0.5 - (event.clientY - rect.top) / rect.height) * 5}deg`,
        );
        photo.style.setProperty(
          "--tilt-y",
          `${((event.clientX - rect.left) / rect.width - 0.5) * 8}deg`,
        );
      },
      { passive: true },
    );
    const reset = () => {
      photo.style.setProperty("--tilt-x", "0deg");
      photo.style.setProperty("--tilt-y", "0deg");
    };
    photo.addEventListener("pointerleave", reset);
  }
  reduced.addEventListener("change", () =>
    document.querySelectorAll(".series-photo").forEach((photo) => {
      photo.style.setProperty("--tilt-x", "0deg");
      photo.style.setProperty("--tilt-y", "0deg");
    }),
  );
  const modalContent = document.getElementById("modalContent");
  if (modalContent) {
    modalContent.querySelectorAll(".series-photo").forEach(attachPhoto);
    new MutationObserver((records) =>
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches(".series-photo")) attachPhoto(node);
          node.querySelectorAll(".series-photo").forEach(attachPhoto);
        }),
      ),
    ).observe(modalContent, { childList: true });
  }
  const form = document.getElementById("selectionForm"),
    count = document.getElementById("requirementCount");
  if (form && count) {
    function update() {
      const value = String(
        [...form.querySelectorAll(".field")].filter((field) =>
          [...field.querySelectorAll("input,select")].some((input) =>
            input.type === "checkbox" ? input.checked : input.value !== "",
          ),
        ).length,
      );
      if (count.textContent !== value) count.textContent = value;
    }
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("click", (event) => {
      if (event.target.closest("#reset")) queueMicrotask(update);
    });
    new MutationObserver(update).observe(form, {
      childList: true,
      subtree: true,
    });
    update();
  }
})();
