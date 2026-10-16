let DATA = [];
const $ = (id) => document.getElementById(id);
const state = {
  q: "",
  brand: "",
  section: "",
  subsection: "",
  powerMin: "",
  powerMax: "",
  kss: "",
  ip: "",
  cri: "",
  cct: "",
  quick: "",
};
let activeSeries = null;
let modelPage = 0;
const PAGE_SIZE = 100;
const searchIndex = new WeakMap();
let selectedModelKey = null;
const compareIds = [];
let modelState = {
  q: "",
  power: "",
  kss: "",
  cri: "",
  cct: "",
  mounting: "",
  ip: "",
  sort: "",
};
const uniq = (arr) =>
  [
    ...new Set(arr.filter((v) => v !== null && v !== undefined && v !== "")),
  ].sort((a, b) => String(a).localeCompare(String(b), "ru", { numeric: true }));
function canonicalSection(v) {
  return String(v || "").trim();
}
function categoryPaths(x) {
  return Array.isArray(x.categories) && x.categories.length
    ? x.categories
    : [
        {
          section: canonicalSection(x.section),
          subsection: x.subsection || "",
        },
      ];
}
function primaryCategory(x) {
  return categoryPaths(x)[0] || { section: "", subsection: "" };
}
function categoryText(x) {
  const p = primaryCategory(x),
    more = Math.max(0, categoryPaths(x).length - 1);
  return (
    p.section +
    (p.subsection ? " · " + p.subsection : "") +
    (more ? " · ещё " + more : "")
  );
}
function categoryTextFull(x) {
  return categoryPaths(x)
    .map((p) => p.section + (p.subsection ? " / " + p.subsection : ""))
    .join("; ");
}
function hasCategory(x, value) {
  return !value || categoryPaths(x).some((p) => p.section === value);
}
function hasSubcategory(x, value) {
  return !value || categoryPaths(x).some((p) => p.subsection === value);
}
function uiIcon(name) {
  const p = {
    power: '<path d="M13 2 4.5 13H11l-1 9L19.5 11H13z"/>',
    flux: '<circle cx="12" cy="9" r="4"/><path d="M9 14h6M10 18h4M12 2v2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name] || ""}</svg>`;
}
function updateBreadcrumb(series = null) {
  const b = $("breadcrumbs");
  if (!b) return;
  if (series) {
    b.innerHTML = `<a href="/">Главная</a><span>›</span><a href="catalog.html">Каталог</a><span>›</span><span>${esc(series.brand)}</span><span>›</span><span>${esc(series.series)}</span>`;
  } else
    b.innerHTML = '<a href="/">Главная</a><span>›</span><span>Каталог</span>';
}
function fill(id, items) {
  const select = $(id);
  if (!select) return;
  const first = select.options[0] ? select.options[0].cloneNode(true) : null;
  select.innerHTML = "";
  if (first) select.appendChild(first);
  items.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
}

function opticsInfo(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const s = raw
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/Х/g, "X")
    .replace(/×/g, "X");
  if (/БЕЗ\s*ОПТИК|БЕЗ\s*ЛИНЗ|ТОЛЬКО\s*СТЕКЛ|РАССЕИВАТЕЛЬ\s*БЕЗ/.test(s))
    return { group: "none", key: "none", label: "Без оптики" };
  if (/АССИМ|ASYM|(^|[^A-ZА-Я])A\d*([^A-ZА-Я]|$)|ШБ|БОКОВ/.test(s))
    return { group: "asym", key: "asym", label: "Асимметричная" };
  if (/СПЕЦ|SPECIAL|VW|(^|[^A-ZА-Я])S([^A-ZА-Я]|$)|ГСП/.test(s))
    return { group: "special", key: "special", label: "Специализированная" };
  const pair = s.match(/(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)/);
  if (pair)
    return {
      group: "special",
      key: "special:" + pair[1] + "x" + pair[2],
      label: pair[1] + "×" + pair[2] + "°",
    };
  if (/[;\/]|\b(?:К|Г|Д)\s*,|\b(?:F|D|C)\d+.*\b(?:F|D|C)\d+/.test(s))
    return { group: "special", key: "special", label: "Несколько вариантов" };
  if (/(^|[^A-ZА-Я])(Ш\d*|SH|W\d*|WL\d*|WA)([^A-ZА-Я]|$)|ШИРОК/.test(s))
    return { group: "wide", key: "wide:letter", label: "Широкая (Ш)" };
  let nums = [...s.matchAll(/\d+(?:[.,]\d+)?/g)]
    .map((m) => Number(m[0].replace(",", ".")))
    .filter(Number.isFinite);
  if (nums.length) {
    const angle = nums[0];
    if (angle <= 30)
      return { group: "narrow", key: "narrow:" + angle, label: angle + "°" };
    if (angle <= 60)
      return { group: "medium", key: "medium:" + angle, label: angle + "°" };
    return { group: "wide", key: "wide:" + angle, label: angle + "°" };
  }
  if (/(^|[^A-ZА-Я])(Д|D|C)([^A-ZА-Я]|$)/.test(s))
    return {
      group: "wide",
      key: "wide:unspecified",
      label: "Широкая — угол не указан",
    };
  if (/(^|[^A-ZА-Я])(К|Г|F)([^A-ZА-Я]|$)/.test(s))
    return {
      group: "special",
      key: "special:unspecified",
      label: "Угол не указан",
    };
  return { group: "special", key: "special", label: "Другая" };
}
function opticsGroupTitle(group) {
  return (
    {
      narrow: "Узкая оптика",
      medium: "Средняя оптика",
      wide: "Широкая оптика",
      asym: "Асимметричная оптика",
      special: "Специализированная оптика",
      none: "Без оптики",
    }[group] || "Другая оптика"
  );
}
function buildOpticsSelect(id, values, firstText) {
  const select = $(id);
  if (!select) return;
  const map = new Map();
  values.forEach((v) => {
    const info = opticsInfo(v);
    if (info && !map.has(info.key)) map.set(info.key, info);
  });
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstText;
  select.appendChild(first);
  ["narrow", "medium", "wide", "asym", "special", "none"].forEach((group) => {
    const items = [...map.values()]
      .filter((x) => x.group === group)
      .sort((a, b) =>
        String(a.label).localeCompare(String(b.label), "ru", { numeric: true }),
      );
    if (!items.length) return;
    const og = document.createElement("optgroup");
    og.label = opticsGroupTitle(group);
    items.forEach((info) => {
      const o = document.createElement("option");
      o.value = info.key;
      o.textContent = info.label;
      og.appendChild(o);
    });
    select.appendChild(og);
  });
}
function matchesOptics(raw, filterKey) {
  if (!filterKey) return true;
  const info = opticsInfo(raw);
  return !!info && info.key === filterKey;
}

function hydrateCatalogControls() {
  fill("brand", uniq(DATA.map((x) => x.brand)));
  fill(
    "section",
    uniq(DATA.flatMap((x) => categoryPaths(x).map((p) => p.section))),
  );
  fill(
    "subsection",
    uniq(DATA.flatMap((x) => categoryPaths(x).map((p) => p.subsection))),
  );
  buildOpticsSelect(
    "catalogKss",
    DATA.flatMap((x) => (x.models || []).map((m) => m.kss)),
    "Все типы оптики",
  );
  fill(
    "catalogIp",
    uniq(DATA.flatMap((x) => (x.models || []).map((m) => m.ip))),
  );
  fill("catalogCri", [70, 80, 90]);
  fill(
    "catalogCct",
    uniq(DATA.flatMap((x) => (x.models || []).map((m) => m.cct))),
  );
  $("seriesStat").textContent = DATA.length.toLocaleString("ru-RU");
  $("brandStat").textContent = uniq(
    DATA.map((x) => x.brand),
  ).length.toLocaleString("ru-RU");
  $("modelStat").textContent = DATA.reduce(
    (a, x) => a + (x.models?.length || 0),
    0,
  ).toLocaleString("ru-RU");
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function powerRangeFromModels(models) {
  const vals = (models || [])
    .map((m) => Number(m.power))
    .filter(Number.isFinite);
  if (!vals.length) return "—";
  const a = Math.min(...vals),
    b = Math.max(...vals);
  return a === b ? a + " Вт" : a + "–" + b + " Вт";
}
function powerRange(x) {
  return powerRangeFromModels(x.models || []);
}
function modelsInPowerRange(models, pMin, pMax) {
  return (models || []).filter((m) => {
    const power = Number(m.power);
    return (
      Number.isFinite(power) &&
      (pMin === null || power >= pMin) &&
      (pMax === null || power <= pMax)
    );
  });
}
const FILTER_CONTROLS = {
  q: "q",
  brand: "brand",
  section: "section",
  subsection: "subsection",
  powerMin: "powerMin",
  powerMax: "powerMax",
  kss: "catalogKss",
  ip: "catalogIp",
  cri: "catalogCri",
  cct: "catalogCct",
};
function applyBrandFromUrl() {
  const params = new URLSearchParams(location.search);
  Object.keys(state).forEach((key) => (state[key] = ""));
  Object.entries(FILTER_CONTROLS).forEach(([key, id]) => {
    const el = $(id),
      requested = params.get(key) || "";
    el.value = requested;
    if (el.tagName === "SELECT" && requested && !el.value) {
      const option = [...el.options].find(
        (o) => o.value.toLowerCase() === requested.toLowerCase(),
      );
      if (option) el.value = option.value;
    }
    state[key] = el.value;
  });
  state.quick = params.get("quick") || "";
  document
    .querySelectorAll("[data-quick]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.quick === state.quick),
    );
}
function syncBrandUrl() {
  const url = new URL(location.href);
  Object.keys(state).forEach((key) => {
    if (state[key] !== "") url.searchParams.set(key, state[key]);
    else url.searchParams.delete(key);
  });
  history.replaceState({}, "", url);
}
function buildCatalogIndex() {
  DATA.forEach((x) => {
    const modelText = (x.models || [])
      .map((m) =>
        [m.sku, m.name, m.power, m.flux, m.kss, m.cri, m.cct, m.ip, m.mounting]
          .filter((v) => v !== null && v !== undefined && v !== "")
          .join(" "),
      )
      .join(" ");
    searchIndex.set(x, {
      text: [
        x.brand,
        x.series,
        categoryTextFull(x),
        x.product_type,
        ...(x.applications || []),
        modelText,
      ]
        .join(" ")
        .toLowerCase(),
      quick: [categoryTextFull(x), ...(x.applications || [])]
        .join(" ")
        .toLowerCase(),
    });
  });
}
function seriesIPs(x) {
  return (
    uniq((x.models || []).map((m) => m.ip))
      .slice(0, 3)
      .join(", ") || "—"
  );
}
function valueRange(x, key, suffix = "") {
  const vals = (x.models || [])
    .map((m) => numVal(m[key]))
    .filter((v) => v !== null);
  if (!vals.length) return "—";
  const a = Math.min(...vals),
    b = Math.max(...vals);
  return (a === b ? a : a + "–" + b) + (suffix ? " " + suffix : "");
}
function seriesValues(x, key, limit = 6) {
  return (
    uniq((x.models || []).map((m) => m[key]))
      .slice(0, limit)
      .join(", ") || "—"
  );
}
function seriesUrl(x) {
  const u = new URL("series.html", window.location.href);
  u.searchParams.set("series", x.id);
  return u.toString();
}
function setSeriesUrl(x, replace = false) {
  const u = new URL(window.location.href);
  u.searchParams.set("series", x.id);
  history[replace ? "replaceState" : "pushState"]({ series: x.id }, "", u);
}
function clearSeriesUrl() {
  const u = new URL(window.location.href);
  u.searchParams.delete("series");
  history.replaceState({}, "", u);
}

function clearCatalogFilter(key) {
  if (key === "power") {
    state.powerMin = "";
    state.powerMax = "";
    $("powerMin").value = "";
    $("powerMax").value = "";
  } else {
    state[key] = "";
    const el = $(FILTER_CONTROLS[key] || key);
    if (el) el.value = "";
  }
  if (key === "quick")
    document
      .querySelectorAll("[data-quick]")
      .forEach((x) => x.classList.toggle("active", x.dataset.quick === ""));
  syncBrandUrl();
  render();
}
function renderActiveFilters() {
  const box = $("activeFilters");
  if (!box) return;
  const items = [];
  if (state.q) items.push(["q", "Поиск: " + state.q]);
  if (state.brand) items.push(["brand", "Производитель: " + state.brand]);
  if (state.section) items.push(["section", "Категория: " + state.section]);
  if (state.subsection)
    items.push(["subsection", "Подкатегория: " + state.subsection]);
  if (state.powerMin || state.powerMax)
    items.push([
      "power",
      "Мощность: " +
        (state.powerMin || "0") +
        "–" +
        (state.powerMax || "∞") +
        " Вт",
    ]);
  if (state.kss)
    items.push([
      "kss",
      "Оптика: " +
        ($("catalogKss").selectedOptions[0]?.textContent || state.kss),
    ]);
  if (state.ip) items.push(["ip", "IP: " + state.ip]);
  if (state.cri) items.push(["cri", "CRI ≥ " + state.cri]);
  if (state.cct) items.push(["cct", "CCT: " + state.cct]);
  if (state.quick) items.push(["quick", "Быстрый фильтр: " + state.quick]);
  $("filterCount").textContent = String(items.length);
  box.classList.toggle("show", items.length > 0);
  box.innerHTML = items.length
    ? '<span class="active-filter-label">Выбрано:</span>' +
      items
        .map(
          ([key, label]) =>
            `<button class="active-filter-chip" type="button" data-clear-filter="${esc(key)}">${esc(label)} <span>×</span></button>`,
        )
        .join("")
    : "";
  box
    .querySelectorAll("[data-clear-filter]")
    .forEach(
      (btn) =>
        (btn.onclick = () => clearCatalogFilter(btn.dataset.clearFilter)),
    );
}
function seriesCharacteristicsText(s) {
  return [
    s.brand + " " + s.series,
    "Категории: " + categoryTextFull(s),
    "Мощность: " + powerRange(s),
    "Световой поток: " + valueRange(s, "flux", "лм"),
    "IP: " + seriesValues(s, "ip"),
    "КСС: " + seriesValues(s, "kss"),
    "CRI: " + seriesValues(s, "cri"),
    "Цветовая температура, К: " + seriesValues(s, "cct"),
    "Крепление: " + seriesValues(s, "mounting"),
    "Модификаций: " + String(s.models?.length || 0),
    seriesUrl(s),
  ].join("\n");
}
const BRAND_LOGOS = {
  ARUNA: "logo-aruna.png",
  FEREKS: "logo-fereks.png",
  LEDEL: "logo-ledel.png",
  LUXCORE: "logo-luxcore.png",
  PLG: "logo-plg.png",
};
function brandMark(brand) {
  const src = BRAND_LOGOS[brand];
  return src
    ? `<span class="brand-mark brand-${esc(String(brand).toLowerCase())}"><img src="${esc(src)}" alt="${esc(brand)}"></span>`
    : `<span class="brand-mark">${esc(brand)}</span>`;
}
function render() {
  const q = state.q.trim().toLowerCase();
  const pMin = state.powerMin === "" ? null : Number(state.powerMin);
  const pMax = state.powerMax === "" ? null : Number(state.powerMax);
  const powerActive = pMin !== null || pMax !== null;
  const rows = DATA.filter((x) => {
    const models = x.models || [];
    const indexed = searchIndex.get(x);
    const text = indexed.text;
    const quickText = indexed.quick;
    const quickOk =
      !state.quick ||
      hasCategory(x, state.quick) ||
      quickText.includes(state.quick.toLowerCase());
    const matchingPowerModels = modelsInPowerRange(models, pMin, pMax);
    const powerOk = !powerActive || matchingPowerModels.length > 0;
    const kssOk =
      !state.kss || models.some((m) => matchesOptics(m.kss, state.kss));
    const ipOk =
      !state.ip || models.some((m) => String(m.ip ?? "") === state.ip);
    const criOk =
      !state.cri ||
      models.some((m) => m.cri !== null && Number(m.cri) >= Number(state.cri));
    const cctOk =
      !state.cct ||
      models.some((m) => String(m.cct ?? "") === String(state.cct));
    return (
      (!q || text.includes(q)) &&
      quickOk &&
      (!state.brand || x.brand === state.brand) &&
      hasCategory(x, state.section) &&
      hasSubcategory(x, state.subsection) &&
      powerOk &&
      kssOk &&
      ipOk &&
      criOk &&
      cctOk
    );
  });
  $("resultText").textContent =
    "Найдено: " +
    rows.length +
    " из " +
    DATA.length +
    " серий · " +
    rows.reduce((n, x) => n + x.models.length, 0).toLocaleString("ru-RU") +
    " модификаций в сериях";
  syncBrandUrl();
  renderActiveFilters();
  $("grid").setAttribute("aria-busy", "false");
  $("grid").innerHTML = rows.length
    ? rows
        .map((x) => {
          const selected = compareIds.includes(x.id);
          const allModels = x.models || [];
          const displayedModels = powerActive
            ? modelsInPowerRange(allModels, pMin, pMax)
            : allModels;
          const modelCount = powerActive
            ? `${displayedModels.length.toLocaleString("ru-RU")} из ${allModels.length.toLocaleString("ru-RU")} мод.`
            : `${allModels.length.toLocaleString("ru-RU")} мод.`;
          const displayedPower = powerActive
            ? powerRangeFromModels(displayedModels)
            : powerRange(x);
          return `<article class="card${selected ? " is-compared" : ""}" data-id="${esc(x.id)}"><div class="image">${x.brand !== "PLG" && x.image ? `<img loading="lazy" decoding="async" src="${esc(x.image)}" alt="${esc(x.brand + " " + x.series)}">` : `<div class="placeholder">${esc(x.brand)}<br>${esc(x.series)}</div>`}</div><div class="body"><div class="topline">${brandMark(x.brand)}<span class="count">${modelCount}</span></div><h3 class="name"><a href="${esc(seriesUrl(x))}" data-open-series="${esc(x.id)}">${esc(x.series)}</a></h3><div class="category">${esc(categoryText(x))}</div><div class="specs"><div class="spec"><small>Мощность</small><b>${esc(displayedPower)}</b></div><div class="spec"><small>IP</small><b>${esc(seriesIPs(x))}</b></div></div><div class="card-actions"><button class="open-btn" type="button" data-open-series="${esc(x.id)}">Открыть модификации →</button><button class="compare-btn${selected ? " active" : ""}" type="button" data-compare="${esc(x.id)}">${selected ? "✓ В сравнении" : "+ Сравнить"}</button></div></div></article>`;
        })
        .join("")
    : `<div class="empty"><h3>По выбранным параметрам оборудование не найдено</h3><p>Измените запрос, расширьте диапазон мощности или сбросьте фильтры.</p><button class="reset-inline" id="emptyReset" type="button">Сбросить фильтры</button></div>`;
  if ($("emptyReset")) $("emptyReset").onclick = () => $("reset").click();
  document.querySelectorAll("[data-open-series]").forEach(
    (btn) =>
      (btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSeries(btn.dataset.openSeries, true);
      }),
  );
  document.querySelectorAll("[data-compare]").forEach(
    (btn) =>
      (btn.onclick = (e) => {
        e.stopPropagation();
        toggleCompare(btn.dataset.compare);
      }),
  );
}
let inputTimer;
Object.entries(FILTER_CONTROLS).forEach(([key, id]) => {
  const el = $(id);
  el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
    state[key] = el.value;
    clearTimeout(inputTimer);
    if (el.tagName === "SELECT") render();
    else inputTimer = setTimeout(render, 120);
  });
});
$("clear").onclick = () => {
  clearTimeout(inputTimer);
  $("q").value = "";
  state.q = "";
  render();
  $("q").focus();
};
$("reset").onclick = () => {
  clearTimeout(inputTimer);
  Object.keys(state).forEach((k) => (state[k] = ""));
  Object.values(FILTER_CONTROLS).forEach((id) => ($(id).value = ""));
  document
    .querySelectorAll("[data-quick]")
    .forEach((b) => b.classList.toggle("active", b.dataset.quick === ""));
  render();
};
document.querySelectorAll("[data-quick]").forEach(
  (btn) =>
    (btn.onclick = () => {
      state.quick = btn.dataset.quick;
      document
        .querySelectorAll("[data-quick]")
        .forEach((b) => b.classList.toggle("active", b === btn));
      render();
    }),
);
function openSeries(id, updateUrl = false) {
  activeSeries = DATA.find((x) => x.id === id);
  if (!activeSeries) return;
  updateBreadcrumb(activeSeries);
  const requestedSku = new URLSearchParams(location.search).get("sku");
  selectedModelKey =
    requestedSku &&
    activeSeries.models?.some((m) => String(m.sku) === requestedSku)
      ? requestedSku
      : null;
  modelState = {
    q: "",
    power: "",
    kss: "",
    cri: "",
    cct: "",
    mounting: "",
    ip: "",
    sort: "",
  };
  modelPage = selectedModelKey
    ? Math.max(
        0,
        Math.floor(
          activeSeries.models.findIndex(
            (m, i) => modelKey(m, i) === selectedModelKey,
          ) / PAGE_SIZE,
        ),
      )
    : 0;
  renderModal();
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (updateUrl) setSeriesUrl(activeSeries);
}
function closeModal() {
  if (document.body.classList.contains("series-page")) {
    location.href = "catalog.html";
    return;
  }
  $("modal").classList.remove("open");
  $("modal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  activeSeries = null;
  updateBreadcrumb();
  clearSeriesUrl();
}
document
  .querySelectorAll("[data-close]")
  .forEach((x) => (x.onclick = closeModal));
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    !$("catalogFilters").classList.contains("is-open")
  ) {
    if ($("compareModal").classList.contains("open")) closeCompare();
    else if (
      $("modal").classList.contains("open") &&
      !document.body.classList.contains("series-page")
    )
      closeModal();
  }
});
const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : v);
function optionHTML(values, selected) {
  return (
    '<option value="">Все</option>' +
    values
      .map(
        (v) =>
          `<option value="${esc(v)}" ${String(v) === String(selected) ? "selected" : ""}>${esc(v)}</option>`,
      )
      .join("")
  );
}

function seriesNumRange(models, field, unit = "") {
  const vals = models.map((m) => numVal(m[field])).filter((v) => v !== null);
  if (!vals.length) return null;
  const min = Math.min(...vals),
    max = Math.max(...vals);
  const fmtNum = (n) =>
    Number.isInteger(n)
      ? String(n)
      : String(Math.round(n * 10) / 10).replace(".", ",");
  return `${fmtNum(min)}${min === max ? "" : "–" + fmtNum(max)}${unit ? " " + unit : ""}`;
}
function seriesTextValues(models, field, unit = "", limit = 8) {
  const vals = uniq(models.map((m) => m[field]));
  if (!vals.length) return null;
  const shown = vals
    .slice(0, limit)
    .map((v) => `${v}${unit ? " " + unit : ""}`);
  return (
    shown.join(" / ") +
    (vals.length > limit ? ` / ещё ${vals.length - limit}` : "")
  );
}
function seriesDimensions(models) {
  const vals = uniq(models.map((m) => m.dimensions));
  if (!vals.length) return null;
  if (vals.length <= 3) return vals.join(" / ");
  return `${vals.length} вариантов`;
}
function summaryRow(label, value) {
  return nonEmpty(value)
    ? `<div class="series-overview-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`
    : "";
}
function summaryGroup(title, rows) {
  const body = rows.join("");
  return body
    ? `<section class="series-overview-group"><h4>${esc(title)}</h4>${body}</section>`
    : "";
}
function renderSeriesOverview(s) {
  const models = s.models || [];
  const main = summaryGroup("Основные характеристики", [
    summaryRow("Мощность", seriesNumRange(models, "power", "Вт")),
    summaryRow("Световой поток", seriesNumRange(models, "flux", "лм")),
    summaryRow("Световая отдача", seriesNumRange(models, "efficacy", "лм/Вт")),
    summaryRow("CRI", seriesCri(s)),
    summaryRow("Цветовая температура, К", seriesTextValues(models, "cct")),
    summaryRow("IP", seriesTextValues(models, "ip")),
    summaryRow("IK", seriesTextValues(models, "ik")),
    summaryRow("КСС / оптика", seriesTextValues(models, "kss", "", 10)),
  ]);
  const construction = summaryGroup("Конструкция", [
    summaryRow("Материал корпуса", seriesTextValues(models, "housing")),
    summaryRow("Материал рассеивателя", seriesTextValues(models, "diffuser")),
    summaryRow("Тип монтажа", seriesTextValues(models, "mounting")),
    summaryRow("Габариты", seriesDimensions(models)),
    summaryRow("Климатическое исполнение", seriesTextValues(models, "climate")),
    summaryRow(
      "Температура эксплуатации",
      seriesTextValues(models, "operating_temperature"),
    ),
  ]);
  const electric = summaryGroup("Электрика", [
    summaryRow("Напряжение", seriesTextValues(models, "voltage")),
    summaryRow(
      "Диапазон напряжения",
      seriesTextValues(models, "voltage_range"),
    ),
    summaryRow("Класс защиты", seriesTextValues(models, "protection_class")),
  ]);
  const subject = `Запрос документации: ${s.brand} ${s.series}`;
  const body = `Здравствуйте!%0D%0A%0D%0AПрошу направить доступную документацию по серии ${s.brand} ${s.series}: паспорт, IES/LDT и сертификаты.%0D%0A%0D%0AСпасибо.`;
  return `<section class="series-overview"><div class="series-overview-head"><div><h3>Характеристики серии</h3><p>Диапазоны и доступные варианты рассчитаны по модификациям этой серии.</p></div><div class="series-overview-count"><strong>${models.length.toLocaleString("ru-RU")}</strong> модификаций</div></div><div class="series-overview-grid">${main}${construction}${electric}</div><div class="docs-request"><div><strong>Паспорта, IES/LDT и сертификаты</strong><p>Эти файлы можно запросить у нас при необходимости.</p></div><a class="docs-request-btn" href="mailto:svet@smp-76.ru?subject=${encodeURIComponent(subject)}&body=${body}">Запросить</a></div></section>`;
}

function renderModal() {
  const s = activeSeries,
    models = s.models || [];
  const all = {
    power: uniq(models.map((m) => m.power)),
    kss: uniq(models.map((m) => m.kss)),
    cri: uniq(models.map((m) => m.cri)),
    cct: uniq(models.map((m) => m.cct)),
    mounting: uniq(models.map((m) => m.mounting)),
    ip: uniq(models.map((m) => m.ip)),
  };
  $("modalContent").innerHTML =
    `<div class="series-head"><div class="series-photo">${s.brand !== "PLG" && s.image ? `<img src="${esc(s.image)}" alt="${esc(s.brand + " " + s.series)}">` : `<div class="placeholder">${esc(s.brand)}<br>${esc(s.series)}</div>`}</div><div class="series-meta"><div class="eyebrow2">${esc(s.brand)} · ${esc(s.product_type || "Светильник")}</div><h2 id="modalTitle">${esc(s.series)}</h2><p>${esc(categoryText(s))}</p><div class="chips">${(s.applications || []).map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div><div class="share-actions"><button class="share-btn" id="copySeriesLink" type="button">Копировать ссылку на серию</button><button class="share-btn series-copy-specs" id="copySeriesSpecs" type="button">Копировать характеристики</button><span class="share-status" id="shareStatus"></span></div></div></div>${renderSeriesOverview(s)}<div class="config-title"><h3>Модификации серии</h3><p>Используйте фильтры или поиск по артикулу. Нажмите на артикул, чтобы скопировать его.</p></div><div class="model-toolbar"><div class="model-search"><input id="mq" aria-label="Поиск по артикулу в серии" placeholder="Поиск только по артикулу" value="${esc(modelState.q)}"></div><div class="model-tools-row"><div class="model-filters"><div><label for="model-power">Мощность</label><select id="model-power" aria-label="Мощность" data-mf="power">${optionHTML(all.power, modelState.power)}</select></div><div><label for="model-kss">КСС</label><select id="model-kss" aria-label="КСС" data-mf="kss">${optionHTML(all.kss, modelState.kss)}</select></div><div><label for="model-cri">CRI</label><select id="model-cri" aria-label="CRI" data-mf="cri">${optionHTML(all.cri, modelState.cri)}</select></div><div><label for="model-cct">Цветовая температура, К</label><select id="model-cct" aria-label="Цветовая температура, К" data-mf="cct">${optionHTML(all.cct, modelState.cct)}</select></div><div><label for="model-ip">IP</label><select id="model-ip" aria-label="IP" data-mf="ip">${optionHTML(all.ip, modelState.ip)}</select></div><div><label for="model-mounting">Крепление</label><select id="model-mounting" aria-label="Крепление" data-mf="mounting">${optionHTML(all.mounting, modelState.mounting)}</select></div></div><div class="sort-panel"><label>Сортировка</label><select id="msort" aria-label="Сортировка модификаций"><option value="">По умолчанию</option><option value="power-asc" ${modelState.sort === "power-asc" ? "selected" : ""}>Мощность: по возрастанию</option><option value="power-desc" ${modelState.sort === "power-desc" ? "selected" : ""}>Мощность: по убыванию</option><option value="flux-asc" ${modelState.sort === "flux-asc" ? "selected" : ""}>Световой поток: по возрастанию</option><option value="flux-desc" ${modelState.sort === "flux-desc" ? "selected" : ""}>Световой поток: по убыванию</option></select></div></div><button class="model-reset" id="mreset">Сбросить характеристики</button></div><div id="modelResults"></div>`;
  document.querySelectorAll("[data-mf]").forEach(
    (el) =>
      (el.onchange = (e) => {
        modelState[e.target.dataset.mf] = e.target.value;
        modelPage = 0;
        renderModels();
      }),
  );
  $("mq").oninput = (e) => {
    modelState.q = e.target.value;
    modelPage = 0;
    renderModels();
  };
  $("msort").onchange = (e) => {
    modelState.sort = e.target.value;
    modelPage = 0;
    renderModels();
  };
  $("mreset").onclick = () => {
    modelPage = 0;
    modelState = {
      q: "",
      power: "",
      kss: "",
      cri: "",
      cct: "",
      mounting: "",
      ip: "",
      sort: "",
    };
    renderModal();
  };
  $("copySeriesLink").onclick = () =>
    copyText(seriesUrl(s), $("shareStatus"), "Ссылка скопирована");
  $("copySeriesSpecs").onclick = () =>
    copyText(
      seriesCharacteristicsText(s),
      $("shareStatus"),
      "Характеристики скопированы",
    );
  if (document.body.classList.contains("series-page")) {
    const title = $("modalTitle");
    const h = document.createElement("h1");
    h.id = title.id;
    h.textContent = title.textContent;
    title.replaceWith(h);
  }
  renderModels();
}
function numVal(v) {
  const n = parseFloat(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}
function copySku(value, btn) {
  const text = String(value ?? "");
  if (!text) return;
  const label = btn.textContent;
  const done = () => {
    btn.textContent = "Скопировано";
    setTimeout(() => {
      if (btn.isConnected) btn.textContent = label;
    }, 1600);
  };
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function copyText(text, statusEl, message = "Скопировано") {
  const done = () => {
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => (statusEl.textContent = ""), 1600);
    }
  };
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  done();
}
function compareItem(key) {
  const [id, sku] = key.split("::");
  const series = DATA.find((x) => x.id === id);
  if (!series) return null;
  if (!sku) return series;
  const model = series.models.find((m) => String(m.sku ?? m.name) === sku);
  return model
    ? {
        ...series,
        series: series.series + " / " + sku,
        models: [model],
        isModel: true,
      }
    : null;
}
function toggleCompare(id) {
  const i = compareIds.indexOf(id);
  if (i >= 0) compareIds.splice(i, 1);
  else {
    if (compareIds.length >= 3) {
      window.smpToast?.(
        "Можно сравнить до трёх позиций. Удалите одну из выбранных.",
      );
      return;
    }
    compareIds.push(id);
    window.smpToast?.("Добавлено в сравнение");
  }
  updateCompareBar();
  render();
  if (activeSeries) renderModels();
}
function updateCompareBar() {
  const n = compareIds.length;
  $("compareBarText").textContent = "Выбрано: " + n + " / 3";
  const items = compareIds.map(compareItem).filter(Boolean);
  $("compareItems").innerHTML = items
    .map(
      (x) =>
        `<span class="compare-mini" title="${esc(x.brand + " " + x.series)}">${x.brand !== "PLG" && x.image ? `<img src="${esc(x.image)}" alt="">` : `<b>${esc(x.brand.slice(0, 3))}</b>`}</span>`,
    )
    .join("");
  $("compareBar").classList.toggle("show", n > 0);
  $("compareOpen").disabled = n < 2;
}
function closeCompare() {
  $("compareModal").classList.remove("open");
  $("compareModal").setAttribute("aria-hidden", "true");
  if (!$("modal").classList.contains("open"))
    document.body.classList.remove("modal-open");
}
function renderComparison() {
  const items = compareIds.map(compareItem).filter(Boolean);
  if (!items.length) {
    closeCompare();
    return;
  }
  const row = (label, fn) => {
    const vals = items.map(fn),
      different = new Set(vals.map((v) => String(v))).size > 1;
    return `<tr><th scope="row">${label}</th>${vals.map((v) => `<td class="${different ? "diff" : ""}">${esc(v)}</td>`).join("")}</tr>`;
  };
  $("compareContent").innerHTML =
    `<div class="eyebrow">Техническое сопоставление</div><h2 class="compare-title" id="compareTitle">Сравнение оборудования</h2><p class="compare-subtitle">Различающиеся характеристики выделены цветом. Для серий показаны диапазоны модификаций.${items.length < 2 ? " Добавьте ещё одну позицию для сравнения." : ""}</p><div class="compare-table-wrap" tabindex="0" role="region" aria-label="Сравнительная таблица, прокрутка по горизонтали"><table class="compare-table"><thead><tr><th scope="col">Характеристика</th>${items.map((x, i) => `<th scope="col"><div class="compare-product">${x.brand !== "PLG" && x.image ? `<img src="${esc(x.image)}" alt="${esc(x.brand + " " + x.series)}">` : ""}${brandMark(x.brand)}<strong>${esc(x.series)}</strong><small>${esc(categoryText(x))}</small><a class="compare-open-series" href="${esc(seriesUrl(x))}">Открыть серию →</a><button type="button" class="compare-remove" data-remove-compare="${esc(compareIds[i])}" aria-label="Убрать ${esc(x.series)} из сравнения">Убрать ×</button></div></th>`).join("")}</tr></thead><tbody>${row("Производитель", (x) => x.brand)}${row("Категории", (x) => categoryTextFull(x))}${row("Мощность", (x) => powerRange(x))}${row("Световой поток", (x) => valueRange(x, "flux", "лм"))}${row("Световая отдача", (x) => valueRange(x, "efficacy", "лм/Вт"))}${row("IP", (x) => seriesValues(x, "ip"))}${row("КСС", (x) => seriesValues(x, "kss"))}${row("CRI", (x) => seriesCri(x))}${row("Цветовая температура, К", (x) => seriesValues(x, "cct"))}${row("Напряжение", (x) => seriesValues(x, "voltage"))}${row("Крепление", (x) => seriesValues(x, "mounting"))}${row("Взрывозащита", (x) => seriesValues(x, "explosion_marking"))}${row("Количество модификаций", (x) => String(x.models?.length || 0))}</tbody></table></div>`;
  $("compareModal").classList.add("open");
  $("compareModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  $("compareContent")
    .querySelectorAll("[data-remove-compare]")
    .forEach(
      (btn) =>
        (btn.onclick = () => {
          compareIds.splice(compareIds.indexOf(btn.dataset.removeCompare), 1);
          updateCompareBar();
          render();
          if (activeSeries) renderModels();
          renderComparison();
          $("compareModal").querySelector("button")?.focus();
        }),
    );
}
$("compareOpen").onclick = renderComparison;
$("compareClear").onclick = () => {
  compareIds.length = 0;
  updateCompareBar();
  render();
};
document
  .querySelectorAll("[data-compare-close]")
  .forEach((x) => (x.onclick = closeCompare));
function coloredLight(model) {
  return (
    model.cri === null &&
    /amber|янтар|голуб|зелен|красн|rgb|blue|green|red|(?:^|[ (/])[BGR](?:[ (/]|$)/i.test(
      String(model.cct),
    )
  );
}
function modelCri(model) {
  return coloredLight(model) ? "Не применяется" : fmt(model.cri);
}
function seriesCri(series) {
  const values = uniq(series.models.map(modelCri));
  return values.join(" / ") || "—";
}
function nonEmpty(v) {
  return v !== null && v !== undefined && v !== "";
}
function withUnit(v, unit) {
  return nonEmpty(v) ? `${v}${unit ? " " + unit : ""}` : "—";
}
function detailRow(label, value) {
  return nonEmpty(value)
    ? `<div class="passport-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`
    : "";
}
function detailGroup(title, rows) {
  const body = rows.join("");
  return body
    ? `<section class="passport-group"><h4>${esc(title)}</h4>${body}</section>`
    : "";
}
function modelKey(m, index) {
  return String(m.sku ?? m.name ?? index);
}
function renderPassport(model) {
  if (!model)
    return `<aside class="model-passport"><div class="passport-empty"><strong>Выберите модификацию</strong>Характеристики выбранного светильника появятся здесь.</div></aside>`;
  const main = detailGroup("Основные характеристики", [
    detailRow("Мощность", withUnit(model.power, "Вт")),
    detailRow("Световой поток", withUnit(model.flux, "лм")),
    detailRow("Световая отдача", withUnit(model.efficacy, "лм/Вт")),
    detailRow("CRI", modelCri(model)),
    detailRow("Цветовая температура, К", model.cct),
    detailRow("Степень защиты", model.ip),
    detailRow("Ударопрочность", model.ik),
    detailRow("КСС / оптика", model.kss),
  ]);
  const construction = detailGroup("Конструкция", [
    detailRow("Конструкция", model.construction),
    detailRow("Материал корпуса", model.housing),
    detailRow("Материал рассеивателя", model.diffuser),
    detailRow("Тип рассеивателя", model.diffuser_type),
    detailRow("Тип монтажа", model.mounting),
    detailRow("Габариты", model.dimensions),
    detailRow("Климатическое исполнение", model.climate),
    detailRow("Температура эксплуатации", model.operating_temperature),
  ]);
  const electric = detailGroup("Электрика", [
    detailRow("Напряжение", model.voltage),
    detailRow("Диапазон напряжения", model.voltage_range),
    detailRow("Класс защиты", model.protection_class),
    detailRow("Маркировка взрывозащиты", model.explosion_marking),
  ]);
  return `<aside class="model-passport"><div class="passport-head"><div class="passport-kicker">Характеристики модификации</div><div class="passport-title-row"><div class="passport-title">${esc(fmt(model.sku))}</div><button class="passport-copy" type="button" data-passport-copy="${esc(fmt(model.sku))}">Копировать</button></div><div class="passport-name">${esc(fmt(model.name))}</div></div><div class="passport-groups">${main}${construction}${electric}</div></aside>`;
}
function renderModels() {
  const models = activeSeries?.models || [],
    q = modelState.q.trim().toLowerCase();
  let rows = models.filter((m) => {
    const sku = String(m.sku ?? m.name ?? "").toLowerCase();
    return (
      (!q || sku.includes(q)) &&
      Object.entries(modelState).every(
        ([k, v]) =>
          k === "q" || k === "sort" || !v || String(m[k]) === String(v),
      )
    );
  });
  if (modelState.sort) {
    const [field, dir] = modelState.sort.split("-");
    rows = [...rows].sort((a, b) => {
      const av = numVal(a[field]),
        bv = numVal(b[field]);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir === "asc" ? av - bv : bv - av;
    });
  }
  modelPage = Math.max(
    0,
    Math.min(modelPage, Math.ceil(rows.length / PAGE_SIZE) - 1),
  );
  const shown = rows.slice(modelPage * PAGE_SIZE, (modelPage + 1) * PAGE_SIZE);
  if (
    shown.length &&
    !shown.some((m, i) => modelKey(m, i) === selectedModelKey)
  )
    selectedModelKey = modelKey(shown[0], 0);
  if (!shown.length) selectedModelKey = null;
  const selected =
    shown.find((m, i) => modelKey(m, i) === selectedModelKey) ||
    shown[0] ||
    null;
  $("modelResults").innerHTML =
    `<div class="model-count">Найдено модификаций: ${rows.length}${rows.length ? " · " + (modelPage * PAGE_SIZE + 1) + "–" + Math.min(rows.length, (modelPage + 1) * PAGE_SIZE) : ""}</div>${
      shown.length
        ? `<div class="models-workspace"><div class="models-list"><div class="table-wrap"><table class="model-table"><thead><tr><th>Артикул</th><th>Мощность</th><th>Световой поток</th><th>КСС</th><th>Цветовая температура, К</th><th>IP</th><th>Сравнение</th></tr></thead><tbody>${shown
            .map((m, i) => {
              const key = modelKey(m, i),
                sel = key === selectedModelKey;
              return `<tr data-model-key="${esc(key)}" class="${sel ? "selected" : ""}"><td class="sku-cell" title="${esc(fmt(m.sku))}"><button type="button" class="sku-select" data-model-select="${esc(key)}" aria-pressed="${sel}">${esc(fmt(m.sku))}</button></td><td>${esc(withUnit(m.power, "Вт"))}</td><td>${esc(withUnit(m.flux, "лм"))}</td><td>${esc(fmt(m.kss))}</td><td>${esc(fmt(m.cct))}</td><td>${esc(fmt(m.ip))}</td><td><button class="model-compare" type="button" aria-pressed="${compareIds.includes(activeSeries.id + "::" + String(m.sku ?? m.name))}" data-compare-model="${esc(activeSeries.id + "::" + String(m.sku ?? m.name))}">${compareIds.includes(activeSeries.id + "::" + String(m.sku ?? m.name)) ? "✓ Выбрано" : "+ Сравнить"}</button></td></tr>`;
            })
            .join(
              "",
            )}</tbody></table></div></div>${renderPassport(selected)}</div>`
        : `<div class="no-models">По выбранным характеристикам модификаций нет.</div>`
    }`;
  $("modelResults")
    .querySelectorAll("[data-model-select]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          selectedModelKey = button.dataset.modelSelect;
          renderModels();
          $("modelResults")
            .querySelector(
              '[data-model-select="' + CSS.escape(selectedModelKey) + '"]',
            )
            ?.focus({ preventScroll: true });
        }),
    );
  $("modelResults")
    .querySelectorAll("[data-compare-model]")
    .forEach(
      (button) =>
        (button.onclick = () => toggleCompare(button.dataset.compareModel)),
    );
  if (rows.length > PAGE_SIZE) {
    $("modelResults").insertAdjacentHTML(
      "beforeend",
      `<div class="model-pagination"><button type="button" id="modelsPrev" ${modelPage === 0 ? "disabled" : ""}>← Назад</button><span>Страница ${modelPage + 1} из ${Math.ceil(rows.length / PAGE_SIZE)}</span><button type="button" id="modelsNext" ${(modelPage + 1) * PAGE_SIZE >= rows.length ? "disabled" : ""}>Далее →</button></div>`,
    );
    $("modelsPrev").onclick = () => {
      modelPage--;
      renderModels();
      $("modelResults").scrollIntoView({ block: "start" });
      $("modelResults")
        .querySelector("[data-model-select]")
        ?.focus({ preventScroll: true });
    };
    $("modelsNext").onclick = () => {
      modelPage++;
      renderModels();
      $("modelResults").scrollIntoView({ block: "start" });
      $("modelResults")
        .querySelector("[data-model-select]")
        ?.focus({ preventScroll: true });
    };
  }
  if (compareIds.length) {
    $("modelResults").insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="model-compare-launch" id="modelCompareLaunch" ${compareIds.length < 2 ? "disabled" : ""}>Сравнить выбранные позиции (${compareIds.length}) →</button>`,
    );
    $("modelCompareLaunch").onclick = renderComparison;
  }
  const copyBtn = document.querySelector("[data-passport-copy]");
  if (copyBtn)
    copyBtn.onclick = () => copySku(copyBtn.dataset.passportCopy, copyBtn);
}
async function initCatalog() {
  try {
    const response = await fetch("catalog-data.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    DATA = Array.isArray(payload) ? payload : payload.series || [];
    buildCatalogIndex();
    hydrateCatalogControls();
    applyBrandFromUrl();
    updateBreadcrumb();
    render();
    updateCompareBar();
    const params = new URLSearchParams(location.search);
    let initialSeries = params.get("series");
    if (!initialSeries && location.pathname.endsWith("series.html")) {
      try {
        initialSeries = sessionStorage.getItem("smp-open-series") || "";
        sessionStorage.removeItem("smp-open-series");
      } catch {}
    }
    const initialItem = initialSeries
      ? DATA.find((x) => String(x.id).trim() === initialSeries.trim())
      : null;
    if (initialItem) {
      if (location.pathname.endsWith("series.html")) {
        document.body.classList.add("series-page");
        const dialog = $("modal").querySelector("[role=dialog]");
        dialog.removeAttribute("aria-modal");
        dialog.setAttribute("role", "main");
        $("main-content").removeAttribute("id");
        dialog.id = "main-content";
        document.querySelector(".hero h1")?.remove();
        $("modal")
          .querySelector("[data-close][aria-label]")
          .setAttribute("aria-label", "Вернуться в каталог");
      }
      openSeries(initialItem.id, false);
    } else if (initialSeries) {
      $("grid").innerHTML =
        '<div class="empty"><h3>Серия не найдена</h3><p>Проверьте ссылку или выберите оборудование в каталоге.</p><a href="catalog.html">Вернуться в каталог</a></div>';
    }
    const requested = params
      .getAll("compare")
      .flatMap((v) => v.split(","))
      .filter((id) => DATA.some((x) => x.id === id));
    requested.slice(0, 3).forEach((id) => {
      if (!compareIds.includes(id)) compareIds.push(id);
    });
    if (compareIds.length) {
      updateCompareBar();
      render();
      if (compareIds.length > 1) renderComparison();
    }
  } catch (error) {
    $("grid").setAttribute("aria-busy", "false");
    $("resultText").textContent = "Не удалось загрузить оборудование";
    $("grid").innerHTML =
      '<div class="empty"><h3>Не удалось загрузить каталог</h3><p>Проверьте подключение и повторите загрузку.</p><button type="button" id="retryCatalog">Повторить</button></div>';
    $("retryCatalog").onclick = initCatalog;
  }
}
window.addEventListener("popstate", () => {
  if (!DATA.length) return;
  applyBrandFromUrl();
  render();
  const id = new URLSearchParams(location.search).get("series");
  if (id && DATA.some((x) => x.id === id)) openSeries(id, false);
  else if ($("modal").classList.contains("open")) {
    $("modal").classList.remove("open");
    $("modal").setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeSeries = null;
  }
});
function setFiltersOpen(open) {
  $("catalogFilters").classList.toggle("is-open", open);
  document
    .querySelectorAll(
      ".catalog-content,.smp-header,.hero,.quick-wrap,.smp-footer,.breadcrumbs,.mobile-filter-bar",
    )
    .forEach((el) => (el.inert = open));
  $("filterBackdrop").hidden = !open;
  $("openFilters").setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("sheet-open", open);
  if (open) {
    $("catalogFilters").setAttribute("role", "dialog");
    $("catalogFilters").setAttribute("aria-modal", "true");
    $("catalogFilters").querySelector("button").focus();
  } else {
    $("catalogFilters").removeAttribute("role");
    $("catalogFilters").removeAttribute("aria-modal");
    $("openFilters").focus();
  }
}
$("openFilters").onclick = () => setFiltersOpen(true);
document
  .querySelectorAll("[data-close-filters]")
  .forEach((btn) => (btn.onclick = () => setFiltersOpen(false)));
$("filterBackdrop").onclick = () => setFiltersOpen(false);
document.addEventListener("keydown", (e) => {
  if (!$("catalogFilters").classList.contains("is-open")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    setFiltersOpen(false);
  }
  if (e.key === "Tab") {
    const els = [
      ...$("catalogFilters").querySelectorAll("button,input,select"),
    ].filter((x) => !x.disabled && x.getClientRects().length);
    if (e.shiftKey && document.activeElement === els[0]) {
      e.preventDefault();
      els.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
      e.preventDefault();
      els[0].focus();
    }
  }
});
matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
  if (e.matches && $("catalogFilters").classList.contains("is-open"))
    setFiltersOpen(false);
});
initCatalog();
