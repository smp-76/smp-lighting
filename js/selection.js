let SERIES = [],
  MODELS = [];
const selectedSeries = new Set();
const $ = (id) => document.getElementById(id);
const uniq = (a) =>
  [...new Set(a.filter((v) => v !== null && v !== undefined && v !== ""))].sort(
    (a, b) => String(a).localeCompare(String(b), "ru", { numeric: true }),
  );
function fill(id, vals) {
  const s = $(id);
  vals.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    s.appendChild(o);
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
function buildOpticsChecklist(values) {
  const menu = $("kssMenu");
  if (!menu) return;
  const available = new Set(
    values.map((v) => opticsInfo(v)?.group).filter(Boolean),
  );
  const order = ["narrow", "medium", "wide", "asym", "special", "none"];
  menu.innerHTML =
    order
      .filter((group) => available.has(group))
      .map(
        (group) =>
          `<label class="multi-select-option"><input type="checkbox" name="kssGroup" value="${group}" data-optics-group="${group}"><span>${opticsGroupTitle(group)}</span></label>`,
      )
      .join("") +
    '<div class="multi-select-actions"><button type="button" class="multi-select-clear" id="kssClear">Снять выбор</button></div>';
  menu
    .querySelectorAll('input[name="kssGroup"]')
    .forEach((input) => input.addEventListener("change", updateOpticsSummary));
  $("kssClear").addEventListener("click", () => {
    menu
      .querySelectorAll('input[name="kssGroup"]')
      .forEach((input) => (input.checked = false));
    updateOpticsSummary();
  });
  $("kssToggle").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleOpticsMenu();
  });
  document.addEventListener("click", (event) => {
    if (!$("kssMulti").contains(event.target)) closeOpticsMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOpticsMenu();
  });
  updateOpticsSummary();
}
function selectedOpticsGroups() {
  return [...document.querySelectorAll('input[name="kssGroup"]:checked')].map(
    (input) => input.value,
  );
}
function updateOpticsSummary() {
  const selected = selectedOpticsGroups();
  const toggle = $("kssToggle");
  if (!selected.length) toggle.textContent = "Любая оптика";
  else if (selected.length === 1)
    toggle.textContent = opticsGroupTitle(selected[0]);
  else toggle.textContent = "Выбрано: " + selected.length;
}
function toggleOpticsMenu() {
  const box = $("kssMulti"),
    menu = $("kssMenu"),
    open = !box.classList.contains("open");
  box.classList.toggle("open", open);
  menu.hidden = !open;
  $("kssToggle").setAttribute("aria-expanded", String(open));
}
function closeOpticsMenu() {
  const box = $("kssMulti"),
    menu = $("kssMenu");
  box.classList.remove("open");
  menu.hidden = true;
  $("kssToggle").setAttribute("aria-expanded", "false");
}
function matchesOptics(raw, groups) {
  if (!groups.length) return true;
  const info = opticsInfo(raw);
  return !!info && groups.includes(info.group);
}

function n(v) {
  const x = parseFloat(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(x) ? x : null;
}
function ipn(v) {
  const m = String(v || "").match(/IP\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}
function norm(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function val(id) {
  return $(id).value.trim();
}
function inputs() {
  return {
    section: val("section"),
    subsection: val("subsection"),
    brand: val("brand"),
    powerMin: n(val("powerMin")),
    powerMax: n(val("powerMax")),
    fluxMin: n(val("fluxMin")),
    fluxMax: n(val("fluxMax")),
    ip: ipn(val("ip")),
    kss: selectedOpticsGroups(),
    cct: val("cct") || null,
    cri: n(val("cri")),
    mounting: val("mounting"),
    explosion: $("explosion").checked,
  };
}
function selectionUrl(q) {
  const u = new URL(location.href);
  [
    "section",
    "subsection",
    "brand",
    "powerMin",
    "powerMax",
    "fluxMin",
    "fluxMax",
    "ip",
    "cct",
    "cri",
    "mounting",
  ].forEach((k) => {
    const v = q[k];
    if (v !== null && v !== "" && v !== undefined)
      u.searchParams.set(k, String(v));
    else u.searchParams.delete(k);
  });
  if (q.kss.length) u.searchParams.set("kss", q.kss.join(","));
  else u.searchParams.delete("kss");
  if (q.explosion) u.searchParams.set("explosion", "1");
  else u.searchParams.delete("explosion");
  return u;
}
function syncSelectionUrl(q) {
  history.replaceState({}, "", selectionUrl(q));
}
function applySelectionUrl() {
  const p = new URLSearchParams(location.search);
  [
    "section",
    "subsection",
    "brand",
    "powerMin",
    "powerMax",
    "fluxMin",
    "fluxMax",
    "ip",
    "cct",
    "cri",
    "mounting",
  ].forEach((k) => {
    if (p.has(k) && $(k))
      $(k).value =
        k === "ip" && /^\d+$/.test(p.get(k)) ? "IP" + p.get(k) : p.get(k);
  });
  if (p.get("explosion") === "1") $("explosion").checked = true;
  const groups = (p.get("kss") || "").split(",").filter(Boolean);
  document
    .querySelectorAll("[data-optics-group]")
    .forEach((cb) => (cb.checked = groups.includes(cb.dataset.opticsGroup)));
  updateOpticsSummary();
  return [...p.keys()].length > 0;
}
function copySelectionUrl() {
  const text = selectionUrl(inputs()).toString();
  const done = () => {
    const el = $("shareSelectionStatus");
    el.textContent = "Ссылка скопирована";
    setTimeout(() => (el.textContent = ""), 1500);
  };
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackSelectionCopy(text, done));
  else fallbackSelectionCopy(text, done);
}
function fallbackSelectionCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  done();
}
function isExplosion(x) {
  return (
    norm(x.explosion_marking) !== "" && norm(x.explosion_marking) !== "нет"
  );
}
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
function hasCategory(x, v) {
  return !v || categoryPaths(x).some((p) => p.section === v);
}
function hasSubcategory(x, v) {
  return !v || categoryPaths(x).some((p) => p.subsection === v);
}
function strictBase(x, q) {
  if (!hasCategory(x, q.section) || !hasSubcategory(x, q.subsection))
    return false;
  if (q.brand && x.brand !== q.brand) return false;
  if (q.explosion ? !isExplosion(x) : isExplosion(x)) return false;
  if (q.ip !== null && (ipn(x.ip) === null || ipn(x.ip) < q.ip)) return false;
  if (q.kss.length && !matchesOptics(x.kss, q.kss)) return false;
  if (
    q.cct !== null &&
    (n(q.cct) !== null
      ? n(x.cct) !== n(q.cct)
      : String(x.cct) !== String(q.cct))
  )
    return false;
  if (q.cri !== null && (n(x.cri) === null || n(x.cri) < q.cri)) return false;
  if (q.mounting && !norm(x.mounting).includes(norm(q.mounting))) return false;
  return true;
}
function inRange(v, min, max, tol = 0) {
  v = n(v);
  if (v === null) return min === null && max === null;
  const lo = min === null ? -Infinity : min * (1 - tol),
    hi = max === null ? Infinity : max * (1 + tol);
  return v >= lo && v <= hi;
}
function exact(x, q) {
  return (
    strictBase(x, q) &&
    inRange(x.power, q.powerMin, q.powerMax) &&
    inRange(x.flux, q.fluxMin, q.fluxMax)
  );
}
function close(x, q) {
  return (
    strictBase(x, q) &&
    inRange(x.power, q.powerMin, q.powerMax, 0.15) &&
    inRange(x.flux, q.fluxMin, q.fluxMax, 0.15)
  );
}
function isColoredLight(x) {
  return (
    x.cri === null &&
    /amber|янтар|голуб|зелен|красн|rgb|blue|green|red/i.test(String(x.cct))
  );
}
function cctText(value) {
  return n(value) !== null ? String(value) + " К" : String(value);
}
function reasons(x, q, isClose) {
  const r = [];
  if (q.ip !== null) r.push("IP " + x.ip + " соответствует");
  if (q.kss.length) r.push("КСС " + x.kss + " соответствует");
  if (q.cct !== null) r.push(cctText(x.cct) + " соответствует");
  if (q.cri !== null) r.push("CRI " + x.cri + " соответствует");
  if (isClose) {
    if (!inRange(x.power, q.powerMin, q.powerMax) && n(x.power) !== null)
      r.push("мощность близка к заданному диапазону");
    if (!inRange(x.flux, q.fluxMin, q.fluxMax) && n(x.flux) !== null)
      r.push("световой поток близок к заданному диапазону");
  }
  return r.slice(0, 4);
}
function icon(name) {
  const paths = {
    power: '<path d="M13 2 4.5 13H11l-1 9L19.5 11H13z"/>',
    flux: '<circle cx="12" cy="9" r="4"/><path d="M9 14h6M10 18h4M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M3 11h2M19 11h2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    beam: '<path d="M4 4h16M7 8l-4 12M17 8l4 12M12 8v12"/>',
    temp: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    cri: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}
function rangeText(items, key, suffix = "") {
  const vals = items.map((x) => n(x[key])).filter((v) => v !== null);
  if (!vals.length) return "—";
  const a = Math.min(...vals),
    b = Math.max(...vals);
  return (a === b ? a : a + "–" + b) + (suffix ? " " + suffix : "");
}
function textValues(items, key, limit = 5) {
  const vals = uniq(items.map((x) => x[key]));
  return vals.length > limit
    ? vals.slice(0, limit).join(", ") + "…"
    : vals.join(", ") || "—";
}
function groupMatches(items, type) {
  const map = new Map();
  items.forEach((x) => {
    const key = x.seriesId + "|" + type;
    if (!map.has(key))
      map.set(key, {
        type,
        seriesId: x.seriesId,
        series: x.series,
        brand: x.brand,
        items: [],
      });
    map.get(key).items.push(x);
  });
  return [...map.values()];
}
function rangeRequirement(min, max, unit) {
  if (min !== null && max !== null) return `${min}–${max} ${unit}`;
  if (min !== null) return `от ${min} ${unit}`;
  if (max !== null) return `до ${max} ${unit}`;
  return null;
}
function selectionRequirements(q) {
  const rows = [];
  if (q.section) rows.push(["Категория", q.section]);
  if (q.subsection) rows.push(["Подкатегория", q.subsection]);
  if (q.brand) rows.push(["Производитель", q.brand]);
  const power = rangeRequirement(q.powerMin, q.powerMax, "Вт");
  if (power) rows.push(["Мощность", power]);
  const flux = rangeRequirement(q.fluxMin, q.fluxMax, "лм");
  if (flux) rows.push(["Световой поток", flux]);
  if (q.ip !== null) rows.push(["Степень защиты", `не ниже IP${q.ip}`]);
  if (q.kss.length)
    rows.push(["Оптика", q.kss.map(opticsGroupTitle).join(", ")]);
  if (q.cct !== null) rows.push(["Цветовая температура", cctText(q.cct)]);
  if (q.cri !== null) rows.push(["CRI", `не ниже ${q.cri}`]);
  if (q.mounting) rows.push(["Тип монтажа", q.mounting]);
  if (q.explosion) rows.push(["Взрывозащита", "требуется"]);
  return rows;
}
function emptyState(q) {
  const rows = selectionRequirements(q);
  const list = rows
    .map(([label, value]) => `<li><b>${esc(label)}:</b> ${esc(value)}</li>`)
    .join("");
  const bodyLines = rows.map(([label, value]) => `${label}: ${value}`);
  const subject = "Запрос на доработку оборудования под требования";
  const body = [
    "Здравствуйте!",
    "",
    "Не удалось подобрать серийное оборудование под следующие требования:",
    ...bodyLines.map((line) => "• " + line),
    "",
    "Просим проверить возможность доработки серийного оборудования или изготовления специального исполнения.",
    "",
    "Контактное лицо:",
    "Телефон:",
  ].join("\n");
  const mailto = `mailto:svet@smp-76.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `<div class="empty"><div class="empty-card"><h3>Под ваши требования не найдено серийных позиций</h3><p>Отправьте нам запрос. Мы проверим возможность доработки оборудования или изготовления специального исполнения под вашу задачу.</p><div class="custom-solution"><strong>Параметры уже добавлены в письмо</strong>${list ? `<ul class="empty-params">${list}</ul>` : ""}<a class="engineer-btn" href="${esc(mailto)}">Написать нам</a></div></div></div>`;
}
function seriesCard(g, q) {
  const items = g.items;
  const label = g.type === "exact" ? "Точное соответствие" : "Близкий вариант";
  const mounts = uniq(items.map((x) => x.mounting));
  const kss = uniq(items.map((x) => x.kss));
  const ips = uniq(items.map((x) => x.ip));
  const ccts = uniq(items.map((x) => x.cct));
  const cris = items.map((x) => n(x.cri)).filter((v) => v !== null);
  const url =
    "catalog.html?series=" +
    encodeURIComponent(String(g.seriesId || "").trim()) +
    "&source=selection&v=20260804";
  return `<article class="card ${g.type}"><div><div class="card-top"><span class="brand-chip">${esc(g.brand)}</span><span class="series-name">${esc(g.series)}</span><span class="match-badge">${label}</span></div><p class="series-summary">Найдено подходящих исполнений: <b>${items.length}</b></p><div class="specs"><span class="spec">${icon("power")}${esc(rangeText(items, "power", "Вт"))}</span><span class="spec">${icon("flux")}${esc(rangeText(items, "flux", "лм"))}</span>${ips.length ? `<span class="spec">${icon("shield")}${esc(ips.join(", "))}</span>` : ""}${kss.length ? `<span class="spec">${icon("beam")}${esc(kss.slice(0, 4).join(", ") + (kss.length > 4 ? "…" : ""))}</span>` : ""}${ccts.length ? `<span class="spec">${icon("temp")}${esc(ccts.map(cctText).join(", "))}</span>` : ""}${cris.length ? `<span class="spec">${icon("cri")}CRI ${Math.min(...cris)}–${Math.max(...cris)}</span>` : `<span class="spec">${icon("cri")}CRI: ${items.every(isColoredLight) ? "не применяется" : "—"}</span>`}</div>${mounts.length ? `<div class="reasons"><strong>Доступные типы крепления</strong>${esc(mounts.slice(0, 6).join(", ") + (mounts.length > 6 ? "…" : ""))}</div>` : ""}<button class="variant-toggle" type="button" aria-expanded="false" aria-controls="variants-${esc(g.seriesId)}">Показать подходящие исполнения</button><div class="variants" id="variants-${esc(g.seriesId)}"></div></div><div class="selection-card-actions"><a class="open" href="${url}">Открыть серию →</a><button type="button" class="selection-compare" data-selection-compare="${esc(g.seriesId)}" aria-pressed="${selectedSeries.has(g.seriesId)}">${selectedSeries.has(g.seriesId) ? "✓ В сравнении" : "+ Сравнить"}</button></div></article>`;
}
function render() {
  const q = inputs();
  syncSelectionUrl(q);
  const has = Object.entries(q).some(([k, v]) =>
    k === "explosion"
      ? v
      : Array.isArray(v)
        ? v.length > 0
        : v !== null && v !== "",
  );
  if (!has) {
    $("count").textContent = "Заполните хотя бы один параметр";
    $("output").innerHTML =
      '<div class="empty">Не задано ни одного условия подбора.</div>';
    return;
  }
  let ex = [],
    cl = [];
  for (const model of MODELS) {
    if (exact(model, q)) ex.push(model);
    else if (close(model, q)) cl.push(model);
  }
  const exactGroups = groupMatches(ex, "exact"),
    closeGroups = groupMatches(cl, "close").filter(
      (g) => !exactGroups.some((e) => e.seriesId === g.seriesId),
    );
  const sort = (a, b) =>
    String(a.brand).localeCompare(String(b.brand), "ru") ||
    String(a.series).localeCompare(String(b.series), "ru", { numeric: true });
  exactGroups.sort(sort);
  closeGroups.sort(sort);
  const total = exactGroups.length + closeGroups.length;
  $("count").textContent = total
    ? `Найдено серий: точных — ${exactGroups.length}, близких — ${closeGroups.length}`
    : "Серийные позиции не найдены";
  let html = "";
  if (exactGroups.length)
    html += `<h3 class="group-title">Точное соответствие <span>${exactGroups.length}</span></h3><div class="cards">${exactGroups.map((g) => seriesCard(g, q)).join("")}</div>`;
  if (closeGroups.length)
    html += `<h3 class="group-title">Близкие варианты <span>${closeGroups.length}</span></h3><div class="cards">${closeGroups.map((g) => seriesCard(g, q)).join("")}</div>`;
  if (!total) html = emptyState(q);
  $("output").innerHTML = html;
  document.querySelectorAll(".variant-toggle").forEach(
    (btn) =>
      (btn.onclick = () => {
        const box = btn.nextElementSibling;
        const open = !box.classList.contains("open");
        box.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open
          ? "Скрыть исполнения"
          : "Показать подходящие исполнения";
        if (open && !box.childElementCount) {
          const id = box.id.slice("variants-".length);
          const group = [...exactGroups, ...closeGroups].find(
            (g) => g.seriesId === id,
          );
          if (group) renderVariants(box, group, 50);
        }
      }),
  );
  document.querySelectorAll("[data-selection-compare]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const id = btn.dataset.selectionCompare;
        if (selectedSeries.has(id)) selectedSeries.delete(id);
        else if (selectedSeries.size < 3) selectedSeries.add(id);
        else {
          window.smpToast?.(
            "Для сравнения доступны три позиции. Уберите одну из выбранных.",
          );
          return;
        }
        updateSelectionCompare();
      }),
  );
  updateSelectionCompare();
  document
    .querySelectorAll('a.open[href*="catalog.html?series="]')
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href) window.location.assign(href);
      });
    });
}
function renderVariants(box, group, limit) {
  const items = group.items;
  box.innerHTML = items
    .slice(0, limit)
    .map(
      (x) =>
        `<div class="variant-row"><b>${esc(x.sku || x.name || "Исполнение")}</b><span>${esc(x.mounting || "Монтаж не указан")}</span><span>${esc(x.power != null ? x.power + " Вт" : "")}</span></div>`,
    )
    .join("");
  if (items.length > limit) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more-variants";
    more.textContent =
      "Показать ещё · " + Math.min(limit, items.length) + " из " + items.length;
    more.onclick = () => renderVariants(box, group, limit + 50);
    box.append(more);
  }
}
function updateSelectionCompare() {
  document.querySelectorAll("[data-selection-compare]").forEach((btn) => {
    const active = selectedSeries.has(btn.dataset.selectionCompare);
    btn.setAttribute("aria-pressed", String(active));
    btn.textContent = active ? "✓ В сравнении" : "+ Сравнить";
  });
  let bar = $("selectionCompareBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "selectionCompareBar";
    bar.className = "selection-compare-bar";
    document.querySelector(".result-head").after(bar);
  }
  bar.hidden = selectedSeries.size === 0;
  const ids = [...selectedSeries];
  bar.replaceChildren();
  const label = document.createElement("span");
  label.textContent = "04 / Выбрано для сравнения: " + ids.length + " из 3";
  bar.append(label);
  const link = document.createElement("a");
  link.textContent = "Сравнить варианты →";
  link.href =
    "catalog.html?" +
    ids.map((id) => "compare=" + encodeURIComponent(id)).join("&");
  if (ids.length < 2) {
    const hint = document.createElement("small");
    hint.textContent = "Добавьте ещё одну серию";
    bar.append(hint);
  } else bar.append(link);
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Сбросить";
  clear.onclick = () => {
    selectedSeries.clear();
    updateSelectionCompare();
  };
  bar.append(clear);
}
async function init() {
  $("find").disabled = true;
  $("selectionResults").setAttribute("aria-busy", "true");
  try {
    const r = await fetch("catalog-data.json");
    if (!r.ok) throw new Error(r.status);
    const p = await r.json();
    SERIES = Array.isArray(p) ? p : p.series || [];
    MODELS = SERIES.flatMap((s) =>
      (s.models || []).map((m) => ({
        ...m,
        seriesId: s.id,
        series: s.series,
        brand: s.brand,
        section: s.section,
        subsection: s.subsection,
        categories: s.categories,
      })),
    );
    fill(
      "section",
      uniq(SERIES.flatMap((s) => categoryPaths(s).map((p) => p.section))),
    );
    fill(
      "subsection",
      uniq(SERIES.flatMap((s) => categoryPaths(s).map((p) => p.subsection))),
    );
    fill("brand", uniq(SERIES.map((s) => s.brand)));
    fill(
      "ip",
      uniq(MODELS.map((m) => m.ip)).sort(
        (a, b) => (ipn(a) || 0) - (ipn(b) || 0),
      ),
    );
    buildOpticsChecklist(MODELS.map((m) => m.kss));
    fill("cct", uniq(MODELS.map((m) => m.cct)));
    fill("mounting", uniq(MODELS.map((m) => m.mounting)));
    const hasUrlState = applySelectionUrl();
    $("find").disabled = false;
    $("selectionLoading")?.remove();
    $("selectionResults").setAttribute("aria-busy", "false");
    $("find").onclick = () => {
      render();
      $("selectionResults").scrollIntoView({ block: "start" });
    };
    $("shareSelection").onclick = copySelectionUrl;
    $("reset").onclick = () => {
      selectedSeries.clear();
      updateSelectionCompare();
      document
        .querySelectorAll(".form-panel select,.form-panel input")
        .forEach((e) => {
          if (e.type === "checkbox") e.checked = false;
          else e.value = "";
        });
      updateOpticsSummary();
      closeOpticsMenu();
      $("count").textContent =
        "Задайте параметры и нажмите «Найти оборудование»";
      $("output").innerHTML =
        '<div class="empty">Результаты подбора появятся здесь.</div>';
      history.replaceState({}, "", location.pathname);
    };
    if (hasUrlState) render();
  } catch (e) {
    $("selectionResults").setAttribute("aria-busy", "false");
    $("output").innerHTML =
      '<div class="empty"><h3>Не удалось загрузить базу каталога</h3><p>Проверьте подключение и повторите загрузку.</p><button type="button" id="retrySelection">Повторить</button></div>';
    $("retrySelection").onclick = () => location.reload();
  }
}
init();
