# Loco Moco — Funktionskatalog (Entwurf zum Sortieren)

Aus der Wunschliste (~100 Einzelkennzahlen) werden hier **gebündelte Funktionen
(„Karten")**. Jede Karte ist später im Admin-Panel **pro Person** zuschaltbar.
Statt 100 Schalter gibt es so ~19 sinnvolle Bausteine.

## Legende

**Datenquelle**
- 🟢 **Zeit/Projekte** — aus MOCO-Aktivitäten, Projekten, Anstellungen (haben wir schon im Zugriff)
- 🔵 **MOCO-Modul** — braucht ein aktiv genutztes MOCO-Modul + dessen API: Rechnungen, Offerten, Planung, Abwesenheiten
- 🟠 **Zusatzdaten** — braucht Kostensätze (für Marge/Deckungsbeitrag) oder ein Mapping (z. B. Geschäftsfeld)

**Phase**
- **P1** = sofort baubar (reine Zeit-/Projektdaten, baut auf Bestehendem auf)
- **P2** = nach Anbindung der MOCO-Module
- **P3** = braucht Kostensätze / Mapping

> Bereits gebaut (Basis-Karten): Produktivität, Erfassungs-Check, Nicht-verrechenbar,
> Über-Budget, Schläferprojekte, Loco-Coach, Monatsvergleich. Mehrere Wünsche unten
> erweitern genau diese.

---

## A. Management / GL

| Key | Funktion | Enthält | Quelle | Phase |
|---|---|---|---|---|
| `gl.umsatz` | **Umsatz-Cockpit** | Umsatz lfd. Monat, YTD, Trend | 🔵 Rechnungen | P2 |
| `gl.rechnungen` | **Rechnungsstatus** | offene Rechnungen, überfällige Rechnungen | 🔵 Rechnungen | P2 |
| `gl.wip` | **Fakturierbar, nicht verrechnet** | erbrachte fakturierbare Leistung ohne Rechnung | 🔵 Rechnungen+Zeit | P2 |
| `gl.umsatzverteilung` | **Umsatz-Verteilung** | pro Mitarbeiter / pro Kunde / pro Geschäftsfeld | 🔵 / 🟠 (Geschäftsfeld) | P2/P3 |
| `gl.margen` | **Margen & Deckungsbeitrag** | Ø Projektmarge, DB pro Kunde | 🟠 Kostensätze | P3 |
| `gl.auslastung` | **Auslastung & Verrechenbarkeit (Agentur)** | Gesamtauslastung, Verrechenbarkeit | 🟢 Zeit | P1 |
| `gl.kapazitaet` | **Kapazitätsvorschau 30/60/90 Tage** | geplante Auslastung, freie Kapazität je Team | 🔵 Planung | P2 |
| `gl.lastverteilung` | **Über-/Unterlastung** | überlastete / unterlastete Mitarbeitende | 🔵 Planung | P2 |
| `gl.vertrieb` | **Vertrieb / Pipeline** | Offertenvolumen offen, Abschlussquote, Ø Offertensumme | 🔵 Offerten | P2 |

## B. HR

| Key | Funktion | Enthält | Quelle | Phase |
|---|---|---|---|---|
| `hr.leistung` | **Mitarbeiterleistung** | Verrechenbarkeit, verrechenbare/interne Stunden, Krankheitsstunden, Umsatz, DB pro MA | 🟢 🔵(Krankheit) 🟠(DB) | P1→P3 |
| `hr.auslastung` | **Auslastung pro Mitarbeiter** | Ø Auslastung, geplant 30/60 Tage, Leerlaufstunden | 🔵 Planung | P2 |
| `hr.rangliste` | **Team-Rangliste** | Top Performer (Verrechenbarkeit/Umsatz), grösster Überstundenanstieg, höchster interner Anteil | 🟢 🔵 | P1→P2 |

## C. Projekt

| Key | Funktion | Enthält | Quelle | Phase |
|---|---|---|---|---|
| `prj.rentabilitaet` | **Projekt-Rentabilität** | budgetierte/effektive Stunden, Budgetabweichung %/h/CHF, Marge, Umsatz, DB pro Projekt | 🟢 (Stunden) 🟠 (CHF/Marge) | P1→P3 |
| `prj.rangliste` | **Projekt-Ranglisten** | Top 10 profitabel / unprofitabel / Budgetüberschreitung, negativer DB, meiste Nachträge | 🟢 🟠 | P1→P3 |
| `prj.status` | **Projektstatus** | offene, in Verzug, ohne Aktivität, kurz vor Budgetende | 🟢 | P1 *(teils da: Schläfer/Über-Budget)* |

## D. Kunden

| Key | Funktion | Enthält | Quelle | Phase |
|---|---|---|---|---|
| `kd.wirtschaft` | **Kunden-Wirtschaftlichkeit** | Umsatz, DB, Marge, Stundenaufwand, Umsatz/Stunde pro Kunde | 🟢 🔵 🟠 | P1→P3 |
| `kd.rangliste` | **Kunden-Ranglisten** | Top 20 Umsatz/Gewinn, höchster Stundenverbrauch, grösste Budgetüberschreitung, meiste unproduktive Stunden | 🟢 🟠 | P1→P3 |
| `kd.bindung` | **Kundenbindung** | letzte Fakturierung, letzter Projektabschluss, Kunden ohne Auftrag seit X, rückläufiger Umsatz | 🔵 🟢 | P2 |

## E. Frühwarn-Center (`warn.center`)

Eine Karte, die alle aktiven Warnungen sammelt — gruppiert, mit **einstellbaren
Schwellenwerten**. Die 24 Regeln:

**Projekte** — 1 ohne Zeiterfassung 14 T 🟢P1 · 2 ohne Aktivität 30 T 🟢P1 · 3 Budget zu 80 % 🟢P1 · 4 Budget überschritten 🟢P1 · 5 offen ohne Rechnung 🔵P2 · 6 läuft länger als geplant 🟢P1 · 7 negative Marge 🟠P3

**Mitarbeitende** — 8 Verrechenbarkeit <60 % 🟢P1 · 9 <50 % über 2 Monate 🟢P1 · 10 >90 % über 2 Monate 🟢P1 · 11 Überstundenanstieg >20 h/30 T 🟢P1 · 12 Überstundenbestand >80 h 🔵P2(Saldo) · 13 interne Stunden >30 % 🟢P1 · 14 keine Zeiterfassung an Arbeitstagen 🟢P1

**Kunden** — 15 wiederholte Budgetüberschreitung 🟢P1 · 16 seit 60 T keine Rechnung 🔵P2 · 17 seit 90 T kein aktives Projekt 🟢P1 · 18 negative Marge 🟠P3 · 19 überdurchschnittlich viele interne Stunden 🟢P1

**Finanzen** — 20 offene Leistungen >100k CHF 🔵P2 · 21 überfällige Rechnungen >30 T 🔵P2 · 22 monatl. Verrechenbarkeit unter Ziel 🟢P1 · 23 Pipeline 60 T zu tief 🔵P2 · 24 Umsatztrend 3 Monate rückläufig 🔵P2

---

## Offene Fragen (entscheiden, was sofort baubar ist)

1. **Welche MOCO-Module nutzt ihr aktiv?** Rechnungen / Offerten / Planung / Abwesenheiten — nur dann liefern die 🔵-Funktionen Daten.
2. **Stundenkosten pro Mitarbeiter** in MOCO hinterlegt? (nötig für Marge & Deckungsbeitrag — die 🟠-Funktionen). Falls nein: ein fixer Kostensatz pro Person als Zusatzfeld.
3. **Geschäftsfeld** (Web/Branding/Social/Strategie): woran erkennbar — Projekt-Kategorie, Tag, oder Kunde?

## Vorschlag Reihenfolge

- **Phase 1** (sofort, ohne neue Daten): `gl.auslastung`, `prj.status`, `prj.rentabilitaet` (Stundenteil), `hr.leistung` (Stundenteil), `hr.rangliste`, `kd.wirtschaft` (Stundenteil), `warn.center` (alle 🟢-Regeln).
- **Phase 2** (MOCO-Module anbinden): Umsatz/Rechnungen/WIP, Offerten/Pipeline, Planung (Kapazität & Vorschau), Abwesenheiten.
- **Phase 3** (Kostensätze/Mapping): Marge & Deckungsbeitrag überall, CHF-Budgetabweichung, Geschäftsfeld-Auswertung.

---

## Stand nach Abklärung (Datenquellen bestätigt)

- ✅ **Rechnungen, Offerten, Abwesenheiten** werden in MOCO genutzt → Umsatz, Rechnungsstatus, WIP, Pipeline/Abschlussquote, Krankheitsstunden, Kundenbindung **baubar**.
- ✅ **Stundenkosten pro Mitarbeiter in MOCO** → Marge & Deckungsbeitrag **überall baubar** (Projekt/Kunde/MA).
- ✅ **Geschäftsfeld = MOCO-Projektkategorie** → Umsatz/Auswertung pro Geschäftsfeld **baubar**.
- ⏸ **MOCO-Planung wird NICHT genutzt** → vorerst NICHT baubar: `gl.kapazitaet` (30/60/90-Vorschau), `gl.lastverteilung` (frei/überlastet nach Plan), `hr.auslastung` (geplanter Teil). Rückblickende Auslastung & Verrechenbarkeit gehen weiterhin.
- ⚠️ **Überstunden-Warnungen (11/12)** brauchen einen Überstundensaldo — klären wir beim Warn-Center.

**Damit sind ~16 der 19 Funktionen sofort umsetzbar.**

## Empfohlene Build-Reihenfolge
1. `prj.rentabilitaet` — Projekt-Rentabilität (Budget, Abweichung, **Marge/DB**) — baut auf „Über-Budget" auf, hoher Nutzen.
2. `gl.umsatz` + `gl.rechnungen` — Umsatz-Cockpit & Rechnungsstatus.
3. `kd.wirtschaft` + `kd.rangliste` — Kunden-Wirtschaftlichkeit & Top-Listen.
4. `gl.vertrieb` — Offerten/Pipeline.
5. `warn.center` — Frühwarn-Center (zuerst die 🟢-Regeln, dann Rechnungs-Regeln).
6. Rest (HR-Details, Umsatzverteilung/Geschäftsfeld …).
