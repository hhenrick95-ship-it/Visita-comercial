import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  FOTOS_AJINOMOTO_SLUG,
  isRestrictedMerchanPath,
  isRestrictedMerchanUser,
} from "./restrictedFormAccess.ts";

test("recognizes the dedicated merchandising account without case sensitivity", () => {
  assert.equal(isRestrictedMerchanUser("MERCHAN@distribuidoralopes.com"), true);
  assert.equal(isRestrictedMerchanUser("outro@distribuidoralopes.com"), false);
});

test("allows only the Ajinomoto workflow for the restricted account", () => {
  assert.equal(isRestrictedMerchanPath("/"), true);
  assert.equal(isRestrictedMerchanPath(`/form/${FOTOS_AJINOMOTO_SLUG}`), true);
  assert.equal(isRestrictedMerchanPath(`/form/${FOTOS_AJINOMOTO_SLUG}/resultados`), true);
  assert.equal(isRestrictedMerchanPath(`/form/${FOTOS_AJINOMOTO_SLUG}/foto/registro-1`), true);
  assert.equal(isRestrictedMerchanPath("/dashboard"), false);
  assert.equal(isRestrictedMerchanPath("/form/pex-visita-gerente"), false);
});
