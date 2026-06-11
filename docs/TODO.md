# Loco Moco — TODO

Umsetzungs-Checkliste für die Funktionen aus [FUNKTIONEN.md](FUNKTIONEN.md).
Jede Funktion = eine **Karte**, im Admin-Panel **pro Person** zuschaltbar.

Workflow je Funktion:
1. Card-Key in `lib/permissions.ts` (`CARDS`) registrieren
2. MOCO-Daten/Metrik in `lib/metrics/` (ggf. neue API-Route)
3. Card-Komponente in `components/` bauen
4. In `Dashboard.tsx` mit `showCard(key)` einbauen
5. Erscheint automatisch im Admin „⚙ Funktionen"-Editor

Legende: 🟢 Zeit/Projekte · 🔵 MOCO-Modul · 🟠 Kostensätze/Mapping
Status: ⬜ offen · 🟦 in Arbeit · ✅ fertig

---

## Bereits gebaut (Basis-Karten)
- ✅ Produktivität · Erfassungs-Check · Nicht-verrechenbar · Über-Budget · Schläferprojekte · Loco-Coach · Monatsvergleich

---

## Phase 1 — sofort baubar

### Projekt
- ⬜ `prj.rentabilitaet` — **Projekt-Rentabilität** 🟢🟠
  budgetierte/effektive Stunden, Budgetabweichung %/h/CHF, Marge, Umsatz, DB pro Projekt
- ⬜ `prj.rangliste` — **Projekt-Ranglisten** 🟢🟠
  Top 10 profitabel/unprofitabel, Budgetüberschreitung, negativer DB, meiste Nachträge
- ⬜ `prj.status` — **Projektstatus** 🟢
  offen, in Verzug, ohne Aktivität, kurz vor Budgetende *(teils da: Schläfer/Über-Budget)*

### GL
- ⬜ `gl.umsatz` — **Umsatz-Cockpit** 🔵 (Rechnungen) — Umsatz lfd. Monat, YTD, Trend
- ⬜ `gl.rechnungen` — **Rechnungsstatus** 🔵 — offene/überfällige Rechnungen
- ⬜ `gl.wip` — **Fakturierbar, nicht verrechnet** 🔵🟢
- ⬜ `gl.auslastung` — **Auslastung & Verrechenbarkeit (Agentur)** 🟢
- ⬜ `gl.margen` — **Margen & Deckungsbeitrag** 🟠 — Ø Projektmarge, DB pro Kunde
- ⬜ `gl.umsatzverteilung` — **Umsatz-Verteilung** 🔵🟠 — pro MA / Kunde / Geschäftsfeld (= Projekt-Kategorie)
- ⬜ `gl.vertrieb` — **Vertrieb / Pipeline** 🔵 (Offerten) — Volumen offen, Abschlussquote, Ø Summe

### HR
- ⬜ `hr.leistung` — **Mitarbeiterleistung** 🟢🔵🟠 — Verrechenbarkeit, intern, Krankheit, Umsatz, DB pro MA
- ⬜ `hr.rangliste` — **Team-Rangliste** 🟢🔵 — Top Performer, höchster interner Anteil

### Kunden
- ⬜ `kd.wirtschaft` — **Kunden-Wirtschaftlichkeit** 🟢🔵🟠 — Umsatz, DB, Marge, Umsatz/Stunde
- ⬜ `kd.rangliste` — **Kunden-Ranglisten** 🟢🟠 — Top 20 Umsatz/Gewinn, Stundenverbrauch, Budgetüberschreitung
- ⬜ `kd.bindung` — **Kundenbindung** 🔵🟢 — letzte Fakturierung/Projektabschluss, ohne Auftrag seit X, rückläufiger Umsatz

### Frühwarn-Center
- ⬜ `warn.center` — **Frühwarn-Center** mit einstellbaren Schwellenwerten
  - ⬜ 🟢-Regeln zuerst: 1–4, 6, 8–11, 13–15, 17, 19, 22
  - ⬜ 🔵-Regeln (Rechnungen/Offerten): 5, 16, 20, 21, 23, 24
  - ⬜ 🟠-Regeln (Marge): 7, 18
  - ⚠️ 12 (Überstundenbestand >80 h) — klären: Überstundensaldo in MOCO vorhanden?

---

## Geparkt — braucht MOCO-Planung (aktuell nicht genutzt)
- ⏸ `gl.kapazitaet` — Kapazitätsvorschau 30/60/90 Tage
- ⏸ `gl.lastverteilung` — Über-/Unterlastung (nach Plan)
- ⏸ `hr.auslastung` — geplanter 30/60-Tage-Teil (rückblickende Auslastung geht)

---

## Offene Punkte / zu klären
- ⚠️ Überstundensaldo: liefert MOCO einen Bestand, oder selbst aus erfasst − Soll kumulieren?
- ⬜ Schwellenwerte des Warn-Centers im Admin-Panel konfigurierbar machen
