import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { yesScore, scoreTone } from "./submissionScore.ts";

describe("resultado da visita", () => {
  test("calcula % de Sim só nas perguntas Sim/Não", () => {
    assert.equal(yesScore([{ value: "sim", yesNo: true }, { value: "nao", yesNo: true }, { value: "x", yesNo: false }]), 50);
  });
  test("verde a partir de 80%", () => assert.equal(scoreTone(80), "success"));
  test("amarelo entre 50% e 79%", () => assert.equal(scoreTone(79), "warning"));
  test("vermelho abaixo de 50%", () => assert.equal(scoreTone(49), "destructive"));
});
