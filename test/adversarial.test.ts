import { test } from "node:test";
import assert from "node:assert/strict";
import { adversarialLibrary } from "../src/adversarial.ts";

test("library returns a non-trivial set of named scenarios", () => {
  const lib = adversarialLibrary();
  assert.ok(lib.length >= 5);
  for (const s of lib) {
    assert.equal(typeof s.name, "string");
    assert.ok(s.name.length > 0);
    assert.ok("input" in s);
  }
});

test("scenario names are unique", () => {
  const names = adversarialLibrary().map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
});

test("includes a prompt-injection style payload", () => {
  const names = adversarialLibrary().map((s) => s.name);
  assert.ok(names.includes("prompt-injection-ignore"));
});
