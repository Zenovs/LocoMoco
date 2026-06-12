// Kanonische Liste der zuweisbaren Freigaben (Capabilities) und Karten.
// Rollen sind Daten (lib/roles.ts) und kombinieren diese frei — im Admin-Panel
// erweiterbar.

export const CAPABILITIES = [
  { key: "users.manage", label: "Benutzer verwalten" },
  { key: "roles.manage", label: "Rollen & Freigaben verwalten" },
  { key: "config.manage", label: "MOCO-Verbindung verwalten" },
  { key: "data.all", label: "Alle Mitarbeiter sehen (sonst nur eigene)" },
  { key: "salary.manage", label: "Löhne erfassen & freigeben" },
  { key: "data.salary", label: "Löhne / Wirtschaftlichkeit sehen" },
  { key: "liquidity.manage", label: "Liquidität erfassen & freigeben" },
  { key: "data.liquidity", label: "Liquidität sehen" },
] as const;

export const CARDS = [
  // Persönliche Karten (pro Mitarbeiter)
  { key: "productivity", label: "Produktivität" },
  { key: "hoursCheck", label: "Erfassungs-Check" },
  { key: "nonBillable", label: "Nicht verrechenbar" },
  { key: "overBudget", label: "Über Budget" },
  { key: "sleeping", label: "Schläferprojekte" },
  { key: "coach", label: "Loco-Coach" },
  { key: "compare", label: "Monatsvergleich" },
  // Firmenweite Auswertungen (brauchen zusätzlich "Alle sehen" / data.all)
  { key: "gl.auslastung", label: "Auslastung & Verrechenbarkeit (Firma)" },
  { key: "gl.umsatz", label: "Umsatz-Cockpit" },
  { key: "gl.rechnungen", label: "Rechnungsstatus" },
  { key: "gl.wip", label: "Fakturierbar, nicht verrechnet" },
  { key: "gl.vertrieb", label: "Vertrieb / Pipeline (Offerten)" },
  { key: "gl.margen", label: "Margen & Deckungsbeitrag" },
  { key: "prj.rentabilitaet", label: "Projekt-Rentabilität" },
  { key: "prj.rangliste", label: "Projekt-Ranglisten" },
  { key: "prj.status", label: "Projektstatus" },
  { key: "hr.leistung", label: "Mitarbeiterleistung" },
  { key: "hr.rangliste", label: "Team-Rangliste" },
  { key: "kd.wirtschaft", label: "Kunden-Wirtschaftlichkeit" },
  { key: "kd.rangliste", label: "Kunden-Ranglisten" },
  { key: "warn.center", label: "Frühwarn-Center" },
  // Sensible Karten (brauchen zusätzlich die jeweilige Lese-Freigabe)
  { key: "hr.wirtschaftlichkeit", label: "Wirtschaftlichkeit pro Mitarbeiter (Lohn)" },
  { key: "gl.liquiditaet", label: "Liquidität" },
  // KI-Chat (lokales LLM auf dem Gerät)
  { key: "chat", label: "Loco-Chat (lokale KI)" },
] as const;

export const ALL_CAPABILITIES: string[] = CAPABILITIES.map((c) => c.key);
export const ALL_CARDS: string[] = CARDS.map((c) => c.key);
