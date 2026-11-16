import { test } from "node:test";
import { strict as assert } from "node:assert";
import { matchesSubmissionFilters } from "./submissionFilters.ts";

const record = { visit_date: "2026-10-28", submitted_at: "2026-11-03T15:00:00Z", created_by: "sidney", address: null, metadata: { supervisor: "outro" } };
const empty = { years: [], months: [], collaborators: [], start: "", end: "", search: "" };

test("date filter follows the chosen October 28 date, not November 3 submission", () => {
  assert.equal(matchesSubmissionFilters(record, { ...empty, months: ["2026-10"] }), true);
  assert.equal(matchesSubmissionFilters(record, { ...empty, months: ["2026-11"] }), false);
});
test("date interval includes both boundaries", () => {
  assert.equal(matchesSubmissionFilters(record, { ...empty, start: "2026-10-28", end: "2026-10-28" }), true);
  assert.equal(matchesSubmissionFilters(record, { ...empty, start: "2026-10-29" }), false);
  assert.equal(matchesSubmissionFilters(record, { ...empty, end: "2026-10-27" }), false);
});
test("collaborator means the person who submitted, not the supervisor answer", () => {
  assert.equal(matchesSubmissionFilters(record, { ...empty, collaborators: ["sidney"] }), true);
  assert.equal(matchesSubmissionFilters(record, { ...empty, collaborators: ["outro"] }), false);
});
test("cleared filters keep all records", () => {
  assert.equal(matchesSubmissionFilters(record, empty), true);
});
