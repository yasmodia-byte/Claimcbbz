import type { AoKlasse } from "./types";

/**
 * Alle vereenvoudigde rekenregels van de simulator staan hier bij elkaar,
 * zodat ze in de interface uitgelegd kunnen worden en in tests controleerbaar
 * zijn. Dit zijn onderwijsregels, geen weergave van het operationele proces.
 */
export const REGELS = {
  /**
   * Numeriek punt: tot en met deze factor boven de grens is de overschrijding
   * een oranje signalering die beoordeling vraagt; daarboven is zij rood.
   */
  numeriekeSignaleringsfactor: 1.5,
  /**
   * Numeriek punt: vanaf deze factor boven de grens is de overschrijding zo
   * evident dat de voorselectie de functie uitsluit.
   */
  evidenteOverschrijdingsfactor: 3,
  /** Ordinaal punt: aantal niveaus boven de grens waarbij het punt rood wordt. */
  ordinaleStappenRood: 2,
  minimumFunctiesVoorBerekening: 3,
  maximumFunctiesEindselectie: 3,
  minimumArbeidsplaatsenPerFunctie: 3,
  /** Minimale lengte (tekens) van een motivering. */
  minimumMotiveringLengte: 25,
  /** Tolerantie (in procentpunten resp. euro) bij de controle van de eigen berekening. */
  tolerantieEigenBerekening: 0.011,
} as const;

export const AO_KLASSEN: { klasse: AoKlasse; label: string; omschrijving: string }[] = [
  {
    klasse: "minder-dan-35",
    label: "minder dan 35%",
    omschrijving:
      "Indicatieve uitkomst van de oefencasus: het berekende loonverlies blijft onder de 35%.",
  },
  {
    klasse: "35-tot-80",
    label: "35% tot minder dan 80%",
    omschrijving:
      "Indicatieve uitkomst van de oefencasus: het berekende loonverlies ligt tussen 35% en 80%.",
  },
  {
    klasse: "80-tot-en-met-100",
    label: "80% tot en met 100%",
    omschrijving:
      "Indicatieve uitkomst van de oefencasus: het berekende loonverlies is 80% of hoger.",
  },
];

export const DISCLAIMER =
  "Deze educatieve simulator is ontwikkeld door AD-Consult en is niet afkomstig van, gekoppeld aan of goedgekeurd door UWV. De cliëntgegevens, functies, functiecodes en uitkomsten zijn fictief. De simulator vereenvoudigt onderdelen van het arbeidsdeskundige beoordelingsproces en mag niet worden gebruikt voor een formele claimbeoordeling of individueel juridisch advies.";

export const BEREKENINGSDISCLAIMER =
  "Dit is een vereenvoudigde educatieve berekening. Het operationele beoordelingsproces kan aanvullende regels, factoren en professionele beoordelingen bevatten. Aan deze uitkomst kunnen geen rechten worden ontleend.";

export const SIGNALERINGSUITLEG =
  "Een signalering betekent niet automatisch dat een functie ongeschikt is. De deelnemer moet de feitelijke belasting, frequentie, duur, omstandigheden en herstelmogelijkheden beoordelen.";

export const PRODUCTNAAM = "AD-Consult Claimsimulator";
export const PRODUCTONDERTITEL =
  "Educatieve oefenomgeving voor functieduiding en resterende verdiencapaciteit";

export const STAPPEN = [
  { nummer: 1, slug: "introductie", titel: "Introductie en disclaimer" },
  { nummer: 2, slug: "clientbeeld", titel: "Cliëntbeeld" },
  { nummer: 3, slug: "maatman", titel: "Maatgevende arbeid en maatmanloon" },
  { nummer: 4, slug: "fml", titel: "Vereenvoudigde FML" },
  { nummer: 5, slug: "voorselectie", titel: "Automatische voorselectie" },
  { nummer: 6, slug: "beoordelen", titel: "Functies en signaleringen beoordelen" },
  { nummer: 7, slug: "eindselectie", titel: "Eindselectie" },
  { nummer: 8, slug: "berekening", titel: "Verdiencapaciteit berekenen" },
  { nummer: 9, slug: "reflectie", titel: "Reflectie en antwoordmodel" },
] as const;

export type Stapnummer = (typeof STAPPEN)[number]["nummer"];
export const AANTAL_STAPPEN = STAPPEN.length;
