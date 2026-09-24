import { berekenVerdiencapaciteit, controleerEigenWaarde } from "./berekening";
import { valideerEindselectie } from "./eindselectie";
import { REGELS } from "./regels";
import { beoordelingIsGeldig, type Functiebeoordeling, type Sessie } from "./sessie";
import type { Casus, Functie, Oordeel, Voorselectieresultaat } from "./types";
import { signaleringen } from "./vergelijking";

export type Overeenkomst = "gelijk" | "verdedigbaar" | "afwijkend" | "niet-beoordeeld" | "uitgesloten";

export interface Modelvergelijking {
  code: string;
  naam: string;
  deelnemer: Oordeel | null;
  verwacht: Oordeel;
  overeenkomst: Overeenkomst;
  argumenten: string[];
  alternatieveAfweging: string;
  aanvullendeInformatie: string;
}

export interface GemisteSignalering {
  code: string;
  naam: string;
  punten: { puntId: string; naam: string; status: "oranje" | "rood" }[];
}

export type Motiveringslengte = "kort" | "voldoende" | "uitgebreid";

export interface Motiveringskwaliteit {
  code: string;
  naam: string;
  lengte: Motiveringslengte;
  aantalWoorden: number;
  genoemdeAspecten: string[];
  ontbrekendeAspecten: string[];
  verwezenSignaleringen: string[];
  nietVerwezenSignaleringen: string[];
}

export interface Berekeningscontrole {
  uitgevoerd: boolean;
  eigenRvcIngevuld: boolean;
  eigenRvcJuist: boolean | null;
  eigenAoIngevuld: boolean;
  eigenAoJuist: boolean | null;
  toelichting: string;
}

export interface Evaluatie {
  formeleFouten: string[];
  gemisteSignaleringen: GemisteSignalering[];
  motivering: Motiveringskwaliteit[];
  modelvergelijking: Modelvergelijking[];
  consistentie: string[];
  berekening: Berekeningscontrole;
  aantalBeoordeeld: number;
  aantalTeBeoordelen: number;
}

/** Aspecten van een professionele motivering; herkenning op trefwoorden (bewust eenvoudig en transparant). */
export const MOTIVERINGSASPECTEN: { id: string; label: string; trefwoorden: string[] }[] = [
  { id: "frequentie", label: "frequentie", trefwoorden: ["frequent", "frequentie", "vaak", "incidenteel", "regelmatig", "zelden", "keer per", "per dag", "per uur", "dagelijks"] },
  { id: "duur", label: "duur", trefwoorden: ["duur", "minuten", "minuut", "aaneengesloten", "lang", "kort", "uur"] },
  { id: "omstandigheden", label: "omstandigheden en hulpmiddelen", trefwoorden: ["omstandighe", "hulpmiddel", "kar", "rolwagen", "werkplek", "collega", "buffer", "kruk", "zit-sta", "splits"] },
  { id: "herstel", label: "herstelmogelijkheden", trefwoorden: ["herstel", "pauze", "afwissel", "onderbr", "vertreden", "rust", "wisselen"] },
  { id: "belastbaarheid", label: "verwijzing naar het belastbaarheidsprofiel", trefwoorden: ["belastbaar", "profiel", "fml", "grens", "beperk", "maximaal", "kg", "kilo"] },
];

function bevatTrefwoord(tekst: string, trefwoorden: string[]): boolean {
  const t = tekst.toLowerCase();
  return trefwoorden.some((w) => t.includes(w.toLowerCase()));
}

export function beoordeelMotivering(
  functie: Functie,
  beoordeling: Functiebeoordeling,
  voorselectie: Voorselectieresultaat,
): Motiveringskwaliteit {
  const tekst = `${beoordeling.motivering} ${Object.values(beoordeling.signaleringen)
    .map((s) => s.notitie)
    .join(" ")}`;
  const aantalWoorden = beoordeling.motivering.trim().split(/\s+/).filter(Boolean).length;
  const lengte: Motiveringslengte = aantalWoorden < 15 ? "kort" : aantalWoorden < 45 ? "voldoende" : "uitgebreid";
  const genoemd = MOTIVERINGSASPECTEN.filter((a) => bevatTrefwoord(tekst, a.trefwoorden));
  const relevanteSignaleringen = signaleringen(voorselectie.vergelijking);
  const verwezen: string[] = [];
  const nietVerwezen: string[] = [];
  for (const s of relevanteSignaleringen) {
    const genoemdInTekst = bevatTrefwoord(tekst, s.punt.trefwoorden);
    const notitie = beoordeling.signaleringen[s.punt.id]?.notitie?.trim();
    if (genoemdInTekst || (notitie && notitie.length > 0)) verwezen.push(s.punt.naam);
    else nietVerwezen.push(s.punt.naam);
  }
  return {
    code: functie.code,
    naam: functie.naam,
    lengte,
    aantalWoorden,
    genoemdeAspecten: genoemd.map((a) => a.label),
    ontbrekendeAspecten: MOTIVERINGSASPECTEN.filter((a) => !genoemd.includes(a)).map((a) => a.label),
    verwezenSignaleringen: verwezen,
    nietVerwezenSignaleringen: nietVerwezen,
  };
}

export function evalueerSessie(
  sessie: Sessie,
  casus: Casus,
  functies: Functie[],
  voorselectie: Voorselectieresultaat[],
): Evaluatie {
  const teBeoordelen = voorselectie.filter((v) => !v.uitgesloten);
  const formeleFouten: string[] = [];
  const gemisteSignaleringen: GemisteSignalering[] = [];
  const motivering: Motiveringskwaliteit[] = [];
  const modelvergelijking: Modelvergelijking[] = [];
  const consistentie: string[] = [];

  const selectiecontrole = valideerEindselectie(sessie.eindselectie, functies, voorselectie, sessie.beoordelingen);
  formeleFouten.push(...selectiecontrole.problemen.map((p) => p.melding));

  let aantalBeoordeeld = 0;
  for (const vs of teBeoordelen) {
    const functie = functies.find((f) => f.code === vs.code);
    if (!functie) continue;
    const beoordeling = sessie.beoordelingen[vs.code];
    const model = casus.docentmodel.functies[vs.code];
    const geldig = beoordelingIsGeldig(beoordeling);
    if (geldig) aantalBeoordeeld += 1;

    // Gemiste signaleringen: oranje/rode punten die niet als beoordeeld zijn aangevinkt.
    if (geldig && beoordeling) {
      const gemist = signaleringen(vs.vergelijking).filter((s) => !beoordeling.signaleringen[s.punt.id]?.beoordeeld);
      if (gemist.length > 0) {
        gemisteSignaleringen.push({
          code: functie.code,
          naam: functie.naam,
          punten: gemist.map((s) => ({ puntId: s.punt.id, naam: s.punt.naam, status: s.status as "oranje" | "rood" })),
        });
      }
      motivering.push(beoordeelMotivering(functie, beoordeling, vs));

      // Consistentie tussen oordeel en signaleringen.
      const aantalRood = vs.aantalRood;
      const aantalOranje = vs.aantalOranje;
      if (beoordeling.oordeel === "geschikt" && (aantalRood > 0 || aantalOranje > 0)) {
        consistentie.push(
          `${functie.code} ${functie.naam} is als "geschikt" beoordeeld terwijl er ${aantalRood + aantalOranje} signalering${aantalRood + aantalOranje === 1 ? "" : "en"} ${aantalRood + aantalOranje === 1 ? "is" : "zijn"}; "geschikt na motivering" ligt dan meer voor de hand.`,
        );
      }
      if (beoordeling.oordeel === "geschikt-na-motivering" && aantalRood === 0 && aantalOranje === 0) {
        consistentie.push(
          `${functie.code} ${functie.naam} is als "geschikt na motivering" beoordeeld zonder signaleringen; controleer of de motivering een belastbaarheidsargument bevat of een ander soort overweging.`,
        );
      }
      if ((beoordeling.oordeel === "geschikt" || beoordeling.oordeel === "geschikt-na-motivering") && aantalRood >= 2) {
        consistentie.push(
          `${functie.code} ${functie.naam} heeft ${aantalRood} rode overschrijdingen en is toch als geschikt beoordeeld; dat vraagt een uitzonderlijk sterke motivering.`,
        );
      }
    }

    // Vergelijking met het antwoordmodel.
    if (model) {
      let overeenkomst: Overeenkomst = "niet-beoordeeld";
      const oordeel = beoordeling?.oordeel ?? null;
      if (geldig && oordeel) {
        if (oordeel === model.verwachteBeoordeling) overeenkomst = "gelijk";
        else if (model.verdedigbareAlternatieven.includes(oordeel)) overeenkomst = "verdedigbaar";
        else overeenkomst = "afwijkend";
      }
      modelvergelijking.push({
        code: functie.code,
        naam: functie.naam,
        deelnemer: oordeel,
        verwacht: model.verwachteBeoordeling,
        overeenkomst,
        argumenten: model.argumenten,
        alternatieveAfweging: model.alternatieveAfweging,
        aanvullendeInformatie: model.aanvullendeInformatie,
      });
    }
  }

  // Consistentie tussen beoordeling en eindselectie.
  const geschiktMaarNietGeselecteerd = teBeoordelen
    .filter((vs) => {
      const b = sessie.beoordelingen[vs.code];
      const f = functies.find((x) => x.code === vs.code);
      return (
        beoordelingIsGeldig(b) &&
        (b?.oordeel === "geschikt" || b?.oordeel === "geschikt-na-motivering") &&
        !sessie.eindselectie.includes(vs.code) &&
        (f?.arbeidsplaatsen ?? 0) >= REGELS.minimumArbeidsplaatsenPerFunctie
      );
    })
    .map((vs) => vs.code);
  if (geschiktMaarNietGeselecteerd.length > 0 && sessie.eindselectie.length >= REGELS.minimumFunctiesVoorBerekening) {
    consistentie.push(
      `Ook geschikt beoordeeld maar niet geselecteerd: ${geschiktMaarNietGeselecteerd.join(", ")}. Dat is toegestaan; leg in de reflectie uit waarom de gekozen drie functies het meest passend zijn.`,
    );
  }

  // Controle van de berekening.
  let berekening: Berekeningscontrole = {
    uitgevoerd: false,
    eigenRvcIngevuld: false,
    eigenRvcJuist: null,
    eigenAoIngevuld: false,
    eigenAoJuist: null,
    toelichting: "De berekening is nog niet uitgevoerd omdat de eindselectie niet aan de voorwaarden voldoet.",
  };
  if (selectiecontrole.geldig) {
    const geselecteerd = sessie.eindselectie
      .map((code) => functies.find((f) => f.code === code))
      .filter((f): f is Functie => Boolean(f))
      .map((f) => ({ code: f.code, naam: f.naam, uurloon: f.uurloon }));
    const resultaat = berekenVerdiencapaciteit(casus.maatgevendeArbeid.maatmanuurloon, geselecteerd);
    const rvcJuist = controleerEigenWaarde(sessie.eigenBerekening.resterendeVerdiencapaciteit, resultaat.resterendeVerdiencapaciteitPerUur);
    const aoJuist = controleerEigenWaarde(sessie.eigenBerekening.aoPercentage, resultaat.aoPercentage);
    const delen: string[] = [];
    if (rvcJuist === null) delen.push("De eigen schatting van de resterende verdiencapaciteit is niet ingevuld.");
    else delen.push(rvcJuist ? "De eigen resterende verdiencapaciteit komt overeen met de berekening." : "De eigen resterende verdiencapaciteit wijkt af van de berekening.");
    if (aoJuist === null) delen.push("Het eigen AO-percentage is niet ingevuld.");
    else delen.push(aoJuist ? "Het eigen AO-percentage komt overeen met de berekening." : "Het eigen AO-percentage wijkt af van de berekening.");
    berekening = {
      uitgevoerd: true,
      eigenRvcIngevuld: rvcJuist !== null,
      eigenRvcJuist: rvcJuist,
      eigenAoIngevuld: aoJuist !== null,
      eigenAoJuist: aoJuist,
      toelichting: delen.join(" "),
    };
  }

  return {
    formeleFouten,
    gemisteSignaleringen,
    motivering,
    modelvergelijking,
    consistentie,
    berekening,
    aantalBeoordeeld,
    aantalTeBeoordelen: teBeoordelen.length,
  };
}

export const REFLECTIEVRAGEN: { id: string; vraag: string }[] = [
  { id: "1", vraag: "Welke signalering vond je het moeilijkst te beoordelen?" },
  { id: "2", vraag: "Welke aanvullende informatie zou je bij de cliënt of een andere professional opvragen?" },
  { id: "3", vraag: "Welke geselecteerde functie is volgens jou het meest kwetsbaar?" },
  { id: "4", vraag: "Wat kan een kleine verandering in de functieselectie betekenen voor het AO-percentage?" },
  { id: "5", vraag: "Waarom is functieduiding meer dan een automatische vergelijking van cijfers?" },
];

export function docentcategorie(verwacht: Oordeel, uitgesloten: boolean): "geschikt" | "twijfelachtig" | "ongeschikt" | "uitgesloten" {
  if (uitgesloten) return "uitgesloten";
  if (verwacht === "geschikt" || verwacht === "geschikt-na-motivering") return "geschikt";
  if (verwacht === "aanvullende-informatie") return "twijfelachtig";
  return "ongeschikt";
}
