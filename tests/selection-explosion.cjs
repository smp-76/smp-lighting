/* Ex classification uses model markings; the subcategory and checkbox agree. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs
  .readFileSync(path.join(root, "js/selection.js"), "utf8")
  .replace(/init\(\);\s*$/, "");
const sandbox = { document: {}, Set, Map, URL, URLSearchParams };
vm.createContext(sandbox);
vm.runInContext(
  source +
    "\nglobalThis.selection = {isExplosion, exact, close, opticsInfo, selectionRequirements};",
  sandbox,
);
const { isExplosion, exact, close, opticsInfo, selectionRequirements } =
  sandbox.selection;
const data = JSON.parse(fs.readFileSync(path.join(root, "catalog-data.json")));
const models = data.series.flatMap((s) =>
  s.models.map((m) => ({
    ...m,
    seriesId: s.id,
    series: s.series,
    brand: s.brand,
    section: s.section,
    subsection: s.subsection,
    categories: s.categories,
  })),
);
const fixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, "selection-baseline.json")),
);
const empty = fixtures.find((f) => f.name === "ordinary").query;
const subcategory = { ...empty, subsection: "Взрывозащита" };
const checkbox = { ...empty, explosion: true };
const key = (m) => `${m.seriesId}::${m.sku}`;
const keys = (items) => items.map(key).sort();

// Independently audit every field in the current final data, including absences.
assert.equal(models.length, 18226);
assert.equal(data.models_total, 18226);
const marked = models.filter((m) => m.explosion_marking !== "Нет");
for (const m of models) {
  assert.equal(typeof m.explosion_marking, "string", key(m));
  assert.ok(m.explosion_marking.trim(), key(m));
}
for (const m of marked) {
  assert.match(m.explosion_marking, /^[012]Ex /, key(m));
  assert.match(m.explosion_marking, /\b(?:IIC|IIIC)\b/, key(m));
}
assert.equal(marked.length, 133);
assert.equal(new Set(marked.map((m) => m.seriesId)).size, 11);
assert.equal(models.filter((m) => m.explosion_marking === "Нет").length, 18093);
assert.deepEqual(keys(models.filter(isExplosion)), keys(marked));
for (const predicate of [exact, close]) {
  for (const q of [subcategory, checkbox, { ...subcategory, explosion: true }])
    assert.deepEqual(keys(models.filter((m) => predicate(m, q))), keys(marked));
  assert.ok(
    models.filter((m) => predicate(m, empty)).every((m) => !isExplosion(m)),
  );
}
assert.ok(
  selectionRequirements(subcategory).some(
    ([label, value]) => label === "Взрывозащита" && value === "требуется",
  ),
);

// Missing values and product/category names must never imply certification.
const sample = marked[0];
for (const marking of [
  undefined, null, "", " ", "Нет", " нет ", "—", "Не указано",
  "Ex", "Ex-ДСО", "Без взрывозащиты", false, 1,
]) {
  const model = { ...sample, explosion_marking: marking };
  assert.equal(isExplosion(model), false, String(marking));
  assert.equal(exact(model, subcategory), false, String(marking));
  assert.equal(close(model, checkbox), false, String(marking));
}
for (const marking of [
  "1Ex db IIC T6 Gb",
  "2Ex ec mb IIC T4 Gc X",
  "Ex tb IIIC T85 °C Db",
  "  1EX  db\u00a0IIC T6 Gb  ",
]) {
  assert.equal(isExplosion({ explosion_marking: marking }), true, marking);
}
const relabelled = {
  ...sample,
  series: "Без технических подсказок в названии",
  subsection: "Другая подкатегория",
  categories: [{ section: sample.section, subsection: "Другая подкатегория" }],
};
assert.equal(exact(relabelled, subcategory), true);
assert.equal(close(relabelled, subcategory), true);
assert.equal(
  exact(relabelled, { ...subcategory, section: "Несовместимая категория" }),
  false,
);
assert.equal(
  exact(relabelled, { ...checkbox, subsection: "Общепромышленные" }),
  false,
);

// All legacy parameter combinations must agree between the two Ex entry points.
// Add every Ex model's own complete specification to exercise combined filters.
const queries = [
  ...fixtures.map((f) => ({ ...f.query, subsection: "" })),
  ...marked.map((m) => ({
    ...empty,
    section: m.section,
    brand: m.brand,
    powerMin: m.power,
    powerMax: m.power,
    fluxMin: m.flux,
    fluxMax: m.flux,
    ip: Number(m.ip.replace("IP", "")),
    kss: [opticsInfo(m.kss).group],
    cct: m.cct,
    cri: m.cri,
    mounting: m.mounting,
  })),
];
for (const q of queries) {
  const byCheckbox = { ...q, subsection: "", explosion: true };
  const bySubcategory = { ...q, subsection: "Взрывозащита", explosion: false };
  for (const predicate of [exact, close]) {
    const expected = models.filter((m) => predicate(m, byCheckbox));
    const actual = models.filter((m) => predicate(m, bySubcategory));
    assert.deepEqual(keys(actual), keys(expected));
    assert.ok(actual.every(isExplosion));
  }
}
for (const [index, m] of marked.entries()) {
  const q = queries[fixtures.length + index];
  assert.ok(exact(m, { ...q, explosion: true }));
}

// Near matches relax power/flux only; Ex, IP, CCT, CRI and optics stay strict.
const q = { ...subcategory, powerMin: 100, powerMax: 100 };
const exactPower = marked.filter((m) => exact(m, q));
const nearPower = marked.filter((m) => !exact(m, q) && close(m, q));
assert.equal(exactPower.length, 10);
assert.ok(nearPower.length > 0);
assert.ok(nearPower.every((m) => m.power >= 85 && m.power <= 115));
for (const strict of [{ ip: 67 }, { cri: 90 }, { cct: 3000 }, { brand: "LEDEL" }]) {
  assert.equal(models.filter((m) => close(m, { ...q, ...strict })).length, 0);
}
console.log(
  "PASS full Ex audit: 18,226 models; 133 confirmed modifications / 11 series; no missing markings",
);
console.log(
  "PASS field-based classification, placeholders, category independence and default exclusion",
);
console.log(
  `PASS ${queries.length} Ex parameter combinations × both entry points × exact/close; 15% tolerance stays bounded`,
);
