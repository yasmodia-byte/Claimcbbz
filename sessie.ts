import { AANTAL_STAPPEN, REGELS } from "./regels";
import type { Oordeel } from "./types";

export const SESSIE_VERSIE = 1;

export interface Signaleringsbeoordeling {
  beoordeeld: boolean;
  notitie: string;
}

export interface Functiebeoordeling {
  code: string;
  oordeel: Oordeel | null;
  motivering: string;
  ontbrekendeInformatie: string;
  signaleringen: Record<string, Signaleringsbeoordeling>;
  bijgewerktOp: string;
}

export interface EigenBerekening {
  resterendeVerdiencapaciteit: string;
  aoPercentage: string;
}

export interface Sessie {
  versie: typeof SESSIE_VERSIE;
  casusId: string;
  deelnemer: string;
  gestartOp: string;
  laatstBezochteStap: number;
  disclaimerGeaccepteerd: boolean;
  beoordelingen: Record<string, Functiebeoordeling>;
  eindselectie: string[];
  eigenBerekening: EigenBerekening;
  reflectie: Record<string, string>;
}

export type SessieActie =
  | { type: "sessie/herstel"; sessie: Sessie }
  | { type: "sessie/reset"; casusId: string }
  | { type: "deelnemer/naam"; naam: string }
  | { type: "stap/bezocht"; stap: number }
  | { type: "disclaimer/accepteer" }
  | { type: "beoordeling/oordeel"; code: string; oordeel: Oordeel }
  | { type: "beoordeling/motivering"; code: string; motivering: string }
  | { type: "beoordeling/ontbrekendeInformatie"; code: string; tekst: string }
  | { type: "beoordeling/signalering"; code: string; puntId: string; beoordeeld: boolean; notitie?: string }
  | { type: "beoordeling/wis"; code: string }
  | { type: "eindselectie/wissel"; code: string }
  | { type: "eindselectie/zet"; codes: string[] }
  | { type: "eigenBerekening/zet"; veld: keyof EigenBerekening; waarde: string }
  | { type: "reflectie/zet"; vraag: string; antwoord: string };

export function nieuweSessie(casusId: string, nu: Date = new Date()): Sessie {
  return {
    versie: SESSIE_VERSIE,
    casusId,
    deelnemer: "",
    gestartOp: nu.toISOString(),
    laatstBezochteStap: 1,
    disclaimerGeaccepteerd: false,
    beoordelingen: {},
    eindselectie: [],
    eigenBerekening: { resterendeVerdiencapaciteit: "", aoPercentage: "" },
    reflectie: {},
  };
}

export function legeBeoordeling(code: string, nu: Date = new Date()): Functiebeoordeling {
  return {
    code,
    oordeel: null,
    motivering: "",
    ontbrekendeInformatie: "",
    signaleringen: {},
    bijgewerktOp: nu.toISOString(),
  };
}

function metBeoordeling(
  sessie: Sessie,
  code: string,
  wijzig: (b: Functiebeoordeling) => Functiebeoordeling,
): Sessie {
  const huidig = sessie.beoordelingen[code] ?? legeBeoordeling(code);
  return {
    ...sessie,
    beoordelingen: {
      ...sessie.beoordelingen,
      [code]: { ...wijzig(huidig), bijgewerktOp: new Date().toISOString() },
    },
  };
}

export function sessieReducer(sessie: Sessie, actie: SessieActie): Sessie {
  switch (actie.type) {
    case "sessie/herstel":
      return actie.sessie;
    case "sessie/reset":
      return nieuweSessie(actie.casusId);
    case "deelnemer/naam":
      return { ...sessie, deelnemer: actie.naam };
    case "stap/bezocht": {
      const stap = Math.min(Math.max(1, actie.stap), AANTAL_STAPPEN);
      return { ...sessie, laatstBezochteStap: stap };
    }
    case "disclaimer/accepteer":
      return { ...sessie, disclaimerGeaccepteerd: true };
    case "beoordeling/oordeel": {
      const bijgewerkt = metBeoordeling(sessie, actie.code, (b) => ({ ...b, oordeel: actie.oordeel }));
      // Een functie die niet (meer) geschikt is beoordeeld verdwijnt uit de eindselectie.
      const geschikt = actie.oordeel === "geschikt" || actie.oordeel === "geschikt-na-motivering";
      return geschikt
        ? bijgewerkt
        : { ...bijgewerkt, eindselectie: bijgewerkt.eindselectie.filter((c) => c !== actie.code) };
    }
    case "beoordeling/motivering":
      return metBeoordeling(sessie, actie.code, (b) => ({ ...b, motivering: actie.motivering }));
    case "beoordeling/ontbrekendeInformatie":
      return metBeoordeling(sessie, actie.code, (b) => ({ ...b, ontbrekendeInformatie: actie.tekst }));
    case "beoordeling/signalering":
      return metBeoordeling(sessie, actie.code, (b) => ({
        ...b,
        signaleringen: {
          ...b.signaleringen,
          [actie.puntId]: {
            beoordeeld: actie.beoordeeld,
            notitie: actie.notitie ?? b.signaleringen[actie.puntId]?.notitie ?? "",
          },
        },
      }));
    case "beoordeling/wis": {
      const beoordelingen = { ...sessie.beoordelingen };
      delete beoordelingen[actie.code];
      return { ...sessie, beoordelingen, eindselectie: sessie.eindselectie.filter((c) => c !== actie.code) };
    }
    case "eindselectie/wissel": {
      if (sessie.eindselectie.includes(actie.code)) {
        return { ...sessie, eindselectie: sessie.eindselectie.filter((c) => c !== actie.code) };
      }
      if (sessie.eindselectie.length >= REGELS.maximumFunctiesEindselectie) return sessie;
      return { ...sessie, eindselectie: [...sessie.eindselectie, actie.code] };
    }
    case "eindselectie/zet":
      return { ...sessie, eindselectie: actie.codes.slice(0, REGELS.maximumFunctiesEindselectie) };
    case "eigenBerekening/zet":
      return { ...sessie, eigenBerekening: { ...sessie.eigenBerekening, [actie.veld]: actie.waarde } };
    case "reflectie/zet":
      return { ...sessie, reflectie: { ...sessie.reflectie, [actie.vraag]: actie.antwoord } };
    default:
      return sessie;
  }
}

/** Een beoordeling is pas geldig met een oordeel en een inhoudelijke motivering. */
export function beoordelingIsGeldig(beoordeling: Functiebeoordeling | undefined): boolean {
  if (!beoordeling || !beoordeling.oordeel) return false;
  if (beoordeling.motivering.trim().length < REGELS.minimumMotiveringLengte) return false;
  if (beoordeling.oordeel === "aanvullende-informatie" && beoordeling.ontbrekendeInformatie.trim().length === 0) {
    return false;
  }
  return true;
}

export function beoordelingsproblemen(beoordeling: Functiebeoordeling | undefined): string[] {
  const problemen: string[] = [];
  if (!beoordeling || !beoordeling.oordeel) problemen.push("Kies een oordeel.");
  if (!beoordeling || beoordeling.motivering.trim().length < REGELS.minimumMotiveringLengte) {
    problemen.push(`Vul een motivering in van minimaal ${REGELS.minimumMotiveringLengte} tekens.`);
  }
  if (beoordeling?.oordeel === "aanvullende-informatie" && beoordeling.ontbrekendeInformatie.trim().length === 0) {
    problemen.push("Geef aan welke informatie ontbreekt.");
  }
  return problemen;
}

/** Controleert of een uit localStorage geladen object een bruikbare sessie is. */
export function isSessie(waarde: unknown): waarde is Sessie {
  if (!waarde || typeof waarde !== "object") return false;
  const s = waarde as Record<string, unknown>;
  return (
    s.versie === SESSIE_VERSIE &&
    typeof s.casusId === "string" &&
    typeof s.beoordelingen === "object" &&
    Array.isArray(s.eindselectie) &&
    typeof s.reflectie === "object" &&
    typeof s.eigenBerekening === "object"
  );
}
