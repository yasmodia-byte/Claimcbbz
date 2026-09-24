import { describe, expect, it } from "vitest";
import {
  BerekeningsFout,
  bepaalKlasse,
  berekenVerdiencapaciteit,
  controleerEigenWaarde,
  formatEuro,
  formatPercentage,
  middelsteUurloon,
  sorteerOpUurloon,
} from "../berekening";

const maatman = 22.4;
const drie = [
  { code: "TRN-005", naam: "Voorraadregistratiemedewerker", uurloon: 16.1 },
  { code: "TRN-001", naam: "Administratief documentmedewerker", uurloon: 14.8 },
  { code: "TRN-007", naam: "Receptionist kleine locatie", uurloon: 15.2 },
];

describe("sortering en middelste loon", () => {
  it("sorteert drie lonen oplopend", () => {
    expect(sorteerOpUurloon(drie).map((f) => f.uurloon)).toEqual([14.8, 15.2, 16.1]);
  });

  it("kiest het middelste loon", () => {
    expect(middelsteUurloon(drie).code).toBe("TRN-007");
  });

  it("sorteert stabiel bij gelijke lonen", () => {
    const gelijk = [
      { code: "TRN-002", naam: "B", uurloon: 14 },
      { code: "TRN-001", naam: "A", uurloon: 14 },
      { code: "TRN-003", naam: "C", uurloon: 14 },
    ];
    expect(sorteerOpUurloon(gelijk).map((f) => f.code)).toEqual(["TRN-001", "TRN-002", "TRN-003"]);
  });
});

describe("resterende verdiencapaciteit en AO-percentage", () => {
  it("berekent de resterende verdiencapaciteit per uur", () => {
    const r = berekenVerdiencapaciteit(maatman, drie);
    expect(r.resterendeVerdiencapaciteitPerUur).toBe(15.2);
    expect(r.middelste.code).toBe("TRN-007");
  });

  it("berekent loonverlies en AO-percentage zonder tussentijdse afronding", () => {
    const r = berekenVerdiencapaciteit(maatman, drie);
    expect(r.loonverlies).toBe(7.2);
    // (7,20 / 22,40) × 100 = 32,142857142857... — de onafgeronde waarde blijft bewaard.
    expect(r.aoPercentage).toBeCloseTo(32.142857142857146, 10);
    expect(r.aoPercentage).not.toBe(32.14);
    expect(r.klasse).toBe("minder-dan-35");
  });

  it("rondt alleen de gepresenteerde einduitkomst af", () => {
    const r = berekenVerdiencapaciteit(maatman, drie);
    expect(formatPercentage(r.aoPercentage)).toBe("32,14%");
    expect(formatEuro(r.loonverlies)).toBe("€ 7,20");
    expect(r.stappen.at(-1)?.uitkomst).toContain("32.142857142857146");
  });

  it("vermijdt zwevendekommafouten door in centen te rekenen", () => {
    const r = berekenVerdiencapaciteit(22.4, [
      { code: "TRN-001", naam: "A", uurloon: 16.1 },
      { code: "TRN-002", naam: "B", uurloon: 16.1 },
      { code: "TRN-003", naam: "C", uurloon: 16.1 },
    ]);
    expect(r.loonverlies).toBe(6.3);
    expect(r.aoPercentage).toBe(28.125);
  });

  it("stelt het loonverlies op nul als het resterende loon hoger is dan het maatmanloon", () => {
    const r = berekenVerdiencapaciteit(14, [
      { code: "TRN-001", naam: "A", uurloon: 13 },
      { code: "TRN-002", naam: "B", uurloon: 15 },
      { code: "TRN-003", naam: "C", uurloon: 17 },
    ]);
    expect(r.rvcHogerDanMaatman).toBe(true);
    expect(r.loonverliesOnbegrensd).toBe(-1);
    expect(r.loonverlies).toBe(0);
  });

  it("levert nooit een negatief AO-percentage", () => {
    const r = berekenVerdiencapaciteit(10, [
      { code: "TRN-001", naam: "A", uurloon: 20 },
      { code: "TRN-002", naam: "B", uurloon: 21 },
      { code: "TRN-003", naam: "C", uurloon: 22 },
    ]);
    expect(r.aoPercentage).toBe(0);
    expect(r.aoPercentage).toBeGreaterThanOrEqual(0);
    expect(r.klasse).toBe("minder-dan-35");
  });

  it("weigert een berekening met minder of meer dan drie functies", () => {
    expect(() => berekenVerdiencapaciteit(maatman, drie.slice(0, 2))).toThrow(BerekeningsFout);
    expect(() => berekenVerdiencapaciteit(maatman, [...drie, drie[0]])).toThrow(BerekeningsFout);
  });

  it("weigert een ongeldig maatmanloon", () => {
    expect(() => berekenVerdiencapaciteit(0, drie)).toThrow(BerekeningsFout);
  });
});

describe("klasse-indeling", () => {
  it("deelt in op de educatieve grenzen", () => {
    expect(bepaalKlasse(34.99)).toBe("minder-dan-35");
    expect(bepaalKlasse(35)).toBe("35-tot-80");
    expect(bepaalKlasse(79.99)).toBe("35-tot-80");
    expect(bepaalKlasse(80)).toBe("80-tot-en-met-100");
    expect(bepaalKlasse(100)).toBe("80-tot-en-met-100");
  });
});

describe("controle van de eigen berekening", () => {
  it("accepteert Nederlandse notatie en kleine afrondingsverschillen", () => {
    expect(controleerEigenWaarde("32,14", 32.142857)).toBe(true);
    expect(controleerEigenWaarde("€ 15,20", 15.2)).toBe(true);
    expect(controleerEigenWaarde("32.14%", 32.142857)).toBe(true);
    expect(controleerEigenWaarde("31", 32.142857)).toBe(false);
    expect(controleerEigenWaarde("", 32.14)).toBeNull();
    expect(controleerEigenWaarde("abc", 32.14)).toBe(false);
  });
});
