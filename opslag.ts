import { isSessie, type Sessie } from "./sessie";

/**
 * Lokale opslag van de voortgang (localStorage). De sleutel bevat het
 * casus-id zodat meerdere casussen naast elkaar bewaard kunnen worden.
 *
 * Componenten die de opslag willen volgen (startpagina, docentmodus)
 * abonneren zich via abonneerOpslag; iedere schrijf- of wisactie in dit
 * bestand meldt zich bij de abonnees, ook binnen hetzelfde tabblad.
 */
export const OPSLAG_PREFIX = "adc-claimsimulator:sessie:";

export function opslagSleutel(casusId: string): string {
  return `${OPSLAG_PREFIX}${casusId}`;
}

function opslag(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

const abonnees = new Set<() => void>();

function meldWijziging(): void {
  for (const abonnee of abonnees) abonnee();
}

/** Abonneert op wijzigingen in de opslag (eigen tabblad en andere tabbladen). Geschikt voor useSyncExternalStore. */
export function abonneerOpslag(abonnee: () => void): () => void {
  abonnees.add(abonnee);
  const opStorage = () => abonnee();
  if (typeof window !== "undefined") window.addEventListener("storage", opStorage);
  return () => {
    abonnees.delete(abonnee);
    if (typeof window !== "undefined") window.removeEventListener("storage", opStorage);
  };
}

/** Leest de ruwe (ongeparsede) opgeslagen tekst; null wanneer er niets is of opslag niet beschikbaar is. */
export function leesRuweSessie(casusId: string): string | null {
  const store = opslag();
  if (!store) return null;
  try {
    return store.getItem(opslagSleutel(casusId));
  } catch {
    return null;
  }
}

/** Zet ruwe opgeslagen tekst om in een sessie; null bij corrupte of niet-passende gegevens. */
export function parseSessie(ruw: string | null, casusId: string): Sessie | null {
  if (!ruw) return null;
  try {
    const geparsed: unknown = JSON.parse(ruw);
    if (!isSessie(geparsed) || geparsed.casusId !== casusId) return null;
    return geparsed;
  } catch {
    return null;
  }
}

/** Leest een bewaarde sessie; geeft null bij ontbrekende, corrupte of niet-passende gegevens. */
export function leesSessie(casusId: string): Sessie | null {
  return parseSessie(leesRuweSessie(casusId), casusId);
}

/** Bewaart de sessie; geeft false wanneer opslaan niet mogelijk is (bijvoorbeeld privémodus of volle opslag). */
export function bewaarSessie(sessie: Sessie): boolean {
  const store = opslag();
  if (!store) return false;
  try {
    store.setItem(opslagSleutel(sessie.casusId), JSON.stringify(sessie));
    meldWijziging();
    return true;
  } catch {
    return false;
  }
}

export function wisSessie(casusId: string): void {
  const store = opslag();
  if (!store) return;
  try {
    store.removeItem(opslagSleutel(casusId));
    meldWijziging();
  } catch {
    // Niets te doen: als wissen mislukt, blijft de oude sessie staan en meldt de interface dat.
  }
}
