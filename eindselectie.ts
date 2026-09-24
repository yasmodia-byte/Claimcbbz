import { REGELS } from "./regels";
import { beoordelingIsGeldig, type Functiebeoordeling } from "./sessie";
import type { Functie, Voorselectieresultaat } from "./types";

export type Selectieprobleemtype =
  | "te-weinig"
  | "te-veel"
  | "onbekend"
  | "uitgesloten"
  | "niet-beoordeeld"
  | "niet-geschikt-beoordeeld"
  | "te-weinig-arbeidsplaatsen";

export interface Selectieprobleem {
  type: Selectieprobleemtype;
  code?: string;
  melding: string;
}

export interface Selectiecontrole {
  geldig: boolean;
  problemen: Selectieprobleem[];
}

/** Redenen waarom een functie (nog) niet in de eindselectie kan; leeg = selecteerbaar. */
export function selecteerbaarheidsproblemen(
  code: string,
  functies: Functie[],
  voorselectie: Voorselectieresultaat[],
  beoordelingen: Record<string, Functiebeoordeling>,
): Selectieprobleem[] {
  const functie = functies.find((f) => f.code === code);
  if (!functie) return [{ type: "onbekend", code, melding: `Functie ${code} is onbekend.` }];
  const problemen: Selectieprobleem[] = [];
  const naam = `${functie.code} ${functie.naam}`;

  const vs = voorselectie.find((v) => v.code === code);
  if (vs?.uitgesloten) {
    problemen.push({ type: "uitgesloten", code, melding: `${naam} is in de voorselectie uitgesloten en kan niet worden geselecteerd.` });
  }

  const beoordeling = beoordelingen[code];
  if (!beoordelingIsGeldig(beoordeling)) {
    problemen.push({ type: "niet-beoordeeld", code, melding: `${naam} is nog niet volledig beoordeeld (oordeel en motivering).` });
  } else if (beoordeling?.oordeel !== "geschikt" && beoordeling?.oordeel !== "geschikt-na-motivering") {
    problemen.push({
      type: "niet-geschikt-beoordeeld",
      code,
      melding: `${naam} is niet als geschikt of geschikt na motivering beoordeeld.`,
    });
  }

  if (functie.arbeidsplaatsen < REGELS.minimumArbeidsplaatsenPerFunctie) {
    problemen.push({
      type: "te-weinig-arbeidsplaatsen",
      code,
      melding: `${naam} heeft ${functie.arbeidsplaatsen} fictieve arbeidsplaats${functie.arbeidsplaatsen === 1 ? "" : "en"}; minimaal ${REGELS.minimumArbeidsplaatsenPerFunctie} zijn vereist.`,
    });
  }
  return problemen;
}

export function valideerEindselectie(
  selectie: string[],
  functies: Functie[],
  voorselectie: Voorselectieresultaat[],
  beoordelingen: Record<string, Functiebeoordeling>,
): Selectiecontrole {
  const problemen: Selectieprobleem[] = [];
  const uniek = Array.from(new Set(selectie));

  if (uniek.length < REGELS.minimumFunctiesVoorBerekening) {
    problemen.push({
      type: "te-weinig",
      melding: `Selecteer ${REGELS.minimumFunctiesVoorBerekening} functies om de standaardberekening uit te voeren (nu ${uniek.length}).`,
    });
  }
  if (uniek.length > REGELS.maximumFunctiesEindselectie) {
    problemen.push({
      type: "te-veel",
      melding: `Maximaal ${REGELS.maximumFunctiesEindselectie} functies kunnen worden geselecteerd (nu ${uniek.length}).`,
    });
  }
  for (const code of uniek) {
    problemen.push(...selecteerbaarheidsproblemen(code, functies, voorselectie, beoordelingen));
  }
  return { geldig: problemen.length === 0, problemen };
}
