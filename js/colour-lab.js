/* Qualitative illustration. These grades do not simulate a measured spectrum or CRI. */
(() => {
  const root = document.getElementById("light-quality");
  if (!root) return;
  const tabs = [...root.querySelectorAll("[data-quality-mode]")];
  const layers = [...root.querySelectorAll("[data-quality-layer]")];
  const scene = root.querySelector(".quality-scene");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const presets = {
    cri: {
      70: [
        "Передача оттенков упрощена",
        "Красные оттенки сближаются, цвет покрытия выглядит менее насыщенным. Тонкое сравнение затруднено.",
      ],
      80: [
        "Базовая передача оттенков",
        "Цветовое различие заметно. Для тонкого сопоставления покрытий требования к свету определяют отдельно.",
      ],
      90: [
        "Тонкие оттенки заметнее",
        "Цветовые различия читаются лучше. Это помогает визуально сопоставлять окрашенные детали.",
      ],
      95: [
        "Близкая к естественной передача",
        "Более точное восприятие близких оттенков помогает сопоставлять окрашенные кузовные детали.",
      ],
    },
    cct: {
      3000: [
        "Тёплый белый",
        "Световая среда приобретает тёплый оттенок. Белые отражения и серый металл выглядят иначе.",
      ],
      4000: [
        "Нейтральный белый",
        "Сдержанная световая среда. Сравните восприятие серого металла и красного покрытия с тёплым вариантом.",
      ],
      5000: [
        "Более холодный рабочий свет",
        "Белые отражения выглядят холоднее, чем при 4000 K. Подходящую температуру для поста контроля определяют по задаче и условиям осмотра.",
      ],
      6500: [
        "Выраженно холодный белый",
        "В белых отражениях заметнее холодный оттенок. Это меняет ощущение сцены, но само по себе не повышает точность цветопередачи.",
      ],
    },
  };
  const values = { cri: "90", cct: "4000" };
  let mode = "cri",
    active = 0,
    displayed = "cri-90",
    desired = displayed;
  let busy = false,
    sequence = 0,
    frame = 0,
    timer = 0;
  let removeTransitionListener = () => {};
  const filterFor = (key) =>
    ["cri-95", "cct-5000"].includes(key) ? "none" : `url(#quality-${key})`;
  function cancelTransition() {
    sequence++;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    removeTransitionListener();
    busy = false;
  }
  function immediate(key) {
    cancelTransition();
    layers.forEach((layer, index) => {
      layer.style.transition = "none";
      layer.style.filter = filterFor(key);
      layer.style.opacity = index === 0 ? "1" : "0";
      layer.style.zIndex = index === 0 ? "1" : "0";
    });
    active = 0;
    displayed = key;
    root.dataset.sceneKey = key;
    scene.setAttribute("aria-busy", "false");
  }
  function show(key) {
    desired = key;
    if (reduced.matches) {
      immediate(key);
      return;
    }
    if (busy || displayed === key) return;
    busy = true;
    scene.setAttribute("aria-busy", "true");
    const token = ++sequence;
    const old = layers[active],
      next = layers[1 - active];
    next.style.transition = "none";
    next.style.opacity = "0";
    next.style.filter = filterFor(key);
    next.style.zIndex = "2";
    old.style.zIndex = "1";
    // Keep the outgoing image fully opaque underneath: no dark dip during the fade.
    void getComputedStyle(next).opacity;
    const finish = () => {
      if (token !== sequence) return;
      clearTimeout(timer);
      removeTransitionListener();
      old.style.transition = "none";
      old.style.opacity = "0";
      old.style.zIndex = "0";
      next.style.opacity = "1";
      next.style.zIndex = "1";
      active = 1 - active;
      displayed = key;
      root.dataset.sceneKey = key;
      busy = false;
      scene.setAttribute("aria-busy", "false");
      if (desired !== displayed) show(desired);
    };
    const end = (event) => {
      if (event.target === next && event.propertyName === "opacity") finish();
    };
    next.addEventListener("transitionend", end);
    removeTransitionListener = () =>
      next.removeEventListener("transitionend", end);
    frame = requestAnimationFrame(() => {
      if (token !== sequence) return;
      next.style.transition = "";
      next.style.opacity = "1";
      timer = setTimeout(finish, 650);
    });
  }
  function update() {
    const value = values[mode],
      panel = root.querySelector(`#quality-panel-${mode}`);
    const number = panel.querySelector("[data-quality-number]");
    number.replaceChildren(document.createTextNode(value));
    const unit = document.createElement("span");
    unit.textContent = mode === "cri" ? "Ra / CRI" : "K / температура";
    number.append(unit);
    panel.querySelector("[data-quality-heading]").textContent =
      presets[mode][value][0];
    panel.querySelector("[data-quality-description]").textContent =
      presets[mode][value][1];
    root.querySelector("#quality-scene-value").textContent =
      mode === "cri" ? `CRI ${value}` : `${value} K`;
    root.querySelector("#quality-observe").textContent =
      mode === "cri"
        ? "Цветовая температура не меняется. Следите за оттенками красных панелей."
        : "Объекты и цветопередача не меняются. Следите за оттенком белых отражений.";
    show(`${mode}-${value}`);
  }
  function selectMode(nextMode) {
    if (!presets[nextMode] || mode === nextMode) return;
    mode = nextMode;
    tabs.forEach((tab) => {
      const selected = tab.dataset.qualityMode === mode;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      root.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden =
        !selected;
    });
    update();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectMode(tab.dataset.qualityMode));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      selectMode(tabs[next].dataset.qualityMode);
    });
  });
  root.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches('input[type="radio"]')) return;
    const key =
      input.name === "quality-cri"
        ? "cri"
        : input.name === "quality-cct"
          ? "cct"
          : null;
    if (!key || !presets[key][input.value]) return;
    values[key] = input.value;
    if (mode === key) update();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) immediate(desired);
  });
  root.dataset.sceneKey = displayed;
  scene.setAttribute("aria-busy", "false");
})();
