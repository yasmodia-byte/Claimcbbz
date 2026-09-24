import { AO_KLASSEN, REGELS } from "./regels";
import type { AoKlasse, Berekeningsfunctie, Berekeningsresultaat, Berekeningsstap } from "./types";

/** Geld wordt intern in hele centen gerekend om zwevendekommafouten te vermijden. */
export function naarCenten(euro: number): number {
  return Math.round(euro * 100);
}

export function naarEuro(centen: number): number {
  return centen / 100;
}

/** Alleen voor de presentatie: afronding op twee decimalen met Nederlandse notatie. */
export function formatEuro(euro: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(euro)
    .replace(/\u00a0/g, " ");
}

export function formatPercentage(percentage: number): string {
  return `${new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percentage)}%`;
}

export function bepaalKlasse(aoPercentage: number): AoKlasse {
  if (aoPercentage < 35) return "minder-dan-35";
  if (aoPercentage < 80) return "35-tot-80";
  return "80-tot-en-met-100";
}

export function klasseLabel(klasse: AoKlasse): string {
  return AO_KLASSEN.find((k) => k.klasse === klasse)?.label ?? klasse;
}

/** Sorteert oplopend op uurloon; bij gelijk loon op functiecode zodat de uitkomst stabiel is. */
export function sorteerOpUurloon(functies: Berekeningsfunctie[]): Berekeningsfunctie[] {
  return [...functies].sort((a, b) => naarCenten(a.uurloon) - naarCenten(b.uurloon) || a.code.localeCompare(b.code));
}

export function middelsteUurloon(functies: Berekeningsfunctie[]): Berekeningsfunctie {
  const gesorteerd = sorteerOpUurloon(functies);
  return gesorteerd[Math.floor(gesorteerd.length / 2)];
}

export class BerekeningsFout extends Error {}

/**
 * Vereenvoudigde onderwijsberekening (versie 1):
 * 1. sorteer de drie functies op uurloon;
 * 2. het middelste uurloon is de theoretische resterende verdiencapaciteit per uur;
 * 3. loonverlies = maatmanuurloon − resterende verdiencapaciteit per uur;
 * 4. AO-percentage = (loonverlies / maatmanuurloon) × 100;
 * 5. er wordt niet tussentijds afgerond; alleen de presentatie rondt af.
 */
export function berekenVerdiencapaciteit(
  maatmanuurloon: number,
  functies: Berekeningsfunctie[],
): Berekeningsresultaat {
  if (functies.length !== REGELS.minimumFunctiesVoorBerekening) {
    throw new BerekeningsFout(
      `De standaardberekening vereist precies ${REGELS.minimumFunctiesVoorBerekening} functies; er zijn er ${functies.length} aangeleverd.`,
    );
  }
  if (!(maatmanuurloon > 0)) {
    throw new BerekeningsFout("Het maatmanuurloon moet groter zijn dan nul.");
  }
  for (const f of functies) {
    if (!(f.uurloon >= 0) || Number.isNaN(f.uurloon)) {
      throw new BerekeningsFout(`Functie ${f.code} heeft geen geldig uurloon.`);
    }
  }

  const gesorteerd = sorteerOpUurloon(functies);
  const middelste = gesorteerd[1];
  const maatmanCenten = naarCenten(maatmanuurloon);
  const rvcCenten = naarCenten(middelste.uurloon);
  const loonverliesOnbegrensdCenten = maatmanCenten - rvcCenten;
  const rvcHogerDanMaatman = loonverliesOnbegrensdCenten < 0;
  const loonverliesCenten = Math.max(0, loonverliesOnbegrensdCenten);
  const aoPercentage = (loonverliesCenten / maatmanCenten) * 100;

  const stappen: Berekeningsstap[] = [
    {
      titel: "Sorteer de drie geselecteerde functies op uurloon",
      uitleg: "Van laag naar hoog.",
      uitkomst: gesorteerd.map((f) => `${f.code} ${f.naam}: ${formatEuro(f.uurloon)}`).join(" · "),
    },
    {
      titel: "Neem het middelste uurloon als resterende verdiencapaciteit per uur",
      uitleg: "De tweede functie in de gesorteerde reeks.",
      uitkomst: `${middelste.code} ${middelste.naam}: ${formatEuro(middelste.uurloon)} per uur`,
    },
    {
      titel: "Bereken het loonverlies",
      uitleg: "loonverlies = maatmanuurloon − resterende verdiencapaciteit per uur",
      formule: `${formatEuro(maatmanuurloon)} − ${formatEuro(middelste.uurloon)} = ${formatEuro(naarEuro(loonverliesOnbegrensdCenten))}`,
      uitkomst: rvcHogerDanMaatman
        ? `Het resterende uurloon is hoger dan het maatmanuurloon. Het loonverlies wordt daarom op ${formatEuro(0)} gesteld; een negatief loonverlies bestaat niet.`
        : formatEuro(naarEuro(loonverliesCenten)),
    },
    {
      titel: "Bereken het indicatieve arbeidsongeschiktheidspercentage",
      uitleg: "AO-percentage = (loonverlies / maatmanuurloon) × 100",
      formule: `(${formatEuro(naarEuro(loonverliesCenten))} / ${formatEuro(maatmanuurloon)}) × 100 = ${formatPercentage(aoPercentage)}`,
      uitkomst: formatPercentage(aoPercentage),
    },
    {
      titel: "Rond alleen de presentatie af",
      uitleg: "Tussenwaarden worden niet afgerond; de getoonde bedragen en het percentage zijn op twee decimalen afgerond.",
      uitkomst: `Onafgeronde waarde: ${aoPercentage}%`,
    },
  ];

  return {
    gesorteerd,
    middelste,
    maatmanuurloon,
    resterendeVerdiencapaciteitPerUur: middelste.uurloon,
    loonverliesOnbegrensd: naarEuro(loonverliesOnbegrensdCenten),
    loonverlies: naarEuro(loonverliesCenten),
    aoPercentage,
    klasse: bepaalKlasse(aoPercentage),
    rvcHogerDanMaatman,
    stappen,
  };
}

/** Controleert een door de deelnemer zelf ingevulde waarde tegen de berekende waarde. */
export function controleerEigenWaarde(invoer: string, verwacht: number): boolean | null {
  const genormaliseerd = invoer.replace(/[€%\s]/g, "").replace(",", ".");
  if (genormaliseerd === "") return null;
  const waarde = Number(genormaliseerd);
  if (Number.isNaN(waarde)) return false;
  return Math.abs(waarde - verwacht) <= REGELS.tolerantieEigenBerekening;
}
