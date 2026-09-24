import {
  NACHTDIENSTNIVEAUS,
  OORDELEN,
  OPLEIDINGSNIVEAUS,
  RUBRIEKEN,
  type Beoordelingspunt,
  type Casus,
  type Functie,
} from "@/lib/types";
import beoordelingspuntenJson from "./beoordelingspunten.json";
import samDeVriesJson from "./casussen/sam-de-vries.json";
import trainingsfunctiesJson from "./functies/trainingsfuncties.json";

export class DataValidatiefout extends Error {}

const FUNCTIECODE_FORMAAT = /^TRN-\d{3}$/;

/**
 * Controleert de samenhang van de JSON-bestanden. De controle draait bij het
 * laden, zodat een typefout in de data direct een duidelijke melding geeft in
 * plaats van een onverklaarbare uitkomst.
 */
export function valideerData(punten: Beoordelingspunt[], casussen: Casus[], functies: Functie[]): void {
  const fouten: string[] = [];
  const puntIds = new Set<string>();

  for (const punt of punten) {
    if (puntIds.has(punt.id)) fouten.push(`Beoordelingspunt "${punt.id}" komt dubbel voor.`);
    puntIds.add(punt.id);
    if (!RUBRIEKEN.includes(punt.rubriek)) fouten.push(`Beoordelingspunt "${punt.id}" heeft onbekende rubriek "${punt.rubriek}".`);
    if (punt.type === "ordinaal" && (!punt.niveaus || punt.niveaus.length < 2)) {
      fouten.push(`Ordinaal beoordelingspunt "${punt.id}" heeft geen niveaus.`);
    }
  }

  const codes = new Set<string>();
  for (const functie of functies) {
    if (!FUNCTIECODE_FORMAAT.test(functie.code)) fouten.push(`Functiecode "${functie.code}" heeft niet het formaat TRN-000.`);
    if (codes.has(functie.code)) fouten.push(`Functiecode "${functie.code}" komt dubbel voor.`);
    codes.add(functie.code);
    if (!OPLEIDINGSNIVEAUS.includes(functie.opleidingsniveau)) {
      fouten.push(`Functie ${functie.code} heeft onbekend opleidingsniveau "${functie.opleidingsniveau}".`);
    }
    if (!(functie.uurloon > 0)) fouten.push(`Functie ${functie.code} heeft geen geldig uurloon.`);
    if (!Number.isInteger(functie.arbeidsplaatsen) || functie.arbeidsplaatsen < 0) {
      fouten.push(`Functie ${functie.code} heeft geen geldig aantal arbeidsplaatsen.`);
    }
    if (!NACHTDIENSTNIVEAUS.includes(functie.werktijden.nachtdienst)) {
      fouten.push(`Functie ${functie.code} heeft onbekend nachtdienstniveau "${functie.werktijden.nachtdienst}".`);
    }
    if (functie.werktijden.minimumUrenPerWeek > functie.werktijden.urenPerWeek) {
      fouten.push(`Functie ${functie.code}: minimumUrenPerWeek is groter dan urenPerWeek.`);
    }
    for (const b of functie.belasting) {
      const punt = punten.find((p) => p.id === b.puntId);
      if (!punt) {
        fouten.push(`Functie ${functie.code} verwijst naar onbekend beoordelingspunt "${b.puntId}".`);
        continue;
      }
      if (punt.type === "ordinaal" && !punt.niveaus?.includes(String(b.waarde))) {
        fouten.push(`Functie ${functie.code}: waarde "${b.waarde}" is geen niveau van "${punt.id}".`);
      }
      if (punt.type === "numeriek-max" && typeof b.waarde !== "number") {
        fouten.push(`Functie ${functie.code}: waarde voor "${punt.id}" moet een getal zijn.`);
      }
    }
  }

  for (const casus of casussen) {
    if (!OPLEIDINGSNIVEAUS.includes(casus.client.opleidingsniveau)) {
      fouten.push(`Casus ${casus.id} heeft onbekend opleidingsniveau "${casus.client.opleidingsniveau}".`);
    }
    if (!(casus.maatgevendeArbeid.maatmanuurloon > 0)) fouten.push(`Casus ${casus.id} heeft geen geldig maatmanuurloon.`);
    for (const b of casus.belastbaarheid) {
      const punt = punten.find((p) => p.id === b.puntId);
      if (!punt) {
        fouten.push(`Casus ${casus.id} verwijst naar onbekend beoordelingspunt "${b.puntId}".`);
        continue;
      }
      if (punt.type === "ordinaal" && !punt.niveaus?.includes(String(b.waarde))) {
        fouten.push(`Casus ${casus.id}: waarde "${b.waarde}" is geen niveau van "${punt.id}".`);
      }
    }
    for (const [code, model] of Object.entries(casus.docentmodel.functies)) {
      if (!codes.has(code)) fouten.push(`Docentmodel van casus ${casus.id} verwijst naar onbekende functie ${code}.`);
      if (!OORDELEN.includes(model.verwachteBeoordeling)) {
        fouten.push(`Docentmodel ${casus.id}/${code}: onbekende verwachte beoordeling "${model.verwachteBeoordeling}".`);
      }
    }
    for (const code of casus.docentmodel.referentieselectie) {
      if (!codes.has(code)) fouten.push(`Referentieselectie van casus ${casus.id} verwijst naar onbekende functie ${code}.`);
    }
    for (const code of codes) {
      if (!casus.docentmodel.functies[code]) fouten.push(`Docentmodel van casus ${casus.id} mist functie ${code}.`);
    }
  }

  if (fouten.length > 0) {
    throw new DataValidatiefout(`De casusdata bevat fouten:\n- ${fouten.join("\n- ")}`);
  }
}

export const beoordelingspunten = beoordelingspuntenJson as Beoordelingspunt[];
export const functies = trainingsfunctiesJson as Functie[];
export const casussen: Casus[] = [samDeVriesJson as Casus];

valideerData(beoordelingspunten, casussen, functies);

export function vindCasus(id: string): Casus | undefined {
  return casussen.find((c) => c.id === id);
}

export function vindFunctie(code: string): Functie | undefined {
  return functies.find((f) => f.code === code);
}

export function vindPunt(id: string): Beoordelingspunt | undefined {
  return beoordelingspunten.find((p) => p.id === id);
}
