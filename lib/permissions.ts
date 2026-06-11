// Kanonische Liste der zuweisbaren Freigaben (Capabilities) und Karten.
// Rollen sind Daten (lib/roles.ts) und kombinieren diese frei — im Admin-Panel
// erweiterbar.

export const CAPABILITIES = [
  { key: "users.manage", label: "Benutzer verwalten" },
  { key: "roles.manage", label: "Rollen & Freigaben verwalten" },
  { key: "data.all", label: "Alle Mitarbeiter sehen (sonst nur eigene)" },
  { key: "data.salary", label: "Löhne sehen (später)" },
  { key: "data.liquidity", label: "Liquidität sehen (später)" },
] as const;

export const CARDS = [
  { key: "productivity", label: "Produktivität" },
  { key: "hoursCheck", label: "Erfassungs-Check" },
  { key: "nonBillable", label: "Nicht verrechenbar" },
  { key: "overBudget", label: "Über Budget" },
  { key: "sleeping", label: "Schläferprojekte" },
  { key: "coach", label: "Loco-Coach" },
  { key: "compare", label: "Monatsvergleich" },
] as const;

export const ALL_CAPABILITIES: string[] = CAPABILITIES.map((c) => c.key);
export const ALL_CARDS: string[] = CARDS.map((c) => c.key);
