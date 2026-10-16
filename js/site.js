/* Shared navigation, focus management and progressive motion; no tracking/storage. */
(() => {
  const header = document.querySelector(".smp-header");
  const menu = document.querySelector(".smp-menu");
  const nav = document.querySelector(".smp-nav");
  function closeMenu(restore = false) {
    header?.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-label", "Открыть меню");
    if (restore) menu?.focus();
  }
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    header.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });
  nav?.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (e) => {
    if (header && !header.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header?.classList.contains("open"))
      closeMenu(true);
  });
  matchMedia("(min-width: 1024px)").addEventListener("change", () =>
    closeMenu(),
  );

  // Respect the original / and /#anchor URLs on the GitHub Pages project path too.
  const projectBase = location.hostname.endsWith("github.io")
    ? "/" + location.pathname.split("/").filter(Boolean)[0] + "/"
    : "/";
  function resolveRootLinks(root) {
    const anchors = [
      ...(root.matches?.('a[href^="/"]') ? [root] : []),
      ...root.querySelectorAll('a[href^="/"]'),
    ];
    anchors.forEach((a) => {
      const ref = a.getAttribute("href");
      if (!ref.startsWith("//") && !ref.startsWith(projectBase))
        a.setAttribute("href", projectBase + ref.slice(1));
    });
  }
  if (projectBase !== "/") {
    resolveRootLinks(document);
    new MutationObserver((records) =>
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1) resolveRootLinks(node);
        }),
      ),
    ).observe(document.body, { childList: true, subtree: true });
  }

  // Associate legacy technical labels with their existing controls.
  document
    .querySelectorAll(
      ".filter-group, .field, .model-filters > div, .sort-panel",
    )
    .forEach((group) => {
      const label = group.querySelector("label");
      const controls = group.querySelectorAll(
        "input:not([type=checkbox]), select, .multi-select-toggle",
      );
      controls.forEach((control, i) => {
        if (!control.id)
          control.id = "control-" + Math.random().toString(36).slice(2, 10);
        if (!control.hasAttribute("aria-label"))
          control.setAttribute(
            "aria-label",
            (label?.textContent || "Параметр").trim() +
              (controls.length > 1 ? (i ? " — до" : " — от") : ""),
          );
      });
      if (label && controls.length === 1) label.htmlFor = controls[0].id;
    });

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  document.body.append(toast);
  let toastTimer;
  window.smpToast = (message) => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  // Generic focus containment for existing dialogs, including dynamically populated ones.
  const focusHistory = new WeakMap();
  const dialogs = document.querySelectorAll(
    ".modal, .compare-modal, .gallery-lightbox",
  );
  dialogs.forEach((overlay) => {
    new MutationObserver(() => {
      if (
        overlay.id === "modal" &&
        document.body.classList.contains("series-page")
      )
        return;
      const open = overlay.classList.contains("open");
      if (open && !focusHistory.has(overlay)) {
        focusHistory.set(overlay, document.activeElement);
        const dialog = overlay.querySelector("[role=dialog]") || overlay;
        requestAnimationFrame(() =>
          dialog
            .querySelector('button, a, input, select, [tabindex="0"]')
            ?.focus({ preventScroll: true }),
        );
        // Background remains visible, but keyboard and assistive tech stay inside the dialog.
        [...document.body.children].forEach((el) => {
          if (
            el !== overlay &&
            !el.contains(overlay) &&
            !el.classList.contains("toast")
          )
            el.inert = true;
        });
      } else if (!open && focusHistory.has(overlay)) {
        const previous = focusHistory.get(overlay);
        focusHistory.delete(overlay);
        [...document.body.children].forEach((el) => (el.inert = false));
        const other = [...dialogs].find(
          (el) => el !== overlay && el.classList.contains("open"),
        );
        if (other)
          [...document.body.children].forEach((el) => {
            if (
              el !== other &&
              !el.contains(other) &&
              !el.classList.contains("toast")
            )
              el.inert = true;
          });
        if (previous?.isConnected && !previous.closest("[inert]"))
          previous.focus({ preventScroll: true });
      }
    }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
    overlay.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !overlay.classList.contains("open")) return;
      const focusable = [
        ...overlay.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length && !el.closest("[hidden]"));
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    });
  });
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const box = img.closest(".image, .series-photo");
      if (box) {
        const placeholder = document.createElement("div");
        placeholder.className = "placeholder";
        placeholder.textContent = "Изображение недоступно";
        box.replaceChildren(placeholder);
      }
    },
    true,
  );
  if (
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    "IntersectionObserver" in window
  ) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    document.querySelectorAll(".fu, .fd, [data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add("reveal-ready");
        observer.observe(el);
      }
    });
  }
})();
