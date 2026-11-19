import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getCurrentRouteName, getCurrentTeamName } from "./winthorRouteDirectory.ts";

test("uses the active P09 owner from view_rca_cliente", () => {
  assert.equal(getCurrentRouteName("4509", "P09 - WERNESON"), "P09 - MIQUEIAS CARVALHO DA SILVA");
});

test("shows Sidney's current team letter without changing stored team data", () => {
  assert.equal(getCurrentTeamName("4590", "EQUIPE P - SIDNEY NUNES"), "EQUIPE Q - SIDNEY NUNES RODRIGUES");
});

test("keeps the stored label when the route has no current override", () => {
  assert.equal(getCurrentRouteName("999999", "ROTA LOCAL"), "ROTA LOCAL");
});
