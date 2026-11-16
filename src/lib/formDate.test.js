import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { calendarDateToLocal } from "./formDate.ts";

describe("selected survey date", () => {
  test("October 28 remains October 28 even when submitted November 3", () => {
    const chosen = calendarDateToLocal("2026-10-28");
    assert.equal(chosen.getFullYear(), 2026);
    assert.equal(chosen.getMonth(), 9);
    assert.equal(chosen.getDate(), 28);
  });
});
