import { describe, expect, it } from "vitest";
import { beoordelingspunten, casussen, functies } from "@/data";
import type { Functie } from "../types";
import { voorselectie } from "../voorselectie";
import { vergelijkFunctie, vergelijkPunt } from "../vergelijking";

const casus = casussen[0];
const basis = functies.find((f) => f.code === "TRN-001") as Functie;

function metWijziging(wijziging: Partial<Functie>): Functie {
  return { ...basis, ...wijziging, werktijden: { ...basis.werktijden, ...(wijziging.werktijden ?? {}) } };
}

describe("automatische voorselectie", () => {
  it("sluit uit op een te hoog opleidingsniveau", () => {
    const [r] = voorselectie(casus, [metWijziging({ opleidingsniveau: "mbo3" })], beoordelingspunten);
    expect(r.uitgesloten).toBe(true);
    expect(r.gronden.map((g) => g.type)).toContain("opleidingsniveau");
    expect(r.gronden[0].omschrijving).toMatch(/mbo 3/);
  });

  it("sluit niet uit op een gelijk of lager opleidingsniveau", () => {
    const [r] = voorselectie(casus, [metWijziging({ opleidingsniveau: "vmbo" })], beoordelingspunten);
    expect(r.gronden.map((g) => g.type)).not.toContain("opleidingsniveau");
  });

  it("sluit uit op een ontbrekende opleidingsrichting", () => {
    const [r] = voorselectie(casus, [metWijziging({ opleidingsrichting: ["techniek"] })], beoordelingspunten);
    expect(r.gronden.map((g) => g.type)).toContain("opleidingsrichting");
    const [ok] = voorselectie(casus, [metWijziging({ opleidingsrichting: ["logistiek"] })], beoordelingspunten);
    expect(ok.uitgesloten).toBe(false);
  });

  it("sluit uit op een ontbrekende vaardigheid", () => {
    const [r] = voorselectie(
      casus,
      [metWijziging({ vereisteVaardigheden: [{ soort: "computer", niveau: "gevorderd" }] })],
      beoordelingspunten,
    );
    expect(r.uitgesloten).toBe(true);
    expect(r.gronden[0].type).toBe("vaardigheid");
    expect(r.gronden[0].omschrijving).toMatch(/gevorderd/);
  });

  it("sluit uit op uitsluitend nachtdiensten", () => {
    const [r] = voorselectie(
      casus,
      [metWijziging({ werktijden: { ...basis.werktijden, nachtdienst: "uitsluitend" } })],
      beoordelingspunten,
    );
    expect(r.uitgesloten).toBe(true);
    expect(r.gronden[0].type).toBe("nachtdienst");
  });

  it("sluit niet uit op incidentele nachtdienst maar signaleert wel", () => {
    const [r] = voorselectie(
      casus,
      [metWijziging({ werktijden: { ...basis.werktijden, nachtdienst: "incidenteel" } })],
      beoordelingspunten,
    );
    expect(r.uitgesloten).toBe(false);
    expect(r.vergelijking.find((v) => v.punt.id === "nachtdienst")?.status).toBe("oranje");
  });

  it("sluit uit op een onverenigbare arbeidsduur", () => {
    const [dag] = voorselectie(
      casus,
      [metWijziging({ werktijden: { ...basis.werktijden, urenPerDag: 9 } })],
      beoordelingspunten,
    );
    expect(dag.gronden[0].type).toBe("arbeidsduur");
    const [week] = voorselectie(
      casus,
      [metWijziging({ werktijden: { ...basis.werktijden, urenPerWeek: 36, minimumUrenPerWeek: 36 } })],
      beoordelingspunten,
    );
    expect(week.gronden[0].type).toBe("arbeidsduur");
  });

  it("sluit uit op een evidente overschrijding (factor 3 of hoger)", () => {
    const [r] = voorselectie(
      casus,
      [metWijziging({ belasting: [{ puntId: "tillen-frequent", waarde: 15, toelichting: "" }] })],
      beoordelingspunten,
    );
    expect(r.uitgesloten).toBe(true);
    expect(r.gronden[0].type).toBe("evidente-overschrijding");
  });

  it("legt bij iedere uitgesloten functie uit waarom", () => {
    const resultaten = voorselectie(casus, functies, beoordelingspunten);
    for (const r of resultaten.filter((x) => x.uitgesloten)) {
      expect(r.gronden.length).toBeGreaterThan(0);
      for (const g of r.gronden) expect(g.omschrijving.length).toBeGreaterThan(20);
    }
  });

  it("levert voor de hoofdcasus de verwachte uitsluitingen", () => {
    const resultaten = voorselectie(casus, functies, beoordelingspunten);
    const uitgesloten = resultaten.filter((r) => r.uitgesloten).map((r) => r.code);
    expect(uitgesloten).toEqual(["TRN-006", "TRN-008", "TRN-009", "TRN-012", "TRN-013", "TRN-015"]);
    const beoordeelbaar = resultaten.filter((r) => !r.uitgesloten);
    expect(beoordeelbaar.length).toBe(9);
  });
});

describe("vergelijking van belasting en belastbaarheid", () => {
  const tillen = beoordelingspunten.find((p) => p.id === "tillen-incidenteel")!;
  const tempo = beoordelingspunten.find((p) => p.id === "handelingstempo")!;

  it("kleurt numerieke punten groen, oranje en rood", () => {
    expect(vergelijkPunt(tillen, 10, 10, "").status).toBe("groen");
    expect(vergelijkPunt(tillen, 12, 10, "").status).toBe("oranje");
    expect(vergelijkPunt(tillen, 15, 10, "").status).toBe("oranje");
    expect(vergelijkPunt(tillen, 16, 10, "").status).toBe("rood");
    expect(vergelijkPunt(tillen, 30, 10, "").evident).toBe(true);
    expect(vergelijkPunt(tillen, 29, 10, "").evident).toBe(false);
  });

  it("kleurt ordinale punten op basis van het aantal niveaus boven de grens", () => {
    expect(vergelijkPunt(tempo, "normaal", "normaal", "").status).toBe("groen");
    expect(vergelijkPunt(tempo, "laag", "normaal", "").status).toBe("groen");
    expect(vergelijkPunt(tempo, "verhoogd", "normaal", "").status).toBe("oranje");
    expect(vergelijkPunt(tempo, "hoog", "normaal", "").status).toBe("rood");
  });

  it("weigert een onbekend niveau", () => {
    expect(() => vergelijkPunt(tempo, "razendsnel", "normaal", "")).toThrow(/Onbekend niveau/);
  });

  it("vergelijkt ook de werktijden", () => {
    const v = vergelijkFunctie(basis, casus.belastbaarheid, beoordelingspunten);
    const ids = v.map((x) => x.punt.id);
    expect(ids).toContain("uren-per-dag");
    expect(ids).toContain("uren-per-week");
    expect(ids).toContain("nachtdienst");
    expect(v.every((x) => x.status === "groen")).toBe(true);
  });
});
