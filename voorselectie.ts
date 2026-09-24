import {
  COMPUTERNIVEAUS,
  OPLEIDINGSNIVEAUS,
  OPLEIDINGSNIVEAU_LABELS,
  TAALNIVEAUS,
  type Beoordelingspunt,
  type Casus,
  type Functie,
  type Uitsluitingsgrond,
  type VaardigheidEis,
  type Voorselectieresultaat,
} from "./types";
import { telStatussen, vergelijkFunctie, WERKTIJDPUNTEN } from "./vergelijking";

function niveauIndex<T extends readonly string[]>(reeks: T, waarde: T[number]): number {
  return reeks.indexOf(waarde);
}

export function controleerOpleidingsniveau(functie: Functie, casus: Casus): Uitsluitingsgrond | null {
  const vereist = niveauIndex(OPLEIDINGSNIVEAUS, functie.opleidingsniveau);
  const aanwezig = niveauIndex(OPLEIDINGSNIVEAUS, casus.client.opleidingsniveau);
  if (vereist > aanwezig) {
    return {
      type: "opleidingsniveau",
      omschrijving: `Opleidingsniveau te hoog: de functie vereist ${OPLEIDINGSNIVEAU_LABELS[functie.opleidingsniveau]}, de cliënt heeft ${OPLEIDINGSNIVEAU_LABELS[casus.client.opleidingsniveau]}.`,
    };
  }
  return null;
}

export function controleerOpleidingsrichting(functie: Functie, casus: Casus): Uitsluitingsgrond | null {
  const vereist = functie.opleidingsrichting ?? [];
  if (vereist.length === 0) return null;
  const richtingen = casus.client.opleidingsrichting.map((r) => r.toLowerCase());
  const voldoet = vereist.some((r) => richtingen.includes(r.toLowerCase()));
  if (!voldoet) {
    return {
      type: "opleidingsrichting",
      omschrijving: `Noodzakelijke opleidingsrichting ontbreekt: de functie vereist ${vereist.join(" of ")}, de cliënt is opgeleid in ${casus.client.opleidingsrichting.join(", ")}.`,
    };
  }
  return null;
}

function beschrijfEis(eis: VaardigheidEis): string {
  switch (eis.soort) {
    case "computer":
      return `computervaardigheid ${eis.niveau}`;
    case "rijbewijs":
      return `rijbewijs ${eis.categorie}`;
    case "nederlands":
      return `Nederlands ${eis.niveau}`;
    case "engels":
      return `Engels ${eis.niveau}`;
  }
}

export function controleerVaardigheden(functie: Functie, casus: Casus): Uitsluitingsgrond[] {
  const v = casus.client.vaardigheden;
  const gronden: Uitsluitingsgrond[] = [];
  for (const eis of functie.vereisteVaardigheden) {
    let voldoet = true;
    let aanwezig = "";
    switch (eis.soort) {
      case "computer":
        voldoet = niveauIndex(COMPUTERNIVEAUS, v.computer) >= niveauIndex(COMPUTERNIVEAUS, eis.niveau);
        aanwezig = `computervaardigheid ${v.computer}`;
        break;
      case "rijbewijs":
        voldoet = v.rijbewijs.includes(eis.categorie);
        aanwezig = v.rijbewijs.length ? `rijbewijs ${v.rijbewijs.join(", ")}` : "geen rijbewijs";
        break;
      case "nederlands":
        voldoet = niveauIndex(TAALNIVEAUS, v.nederlands) >= niveauIndex(TAALNIVEAUS, eis.niveau);
        aanwezig = `Nederlands ${v.nederlands}`;
        break;
      case "engels":
        voldoet = niveauIndex(TAALNIVEAUS, v.engels) >= niveauIndex(TAALNIVEAUS, eis.niveau);
        aanwezig = `Engels ${v.engels}`;
        break;
    }
    if (!voldoet) {
      gronden.push({
        type: "vaardigheid",
        omschrijving: `Vereiste vaardigheid ontbreekt: de functie vereist ${beschrijfEis(eis)}, de cliënt heeft ${aanwezig}.`,
      });
    }
  }
  return gronden;
}

export function controleerNachtdienst(functie: Functie, casus: Casus): Uitsluitingsgrond | null {
  const grens = casus.belastbaarheid.find((b) => b.puntId === WERKTIJDPUNTEN.nachtdienst);
  if (!grens || grens.waarde !== "nooit") return null;
  if (functie.werktijden.nachtdienst === "uitsluitend") {
    return {
      type: "nachtdienst",
      omschrijving: "Uitsluitend nachtdiensten: de functie wordt alleen in nachtdienst uitgevoerd, terwijl de cliënt geen nachtdiensten kan verrichten.",
    };
  }
  return null;
}

export function controleerArbeidsduur(functie: Functie, casus: Casus): Uitsluitingsgrond[] {
  const gronden: Uitsluitingsgrond[] = [];
  const maxDag = casus.belastbaarheid.find((b) => b.puntId === WERKTIJDPUNTEN.urenPerDag);
  const maxWeek = casus.belastbaarheid.find((b) => b.puntId === WERKTIJDPUNTEN.urenPerWeek);
  if (maxDag && functie.werktijden.urenPerDag > Number(maxDag.waarde)) {
    gronden.push({
      type: "arbeidsduur",
      omschrijving: `Arbeidsduur per dag niet verenigbaar: de functie kent diensten van ${functie.werktijden.urenPerDag} uur, de cliënt kan maximaal ${maxDag.waarde} uur per dag werken.`,
    });
  }
  if (maxWeek && functie.werktijden.minimumUrenPerWeek > Number(maxWeek.waarde)) {
    gronden.push({
      type: "arbeidsduur",
      omschrijving: `Arbeidsduur per week niet verenigbaar: de functie wordt alleen aangeboden vanaf ${functie.werktijden.minimumUrenPerWeek} uur per week, de cliënt kan maximaal ${maxWeek.waarde} uur per week werken.`,
    });
  }
  return gronden;
}

/**
 * Voert de automatische voorselectie uit. Iedere uitsluiting is herleidbaar
 * tot een formele grond; de resterende functies beoordeelt de deelnemer zelf.
 */
export function voorselectie(
  casus: Casus,
  functies: Functie[],
  punten: Beoordelingspunt[],
): Voorselectieresultaat[] {
  return functies.map((functie) => {
    const vergelijking = vergelijkFunctie(functie, casus.belastbaarheid, punten);
    const gronden: Uitsluitingsgrond[] = [];

    const niveau = controleerOpleidingsniveau(functie, casus);
    if (niveau) gronden.push(niveau);
    const richting = controleerOpleidingsrichting(functie, casus);
    if (richting) gronden.push(richting);
    gronden.push(...controleerVaardigheden(functie, casus));
    const nacht = controleerNachtdienst(functie, casus);
    if (nacht) gronden.push(nacht);
    gronden.push(...controleerArbeidsduur(functie, casus));

    for (const v of vergelijking) {
      if (v.evident) {
        gronden.push({
          type: "evidente-overschrijding",
          omschrijving: `Evidente en niet te motiveren overschrijding op "${v.punt.naam}": ${v.toelichting}`,
        });
      }
    }

    const telling = telStatussen(vergelijking);
    return {
      code: functie.code,
      uitgesloten: gronden.length > 0,
      gronden,
      vergelijking,
      aantalGroen: telling.groen,
      aantalOranje: telling.oranje,
      aantalRood: telling.rood,
    };
  });
}

export const UITSLUITINGSGROND_LABELS: Record<Uitsluitingsgrond["type"], string> = {
  opleidingsniveau: "Opleidingsniveau",
  opleidingsrichting: "Opleidingsrichting",
  vaardigheid: "Vaardigheid",
  nachtdienst: "Nachtdienst",
  arbeidsduur: "Arbeidsduur",
  "evidente-overschrijding": "Evidente overschrijding",
};
