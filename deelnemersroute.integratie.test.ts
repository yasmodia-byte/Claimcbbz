/**
 * Integratietest van de hoofdroute van de deelnemer: van het openen van de
 * casus tot en met de vergelijking met het antwoordmodel, via dezelfde
 * reducer en rekenmodules die de interface gebruikt.
 */
import { describe, expect, it } from "vitest";
import { beoordelingspunten, casussen, functies } from "@/data";
import { berekenVerdiencapaciteit, formatPercentage } from "../berekening";
import { valideerEindselectie } from "../eindselectie";
import { evalueerSessie } from "../evaluatie";
import { nieuweSessie, sessieReducer, type Sessie, type SessieActie } from "../sessie";
import { voorselectie } from "../voorselectie";
import { signaleringen } from "../vergelijking";

const casus = casussen[0];

function speel(sessie: Sessie, acties: SessieActie[]): Sessie {
  return acties.reduce(sessieReducer, sessie);
}

describe("deelnemersroute van begin tot eind", () => {
  it("doorloopt de complete casus en vergelijkt met het antwoordmodel", () => {
    // Stap 1-4: casus openen, disclaimer accepteren en stappen bezoeken.
    let sessie = nieuweSessie(casus.id);
    sessie = speel(sessie, [
      { type: "disclaimer/accepteer" },
      { type: "deelnemer/naam", naam: "Testdeelnemer" },
      { type: "stap/bezocht", stap: 2 },
      { type: "stap/bezocht", stap: 3 },
      { type: "stap/bezocht", stap: 4 },
    ]);
    expect(sessie.disclaimerGeaccepteerd).toBe(true);
    expect(sessie.laatstBezochteStap).toBe(4);

    // Stap 5: voorselectie.
    const vs = voorselectie(casus, functies, beoordelingspunten);
    const teBeoordelen = vs.filter((v) => !v.uitgesloten);
    expect(teBeoordelen.length).toBe(9);
    expect(vs.find((v) => v.code === "TRN-012")?.gronden[0].type).toBe("evidente-overschrijding");

    // Stap 6: functies beoordelen met motivering en beoordeelde signaleringen.
    const oordelen: Record<string, { oordeel: Sessie["beoordelingen"][string]["oordeel"]; motivering: string; ontbrekend?: string }> = {
      "TRN-001": { oordeel: "geschikt", motivering: "Voorspelbaar zittend werk; incidenteel tillen tot 5 kg blijft binnen de grens van 10 kg." },
      "TRN-002": { oordeel: "geschikt-na-motivering", motivering: "De ronde van 45 minuten lopen wordt bij twaalf afleverpunten onderbroken en er is een postkar; feitelijk wordt korter dan 30 minuten aaneengesloten gelopen." },
      "TRN-003": { oordeel: "niet-geschikt", motivering: "Conflicthantering is een kerntaak (klachten, retouren) terwijl de cliënt daarin beperkt is; daarnaast 60 minuten staan." },
      "TRN-004": { oordeel: "aanvullende-informatie", motivering: "Het tempo volgt de lijn; onduidelijk is of de buffer van enkele minuten voldoende regelruimte geeft.", ontbrekend: "Is het tempo machinegebonden en hoe vaak wordt de buffer benut?" },
      "TRN-005": { oordeel: "geschikt", motivering: "Gepland en gespreid werk; alle punten binnen het profiel, opleiding logistiek sluit aan." },
      "TRN-007": { oordeel: "geschikt-na-motivering", motivering: "Wisselende maar procedurele taken; conflicten komen soms voor en een collega kan overnemen, frequentie is laag." },
      "TRN-010": { oordeel: "geschikt-na-motivering", motivering: "Archiefdozen tot 12 kg incidenteel met rolwagen en splitsen; frequent 6 kg circa één uur per dag; staan aan de statafel kan worden onderbroken." },
      "TRN-011": { oordeel: "niet-geschikt", motivering: "Hoog tempo met productienorm, dagelijkse deadlines en 60 minuten staan zonder afwisseling: meerdere rode overschrijdingen." },
      "TRN-014": { oordeel: "geschikt", motivering: "Rustig en voorspelbaar werk met vrije afwisseling; alle punten binnen het profiel." },
    };
    const acties: SessieActie[] = [{ type: "stap/bezocht", stap: 6 }];
    for (const [code, o] of Object.entries(oordelen)) {
      acties.push({ type: "beoordeling/oordeel", code, oordeel: o.oordeel! });
      acties.push({ type: "beoordeling/motivering", code, motivering: o.motivering });
      if (o.ontbrekend) acties.push({ type: "beoordeling/ontbrekendeInformatie", code, tekst: o.ontbrekend });
      const v = vs.find((x) => x.code === code)!;
      for (const s of signaleringen(v.vergelijking)) {
        acties.push({ type: "beoordeling/signalering", code, puntId: s.punt.id, beoordeeld: true });
      }
    }
    sessie = speel(sessie, acties);
    expect(Object.keys(sessie.beoordelingen)).toHaveLength(9);

    // Stap 7: eindselectie. Eerst een ongeldige poging met te weinig arbeidsplaatsen.
    sessie = speel(sessie, [
      { type: "stap/bezocht", stap: 7 },
      { type: "eindselectie/wissel", code: "TRN-001" },
      { type: "eindselectie/wissel", code: "TRN-005" },
      { type: "eindselectie/wissel", code: "TRN-014" },
    ]);
    let controle = valideerEindselectie(sessie.eindselectie, functies, vs, sessie.beoordelingen);
    expect(controle.geldig).toBe(false);
    expect(controle.problemen[0].type).toBe("te-weinig-arbeidsplaatsen");

    // Een vierde functie kan niet worden toegevoegd zolang er drie zijn geselecteerd.
    sessie = speel(sessie, [{ type: "eindselectie/wissel", code: "TRN-007" }]);
    expect(sessie.eindselectie).toEqual(["TRN-001", "TRN-005", "TRN-014"]);

    // Corrigeer de selectie.
    sessie = speel(sessie, [
      { type: "eindselectie/wissel", code: "TRN-014" },
      { type: "eindselectie/wissel", code: "TRN-007" },
    ]);
    controle = valideerEindselectie(sessie.eindselectie, functies, vs, sessie.beoordelingen);
    expect(controle.geldig).toBe(true);

    // Stap 8: berekening met eigen controle.
    const geselecteerd = sessie.eindselectie.map((code) => {
      const f = functies.find((x) => x.code === code)!;
      return { code: f.code, naam: f.naam, uurloon: f.uurloon };
    });
    const resultaat = berekenVerdiencapaciteit(casus.maatgevendeArbeid.maatmanuurloon, geselecteerd);
    expect(resultaat.gesorteerd.map((f) => f.code)).toEqual(["TRN-001", "TRN-007", "TRN-005"]);
    expect(resultaat.resterendeVerdiencapaciteitPerUur).toBe(15.2);
    expect(resultaat.loonverlies).toBe(7.2);
    expect(formatPercentage(resultaat.aoPercentage)).toBe("32,14%");
    expect(resultaat.klasse).toBe("minder-dan-35");
    expect(resultaat.stappen).toHaveLength(5);

    sessie = speel(sessie, [
      { type: "stap/bezocht", stap: 8 },
      { type: "eigenBerekening/zet", veld: "resterendeVerdiencapaciteit", waarde: "15,20" },
      { type: "eigenBerekening/zet", veld: "aoPercentage", waarde: "32,14" },
      { type: "stap/bezocht", stap: 9 },
      { type: "reflectie/zet", vraag: "4", antwoord: "Met TRN-002 en TRN-010 in plaats van TRN-005 en TRN-007 komt het middelste loon op € 14,20 en het percentage boven de 35%." },
    ]);

    // Stap 9: vergelijking met het antwoordmodel.
    const evaluatie = evalueerSessie(sessie, casus, functies, vs);
    expect(evaluatie.formeleFouten).toEqual([]);
    expect(evaluatie.gemisteSignaleringen).toEqual([]);
    expect(evaluatie.aantalBeoordeeld).toBe(9);
    expect(evaluatie.berekening.uitgevoerd).toBe(true);
    expect(evaluatie.berekening.eigenRvcJuist).toBe(true);
    expect(evaluatie.berekening.eigenAoJuist).toBe(true);
    const overeenkomsten = Object.fromEntries(evaluatie.modelvergelijking.map((m) => [m.code, m.overeenkomst]));
    expect(overeenkomsten["TRN-001"]).toBe("gelijk");
    expect(overeenkomsten["TRN-004"]).toBe("gelijk");
    expect(overeenkomsten["TRN-011"]).toBe("gelijk");
    expect(evaluatie.consistentie.some((c) => c.includes("TRN-010"))).toBe(true);

    // Terug naar een eerdere stap verliest geen gegevens.
    sessie = speel(sessie, [{ type: "stap/bezocht", stap: 2 }]);
    expect(sessie.eindselectie).toEqual(["TRN-001", "TRN-005", "TRN-007"]);
    expect(sessie.beoordelingen["TRN-002"].motivering).toContain("postkar");
    expect(sessie.reflectie["4"]).toContain("35%");
  });

  it("markeert afwijkingen van het antwoordmodel en gemiste signaleringen", () => {
    const vs = voorselectie(casus, functies, beoordelingspunten);
    let sessie = nieuweSessie(casus.id);
    sessie = speel(sessie, [
      { type: "beoordeling/oordeel", code: "TRN-011", oordeel: "geschikt" },
      { type: "beoordeling/motivering", code: "TRN-011", motivering: "Lijkt me prima, er zijn genoeg arbeidsplaatsen beschikbaar." },
      { type: "beoordeling/oordeel", code: "TRN-003", oordeel: "aanvullende-informatie" },
      { type: "beoordeling/motivering", code: "TRN-003", motivering: "Eerst navragen hoeveel klachten er per dag zijn en of er een kruk is." },
      { type: "beoordeling/ontbrekendeInformatie", code: "TRN-003", tekst: "Aantal klachten per dag." },
    ]);
    const evaluatie = evalueerSessie(sessie, casus, functies, vs);
    const m = Object.fromEntries(evaluatie.modelvergelijking.map((x) => [x.code, x]));
    expect(m["TRN-011"].overeenkomst).toBe("afwijkend");
    expect(m["TRN-003"].overeenkomst).toBe("verdedigbaar");
    expect(m["TRN-001"].overeenkomst).toBe("niet-beoordeeld");
    expect(evaluatie.gemisteSignaleringen.find((g) => g.code === "TRN-011")?.punten.length).toBeGreaterThan(0);
    expect(evaluatie.consistentie.some((c) => c.includes("TRN-011"))).toBe(true);
    expect(evaluatie.formeleFouten.some((f) => f.includes("Selecteer 3 functies"))).toBe(true);
    expect(evaluatie.berekening.uitgevoerd).toBe(false);
    const kort = evaluatie.motivering.find((x) => x.code === "TRN-011");
    expect(kort?.lengte).toBe("kort");
  });

  it("verwijdert een functie uit de eindselectie zodra zij niet meer geschikt is beoordeeld", () => {
    let sessie = nieuweSessie(casus.id);
    sessie = speel(sessie, [
      { type: "beoordeling/oordeel", code: "TRN-001", oordeel: "geschikt" },
      { type: "beoordeling/motivering", code: "TRN-001", motivering: "Alle punten blijven binnen het belastbaarheidsprofiel." },
      { type: "eindselectie/wissel", code: "TRN-001" },
    ]);
    expect(sessie.eindselectie).toEqual(["TRN-001"]);
    sessie = speel(sessie, [{ type: "beoordeling/oordeel", code: "TRN-001", oordeel: "niet-geschikt" }]);
    expect(sessie.eindselectie).toEqual([]);
  });
});
