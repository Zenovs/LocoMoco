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

## Welle 1 — gebaut (stundenbasiert) ✅

Firmenweite Sektion (`/api/company`, Karte je Person zuschaltbar, braucht `data.all`).
CHF/Marge/DB sind als nächste Welle markiert (brauchen Kostensätze).

### Projekt
- ✅ `prj.rentabilitaet` — **Projekt-Rentabilität** — Stunden, Budget, Fortschritt, Verr.-Quote · ⬜ CHF/Marge/DB (Kostensätze)
- ✅ `prj.rangliste` — **Projekt-Ranglisten** — grösste Budgetüberschreitung, meiste Stunden · ⬜ profitabel/DB (Kostensätze)
- ✅ `prj.status` — **Projektstatus** — aktiv, über Budget, ≥80 %, 30 T ohne Aktivität, Termin überschritten

### GL
- ✅ `gl.auslastung` — **Auslastung & Verrechenbarkeit (Firma)** — erfasst/Soll, Verrechenbarkeit
- ✅ `gl.umsatz` — **Umsatz-Cockpit** — Umsatz Monat, YTD, 6-Monats-Trend
- ✅ `gl.rechnungen` — **Rechnungsstatus** — offen / überfällig / bezahlt
- ✅ `gl.wip` — **Fakturierbar, nicht verrechnet** — Projekte mit verr. Stunden ohne Rechnung
- ✅ `gl.margen` — **Margen & Deckungsbeitrag** — Ø Marge, DB pro Kunde (via Kostensätze)
- ⬜ `gl.umsatzverteilung` — **Umsatz-Verteilung** 🔵🟠 — pro MA / Kunde / Geschäftsfeld (= Projekt-Kategorie)
- ✅ `gl.vertrieb` — **Vertrieb / Pipeline** — offenes Volumen, Ø Summe, Abschlussquote

### HR
- ✅ `hr.leistung` — **Mitarbeiterleistung** — Erfasst, verrechenbar, Verr.-Quote, Auslastung · ⬜ Krankheit (Abwesenheiten), DB (Kostensätze)
- ✅ `hr.rangliste` — **Team-Rangliste** — Top nach Verrechenbarkeit

### Kunden
- ✅ `kd.wirtschaft` — **Kunden-Wirtschaftlichkeit** — Aufwand, verrechenbar, Verr.-Quote · ⬜ Umsatz/DB/Marge (Rechnungen+Kostensätze)
- ✅ `kd.rangliste` — **Kunden-Ranglisten** — Top nach Aufwand · ⬜ Umsatz/Gewinn (Rechnungen)
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

## Kostensätze (für Margen/DB)
- ✅ `lib/rates.ts` + `/api/admin/rates` + Admin-Tab „💸 Kostensätze" (Standardsatz + pro Person, CHF/h)
- ⬜ Sätze automatisch aus MOCO ziehen (Feld noch unbekannt — bis dahin manuell im Admin)

## Offene Punkte / zu klären
- ⚠️ Live am Server prüfen: stimmen Rechnungs-Status-Namen (sent/paid/overdue…), Offerten-Status & `project_id` auf Rechnungen?
- ⚠️ Überstundensaldo: liefert MOCO einen Bestand, oder selbst aus erfasst − Soll kumulieren?
- ⬜ Schwellenwerte des Warn-Centers im Admin-Panel konfigurierbar machen
