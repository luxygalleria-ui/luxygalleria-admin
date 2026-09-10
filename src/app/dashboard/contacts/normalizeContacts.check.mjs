// Self-check for the Messages page payload normaliser.
// Run: node src/app/dashboard/contacts/normalizeContacts.check.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const src = readFileSync(new URL("./contactUtils.ts", import.meta.url), "utf8");
const { normalizeContacts } = await import(
  "data:text/javascript," +
  encodeURIComponent(
    ts.transpileModule(src, {
      compilerOptions: { target: "es2022", jsx: "preserve" },
    }).outputText
  )
);

// The exact crash from the report: a legacy row with no `status`.
const legacy = normalizeContacts([{ _id: "1", name: "Asha", email: "a@e.com", message: "hi" }]);
assert.equal(legacy[0].status, "NEW");
assert.doesNotThrow(() => legacy[0].status.toLowerCase());

// An unrecognised status is coerced rather than rendered raw.
assert.equal(normalizeContacts([{ _id: "2", status: "ARCHIVED" }])[0].status, "NEW");
assert.equal(normalizeContacts([{ _id: "3", status: "RESOLVED" }])[0].status, "RESOLVED");

// Every string field survives being absent, null, or the wrong type.
const bare = normalizeContacts([{ _id: "4" }])[0];
for (const [field, expected] of [["name", "Unknown sender"], ["email", ""], ["message", ""]]) {
  assert.equal(bare[field], expected, `${field} should default`);
  assert.doesNotThrow(() => bare[field].toLowerCase(), `${field}.toLowerCase() must be safe`);
}
assert.equal(bare.subject, undefined);

const nulled = normalizeContacts([{ _id: "5", name: null, email: null, subject: null, message: null }])[0];
assert.doesNotThrow(() => `${nulled.name}${nulled.email}${nulled.message}`.toLowerCase());
assert.equal(nulled.name, "Unknown sender");

// Non-array / null / undefined payloads yield an empty list, never a throw.
for (const bad of [null, undefined, {}, "oops", 42, { data: [] }]) {
  assert.deepEqual(normalizeContacts(bad), [], `payload ${JSON.stringify(bad)} should give []`);
}

// Null entries inside an otherwise valid array are dropped, not rendered.
assert.equal(normalizeContacts([null, undefined, { _id: "6", name: "Ravi" }]).length, 1);

// A whitespace-only name still gets a readable fallback.
assert.equal(normalizeContacts([{ _id: "7", name: "   " }])[0].name, "Unknown sender");

// Well-formed rows pass through untouched.
const good = normalizeContacts([{ _id: "8", name: "Ravi K", email: "r@e.com", subject: "Order", message: "hello", status: "READ", createdAt: "2026-01-01T00:00:00.000Z" }])[0];
assert.deepEqual(
  [good.name, good.email, good.subject, good.message, good.status],
  ["Ravi K", "r@e.com", "Order", "hello", "READ"]
);

console.log("normalizeContacts: all checks passed");
