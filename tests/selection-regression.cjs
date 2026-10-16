/* Compare the selection predicates with the pre-redesign implementation. */
const vm = require("node:vm");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs
  .readFileSync(path.join(root, "js/selection.js"), "utf8")
  .replace(/init\(\);\s*$/, "");
const sandbox = { document: {}, URL, URLSearchParams, Set, Map, console };
vm.createContext(sandbox);
vm.runInContext(source + "\nglobalThis.predicates={exact,close};", sandbox);
const data = JSON.parse(fs.readFileSync(path.join(root, "catalog-data.json")));
const models = data.series.flatMap((s) =>
  s.models.map((m) => ({
    ...m,
    seriesId: s.id,
    brand: s.brand,
    section: s.section,
    subsection: s.subsection,
    categories: s.categories,
  })),
);
const fixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, "selection-baseline.json")),
);
function result(q, kind) {
  const keys = models
    .filter((m) => sandbox.predicates[kind](m, q))
    .map((m) => m.seriesId + "::" + m.sku);
  return {
    count: keys.length,
    sha256: crypto.createHash("sha256").update(keys.join("\n")).digest("hex"),
  };
}
for (const fixture of fixtures) {
  for (const kind of ["exact", "close"])
    assert.deepEqual(
      result(fixture.query, kind),
      fixture[kind],
      fixture.name + " " + kind,
    );
}
console.log(
  "PASS unchanged selection criteria:",
  fixtures.length,
  "scenarios ×",
  models.length,
  "models × exact/close",
);
