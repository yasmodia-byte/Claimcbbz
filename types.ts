/**
 * Domeintypes van de AD-Consult Claimsimulator.
 *
 * Alle gegevens in deze applicatie zijn fictief en uitsluitend bedoeld voor
 * onderwijs en training. Zie DISCLAIMER.md.
 */

// ---------------------------------------------------------------------------
// Opleiding en vaardigheden
// ---------------------------------------------------------------------------

export const OPLEIDINGSNIVEAUS = [
  "basis",
  "vmbo",
  "mbo1",
  "mbo2",
  "mbo3",
  "mbo4",
  "hbo",
  "wo",
] as const;
export type Opleidingsniveau = (typeof OPLEIDINGSNIVEAUS)[number];

export const OPLEIDINGSNIVEAU_LABELS: Record<Opleidingsniveau, string> = {
  basis: "basisonderwijs",
  vmbo: "vmbo",
  mbo1: "mbo 1",
  mbo2: "mbo 2",
  mbo3: "mbo 3",
  mbo4: "mbo 4",
  hbo: "hbo",
  wo: "wo",
};

export const COMPUTERNIVEAUS = ["geen", "basis", "gevorderd"] as const;
export type Computerniveau = (typeof COMPUTERNIVEAUS)[number];

export const TAALNIVEAUS = ["geen", "basis", "goed", "uitstekend"] as const;
export type Taalniveau = (typeof TAALNIVEAUS)[number];

export interface Vaardigheden {
  computer: Computerniveau;
  rijbewijs: string[];
  nederlands: Taalniveau;
  engels: Taalniveau;
}

export type VaardigheidEis =
  | { soort: "computer"; niveau: Computerniveau }
  | { soort: "rijbewijs"; categorie: string }
  | { soort: "nederlands"; niveau: Taalniveau }
  | { soort: "engels"; niveau: Taalniveau };

// ---------------------------------------------------------------------------
// Beoordelingspunten (vereenvoudigde FML-structuur)
// ---------------------------------------------------------------------------

export const RUBRIEKEN = [
  "persoonlijk-functioneren",
  "sociaal-functioneren",
  "fysieke-omgevingseisen",
  "dynamische-handelingen",
  "statische-houdingen",
  "werktijden",
] as const;
export type Rubriek = (typeof RUBRIEKEN)[number];

export const RUBRIEK_LABELS: Record<Rubriek, string> = {
  "persoonlijk-functioneren": "Persoonlijk functioneren",
  "sociaal-functioneren": "Sociaal functioneren",
  "fysieke-omgevingseisen": "Aanpassing aan fysieke omgevingseisen",
  "dynamische-handelingen": "Dynamische handelingen",
  "statische-houdingen": "Statische houdingen",
  werktijden: "Werktijden",
};

/**
 * Een beoordelingspunt is ofwel numeriek (de belastbaarheid is een maximum,
 * bijvoorbeeld "maximaal 10 kg") ofwel ordinaal (een oplopende reeks niveaus,
 * bijvoorbeeld "zelden" < "soms" < "vaak"; de belastbaarheid is het hoogste
 * niveau dat nog past).
 */
export interface Beoordelingspunt {
  id: string;
  rubriek: Rubriek;
  naam: string;
  omschrijving: string;
  type: "numeriek-max" | "ordinaal";
  eenheid?: string;
  niveaus?: string[];
  niveauLabels?: Record<string, string>;
  /** Woorden waarmee een motivering aan dit punt wordt herkend. */
  trefwoorden: string[];
}

export interface Belastbaarheidsitem {
  puntId: string;
  /** Numeriek maximum of het hoogste toelaatbare ordinale niveau. */
  waarde: number | string;
  /** True wanneer de cliënt op dit punt beperkt is ten opzichte van normaal. */
  beperkt: boolean;
  toelichting: string;
}

// ---------------------------------------------------------------------------
// Casus
// ---------------------------------------------------------------------------

export interface Client {
  naam: string;
  leeftijd: number;
  opleidingsniveau: Opleidingsniveau;
  opleidingsrichting: string[];
  werkervaring: string;
  werkervaringJaren: number;
  vaardigheden: Vaardigheden;
  situatieschets: string;
}

export interface MaatgevendeArbeid {
  functie: string;
  omschrijving: string;
  urenPerWeek: number;
  maatmanuurloon: number;
  toelichting: string;
}

export const OORDELEN = [
  "geschikt",
  "geschikt-na-motivering",
  "aanvullende-informatie",
  "niet-geschikt",
] as const;
export type Oordeel = (typeof OORDELEN)[number];

export const OORDEEL_LABELS: Record<Oordeel, string> = {
  geschikt: "Geschikt",
  "geschikt-na-motivering": "Geschikt na motivering",
  "aanvullende-informatie": "Aanvullende informatie nodig",
  "niet-geschikt": "Niet geschikt",
};

export type Docentcategorie =
  | "geschikt"
  | "twijfelachtig"
  | "ongeschikt"
  | "uitgesloten";

export interface DocentFunctiemodel {
  verwachteBeoordeling: Oordeel;
  /** Beoordelingen die met een verdedigbare motivering ook acceptabel zijn. */
  verdedigbareAlternatieven: Oordeel[];
  argumenten: string[];
  relevanteSignaleringen: string[];
  alternatieveAfweging: string;
  aanvullendeInformatie: string;
}

export interface Docentmodel {
  inleiding: string;
  /** Functiecodes van de referentieselectie waarmee de docent de berekening controleert. */
  referentieselectie: string[];
  functies: Record<string, DocentFunctiemodel>;
}

export interface Casus {
  id: string;
  titel: string;
  ondertitel: string;
  fictiefMelding: string;
  client: Client;
  maatgevendeArbeid: MaatgevendeArbeid;
  belastbaarheid: Belastbaarheidsitem[];
  docentmodel: Docentmodel;
}

// ---------------------------------------------------------------------------
// Functies
// ---------------------------------------------------------------------------

export const NACHTDIENSTNIVEAUS = [
  "nooit",
  "incidenteel",
  "regelmatig",
  "uitsluitend",
] as const;
export type Nachtdienstniveau = (typeof NACHTDIENSTNIVEAUS)[number];

export interface Werktijden {
  /** Gebruikelijke omvang van de functie. */
  urenPerWeek: number;
  /** Kleinste omvang waarin de functie wordt aangeboden. */
  minimumUrenPerWeek: number;
  urenPerDag: number;
  nachtdienst: Nachtdienstniveau;
  toelichting: string;
}

export interface FunctieBelasting {
  puntId: string;
  waarde: number | string;
  /** Feitelijke omstandigheden: frequentie, duur, hulpmiddelen, herstelmogelijkheden. */
  toelichting: string;
}

export interface Functie {
  code: string;
  naam: string;
  taakomschrijving: string;
  taken: string[];
  opleidingsniveau: Opleidingsniveau;
  opleidingsrichting?: string[];
  ervaring: string;
  vereisteVaardigheden: VaardigheidEis[];
  uurloon: number;
  werktijden: Werktijden;
  arbeidsplaatsen: number;
  belasting: FunctieBelasting[];
  /** Algemene toelichting voor het docentmodel over deze functie. */
  docentToelichting: string;
}

// ---------------------------------------------------------------------------
// Vergelijking, voorselectie en berekening
// ---------------------------------------------------------------------------

export type Status = "groen" | "oranje" | "rood";

export interface Vergelijkingsresultaat {
  punt: Beoordelingspunt;
  functiewaarde: number | string;
  grens: number | string;
  status: Status;
  /** Verhouding functiewaarde / grens bij numerieke punten. */
  factor?: number;
  toelichting: string;
  functieToelichting: string;
  /** True wanneer de overschrijding zo groot is dat de voorselectie de functie uitsluit. */
  evident: boolean;
}

export type Uitsluitingsgrondtype =
  | "opleidingsniveau"
  | "opleidingsrichting"
  | "vaardigheid"
  | "nachtdienst"
  | "arbeidsduur"
  | "evidente-overschrijding";

export interface Uitsluitingsgrond {
  type: Uitsluitingsgrondtype;
  omschrijving: string;
}

export interface Voorselectieresultaat {
  code: string;
  uitgesloten: boolean;
  gronden: Uitsluitingsgrond[];
  vergelijking: Vergelijkingsresultaat[];
  aantalGroen: number;
  aantalOranje: number;
  aantalRood: number;
}

export type AoKlasse = "minder-dan-35" | "35-tot-80" | "80-tot-en-met-100";

export interface Berekeningsfunctie {
  code: string;
  naam: string;
  uurloon: number;
}

export interface Berekeningsstap {
  titel: string;
  uitleg: string;
  formule?: string;
  uitkomst: string;
}

export interface Berekeningsresultaat {
  gesorteerd: Berekeningsfunctie[];
  middelste: Berekeningsfunctie;
  maatmanuurloon: number;
  resterendeVerdiencapaciteitPerUur: number;
  /** Verschil vóór begrenzing; kan negatief zijn als de RVC hoger is dan het maatmanloon. */
  loonverliesOnbegrensd: number;
  loonverlies: number;
  aoPercentage: number;
  klasse: AoKlasse;
  rvcHogerDanMaatman: boolean;
  stappen: Berekeningsstap[];
}
