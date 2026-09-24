import { describe, expect, it } from "vitest";
import { beoordelingspunten, casussen, functies } from "@/data";
import { selecteerbaarheidsproblemen, valideerEindselectie } from "../eindselectie";
import { legeBeoordeling, type Functiebeoordeling } from "../sessie";
import type { Oordeel } from "../types";
import { voorselectie } from "../voorselectie";

const casus = casussen[0];
const vs = voorselectie(casus, functies, beoordelingspunten);

function beoordeeld(code: string, oordeel: Oordeel): Functiebeoordeling {
  return {
    ...legeBeoordeling(code),
    oordeel,
    motivering: "De feitelijke belasting blijft binnen het belastbaarheidsprofiel van de cliënt.",
    ontbrekendeInformatie: oordeel === "aanvullende-informatie" ? "Werkelijke duur van de rondes." : "",
  };
}

describe("eindselectie", () => {
  const drieGeschikt = {
    "TRN-001": beoordeeld("TRN-001", "geschikt"),
    "TRN-005": beoordeeld("TRN-005", "geschikt"),
    "TRN-007": beoordeeld("TRN-007", "geschikt-na-motivering"),
  };

  it("keurt een geldige selectie van drie functies goed", () => {
    const r = valideerEindselectie(["TRN-001", "TRN-005", "TRN-007"], functies, vs, drieGeschikt);
    expect(r.geldig).toBe(true);
    expect(r.problemen).toEqual([]);
  });

  it("vereist minimaal drie geselecteerde functies", () => {
    const r = valideerEindselectie(["TRN-001", "TRN-005"], functies, vs, drieGeschikt);
    expect(r.geldig).toBe(false);
    expect(r.problemen.map((p) => p.type)).toContain("te-weinig");
  });

  it("staat maximaal drie functies toe", () => {
    const b = { ...drieGeschikt, "TRN-002": beoordeeld("TRN-002", "geschikt-na-motivering") };
    const r = valideerEindselectie(["TRN-001", "TRN-005", "TRN-007", "TRN-002"], functies, vs, b);
    expect(r.problemen.map((p) => p.type)).toContain("te-veel");
  });

  it("vereist minimaal drie fictieve arbeidsplaatsen per functie", () => {
    const b = { ...drieGeschikt, "TRN-014": beoordeeld("TRN-014", "geschikt") };
    const r = valideerEindselectie(["TRN-001", "TRN-005", "TRN-014"], functies, vs, b);
    expect(r.geldig).toBe(false);
    expect(r.problemen.find((p) => p.type === "te-weinig-arbeidsplaatsen")?.code).toBe("TRN-014");
  });

  it("weigert een in de voorselectie uitgesloten functie", () => {
    const b = { ...drieGeschikt, "TRN-012": beoordeeld("TRN-012", "geschikt") };
    const r = valideerEindselectie(["TRN-001", "TRN-005", "TRN-012"], functies, vs, b);
    expect(r.problemen.map((p) => p.type)).toContain("uitgesloten");
  });

  it("weigert een functie die niet als geschikt is beoordeeld", () => {
    const b = { ...drieGeschikt, "TRN-004": beoordeeld("TRN-004", "aanvullende-informatie") };
    const r = valideerEindselectie(["TRN-001", "TRN-005", "TRN-004"], functies, vs, b);
    expect(r.problemen.map((p) => p.type)).toContain("niet-geschikt-beoordeeld");
  });

  it("weigert een functie zonder geldige motivering", () => {
    const b = { ...drieGeschikt, "TRN-002": { ...legeBeoordeling("TRN-002"), oordeel: "geschikt" as const, motivering: "ok" } };
    expect(selecteerbaarheidsproblemen("TRN-002", functies, vs, b).map((p) => p.type)).toContain("niet-beoordeeld");
  });
});
