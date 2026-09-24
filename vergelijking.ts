import { REGELS } from "./regels";
import type {
  Beoordelingspunt,
  Belastbaarheidsitem,
  Functie,
  FunctieBelasting,
  Status,
  Vergelijkingsresultaat,
} from "./types";

/** Punten die niet in `functie.belasting` staan maar uit de werktijden volgen. */
export const WERKTIJDPUNTEN = {
  urenPerDag: "uren-per-dag",
  urenPerWeek: "uren-per-week",
  nachtdienst: "nachtdienst",
} as const;

export function niveauLabel(punt: Beoordelingspunt, waarde: number | string): string {
  if (punt.type === "numeriek-max") {
    return `${waarde} ${punt.eenheid ?? ""}`.trim();
  }
  const key = String(waarde);
  return punt.niveauLabels?.[key] ?? key;
}

function ordinaleIndex(punt: Beoordelingspunt, waarde: number | string): number {
  const index = (punt.niveaus ?? []).indexOf(String(waarde));
  if (index === -1) {
    throw new Error(
      `Onbekend niveau "${waarde}" voor beoordelingspunt "${punt.id}". Toegestaan: ${(punt.niveaus ?? []).join(", ")}.`,
    );
  }
  return index;
}

/** Vergelijkt één belastingwaarde met één belastbaarheidsgrens. */
export function vergelijkPunt(
  punt: Beoordelingspunt,
  functiewaarde: number | string,
  grens: number | string,
  functieToelichting: string,
): Vergelijkingsresultaat {
  if (punt.type === "numeriek-max") {
    const waarde = Number(functiewaarde);
    const limiet = Number(grens);
    if (Number.isNaN(waarde) || Number.isNaN(limiet)) {
      throw new Error(`Numerieke waarde verwacht voor beoordelingspunt "${punt.id}".`);
    }
    const factor = limiet === 0 ? (waarde === 0 ? 1 : Infinity) : waarde / limiet;
    let status: Status = "groen";
    if (waarde > limiet) {
      status = factor <= REGELS.numeriekeSignaleringsfactor ? "oranje" : "rood";
    }
    const evident = waarde > limiet && factor >= REGELS.evidenteOverschrijdingsfactor;
    const toelichting =
      status === "groen"
        ? `Functiebelasting ${niveauLabel(punt, waarde)} blijft binnen de grens van ${niveauLabel(punt, limiet)}.`
        : `Functiebelasting ${niveauLabel(punt, waarde)} overschrijdt de grens van ${niveauLabel(punt, limiet)} (factor ${factor.toFixed(2)}).`;
    return { punt, functiewaarde: waarde, grens: limiet, status, factor, toelichting, functieToelichting, evident };
  }

  const waardeIndex = ordinaleIndex(punt, functiewaarde);
  const grensIndex = ordinaleIndex(punt, grens);
  const verschil = waardeIndex - grensIndex;
  let status: Status = "groen";
  if (verschil >= REGELS.ordinaleStappenRood) status = "rood";
  else if (verschil > 0) status = "oranje";
  const toelichting =
    status === "groen"
      ? `Functie vraagt "${niveauLabel(punt, functiewaarde)}"; de cliënt kan tot en met "${niveauLabel(punt, grens)}".`
      : `Functie vraagt "${niveauLabel(punt, functiewaarde)}", terwijl de cliënt is aangewezen op maximaal "${niveauLabel(punt, grens)}" (${verschil} niveau${verschil === 1 ? "" : "s"} hoger).`;
  return {
    punt,
    functiewaarde: String(functiewaarde),
    grens: String(grens),
    status,
    toelichting,
    functieToelichting,
    evident: false,
  };
}

function belastingUitWerktijden(functie: Functie): FunctieBelasting[] {
  const w = functie.werktijden;
  return [
    { puntId: WERKTIJDPUNTEN.urenPerDag, waarde: w.urenPerDag, toelichting: w.toelichting },
    {
      puntId: WERKTIJDPUNTEN.urenPerWeek,
      waarde: w.minimumUrenPerWeek,
      toelichting: `Gebruikelijk ${w.urenPerWeek} uur per week; de functie wordt aangeboden vanaf ${w.minimumUrenPerWeek} uur per week. ${w.toelichting}`,
    },
    { puntId: WERKTIJDPUNTEN.nachtdienst, waarde: w.nachtdienst, toelichting: w.toelichting },
  ];
}

/**
 * Vergelijkt de volledige belasting van een functie met het belastbaarheidsprofiel.
 * Alleen punten waarvoor zowel een belastbaarheidsgrens als een functiebelasting
 * bekend is worden vergeleken; de volgorde volgt het belastbaarheidsprofiel.
 */
export function vergelijkFunctie(
  functie: Functie,
  belastbaarheid: Belastbaarheidsitem[],
  punten: Beoordelingspunt[],
): Vergelijkingsresultaat[] {
  const puntenOpId = new Map(punten.map((p) => [p.id, p]));
  const belasting = [...functie.belasting, ...belastingUitWerktijden(functie)];
  const belastingOpPunt = new Map(belasting.map((b) => [b.puntId, b]));

  const resultaten: Vergelijkingsresultaat[] = [];
  for (const item of belastbaarheid) {
    const punt = puntenOpId.get(item.puntId);
    if (!punt) {
      throw new Error(`Belastbaarheidsprofiel verwijst naar onbekend beoordelingspunt "${item.puntId}".`);
    }
    const functiebelasting = belastingOpPunt.get(item.puntId);
    if (!functiebelasting) continue;
    resultaten.push(vergelijkPunt(punt, functiebelasting.waarde, item.waarde, functiebelasting.toelichting));
  }
  return resultaten;
}

export function telStatussen(vergelijking: Vergelijkingsresultaat[]): Record<Status, number> {
  const telling: Record<Status, number> = { groen: 0, oranje: 0, rood: 0 };
  for (const v of vergelijking) telling[v.status] += 1;
  return telling;
}

/** Signaleringen zijn alle punten die beoordeling vragen (oranje) of evident overschreden zijn (rood). */
export function signaleringen(vergelijking: Vergelijkingsresultaat[]): Vergelijkingsresultaat[] {
  return vergelijking.filter((v) => v.status !== "groen");
}
