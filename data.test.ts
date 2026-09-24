import { describe, expect, it } from "vitest";
import { beoordelingspunten, casussen, functies, valideerData } from "@/data";
import { REGELS } from "../regels";

describe("casusdata", () => {
  it("bevat minimaal twaalf fictieve functies met TRN-codes", () => {
    expect(functies.length).toBeGreaterThanOrEqual(12);
    for (const f of functies) expect(f.code).toMatch(/^TRN-\d{3}$/);
  });

  it("bevat minimaal drie functies die de berekening kunnen dragen", () => {
    const casus = casussen[0];
    const dragend = functies.filter((f) => {
      const model = casus.docentmodel.functies[f.code];
      return (
        (model.verwachteBeoordeling === "geschikt" || model.verwachteBeoordeling === "geschikt-na-motivering") &&
        f.arbeidsplaatsen >= REGELS.minimumArbeidsplaatsenPerFunctie
      );
    });
    expect(dragend.length).toBeGreaterThanOrEqual(3);
  });

  it("meldt fouten in de data duidelijk", () => {
    const kapot = [{ ...functies[0], code: "SBC-123", belasting: [{ puntId: "bestaat-niet", waarde: 1, toelichting: "" }] }];
    expect(() => valideerData(beoordelingspunten, casussen, kapot)).toThrow(/SBC-123/);
    expect(() => valideerData(beoordelingspunten, casussen, kapot)).toThrow(/bestaat-niet/);
  });
});
