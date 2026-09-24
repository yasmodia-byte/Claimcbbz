"use client";

import { useMemo, useSyncExternalStore } from "react";
import { abonneerOpslag, leesRuweSessie, parseSessie } from "@/lib/opslag";
import type { Sessie } from "@/lib/sessie";

/**
 * Volgt de in deze browser bewaarde sessie van een casus zonder de
 * SessieProvider (startpagina en docentmodus). Op de server is er niets.
 */
export function useBewaardeSessie(casusId: string): Sessie | null {
  const ruw = useSyncExternalStore(
    abonneerOpslag,
    () => leesRuweSessie(casusId),
    () => null,
  );
  return useMemo(() => parseSessie(ruw, casusId), [ruw, casusId]);
}
