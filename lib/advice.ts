import type { ProductivityResult } from "@/lib/metrics/productivity";
import type { TimeWaster } from "@/lib/metrics/timeWasters";

export interface Advice {
  belowTarget: boolean;
  gapHours: number; // verrechenbare Stunden bis zum Ziel
  internalPct: number; // Anteil interner Stunden
  suggestions: string[];
}

// Leitet aus den Monatszahlen + Zeitfressern konkrete, datenbasierte
// Verbesserungsvorschläge ab (kein externer KI-Dienst nötig).
export function buildAdvice(
  p: ProductivityResult,
  targetPct: number,
  timeWasters: TimeWaster[]
): Advice {
  const denom = p.targetHours ?? p.totalHours ?? 0;
  const neededBillable = (targetPct / 100) * denom;
  const gapHours = Math.max(0, Math.round((neededBillable - p.billableHours) * 10) / 10);
  const belowTarget = p.productivityPct < targetPct;
  const internalPct = p.totalHours > 0 ? Math.round((p.internalHours / p.totalHours) * 100) : 0;

  const s: string[] = [];
  if (belowTarget) {
    if (gapHours > 0) {
      s.push(
        `Dir fehlen rund ${gapHours} h verrechenbare Arbeit, um das Ziel von ${targetPct}% zu erreichen.`
      );
    }
    if (timeWasters[0]) {
      s.push(
        `Größter interner Posten: „${timeWasters[0].label}" mit ${timeWasters[0].hours} h — prüfen, ob ein Teil verrechenbar ist oder reduziert werden kann.`
      );
    }
    if (internalPct >= 35) {
      s.push(
        `${internalPct}% der erfassten Zeit war intern. Interne Aufgaben bündeln und auf das Nötige begrenzen.`
      );
    }
    if (p.targetHours && p.totalHours < p.targetHours * 0.9) {
      s.push(
        `Insgesamt sind nur ${p.totalHours} h von ~${Math.round(p.targetHours)} h Soll erfasst — fehlen evtl. noch Buchungen?`
      );
    }
    s.push(
      `Verrechenbare Arbeit früh am Tag in feste Blöcke legen und Kontextwechsel zwischen Projekten reduzieren.`
    );
    s.push(
      `Wiederkehrende interne Tätigkeiten als eigenes Projekt führen, statt sie über Kundenprojekte zu verteilen.`
    );
  }

  return { belowTarget, gapHours, internalPct, suggestions: s.slice(0, 5) };
}
