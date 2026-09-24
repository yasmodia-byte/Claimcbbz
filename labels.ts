import type { Functie, Nachtdienstniveau, VaardigheidEis, Vaardigheden } from "./types";

export function vaardigheidEisLabel(eis: VaardigheidEis): string {
  switch (eis.soort) {
    case "computer":
      return `computervaardigheid: ${eis.niveau}`;
    case "rijbewijs":
      return `rijbewijs ${eis.categorie}`;
    case "nederlands":
      return `Nederlands: ${eis.niveau}`;
    case "engels":
      return `Engels: ${eis.niveau}`;
  }
}

export function vaardighedenLabels(v: Vaardigheden): { term: string; waarde: string }[] {
  return [
    { term: "Computervaardigheid", waarde: v.computer },
    { term: "Rijbewijs", waarde: v.rijbewijs.length ? v.rijbewijs.join(", ") : "geen" },
    { term: "Nederlands", waarde: v.nederlands },
    { term: "Engels", waarde: v.engels },
  ];
}

export const NACHTDIENST_LABELS: Record<Nachtdienstniveau, string> = {
  nooit: "geen nachtdiensten",
  incidenteel: "incidenteel nachtdiensten",
  regelmatig: "regelmatig nachtdiensten",
  uitsluitend: "uitsluitend nachtdiensten",
};

export function werktijdenLabel(f: Functie): string {
  const w = f.werktijden;
  const omvang =
    w.minimumUrenPerWeek < w.urenPerWeek
      ? `${w.urenPerWeek} uur per week (deeltijd vanaf ${w.minimumUrenPerWeek} uur)`
      : `${w.urenPerWeek} uur per week (vaste omvang)`;
  return `${omvang}, diensten van ${w.urenPerDag} uur, ${NACHTDIENST_LABELS[w.nachtdienst]}`;
}

export function datumLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(d);
}
