export interface MocoUser {
  id: number;
  firstname: string;
  lastname: string;
  active: boolean;
  email?: string;
}

export interface MocoEmployment {
  id: number;
  // MOCO liefert den Nutzer verschachtelt als `user: { id }` (nicht user_id).
  user?: { id: number; firstname?: string; lastname?: string };
  user_id?: number; // Fallback für ältere/abweichende Antworten
  weekly_target_hours: number;
  pattern?: {
    am: number[];
    pm: number[];
  };
  from: string; // YYYY-MM-DD
  to?: string | null;
}

// Hilfsfunktion: Nutzer-ID einer Anstellung (verschachtelt oder flach).
export function employmentUserId(e: MocoEmployment): number | undefined {
  return e.user?.id ?? e.user_id;
}

export interface MocoProject {
  id: number;
  name: string;
  active: boolean;
  billable: boolean;
  budget?: number | null;
  budget_monthly?: number | null;
  finish_date?: string | null;
  tags?: string[];
  leader?: MocoUser;
  customer?: { id: number; name: string };
}

export interface MocoTask {
  id: number;
  name: string;
  billable: boolean;
}

export interface MocoActivity {
  id: number;
  date: string; // YYYY-MM-DD
  hours: number;
  seconds?: number;
  billable: boolean;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  project: {
    id: number;
    name: string;
    billable: boolean;
  };
  task: MocoTask;
  description?: string;
}

export interface MocoProjectReport {
  budget_total: number;
  budget_expensed: number;
  budget_progress_in_percentage: number;
  budget_remaining: number;
  hours_total: number;
  hours_billable: number;
  hours_remaining: number;
  costs_by_task: Array<{
    id: number;
    name: string;
    hours: number;
  }>;
}

// Abwesenheiten (MOCO „Abwesenheiten"/Schedules): Ferien, Krankheit, Feiertag …
// am/pm geben an, ob Vor-/Nachmittag betroffen sind (beide = ganzer Tag).
export interface MocoSchedule {
  id: number;
  date: string; // YYYY-MM-DD
  am?: boolean;
  pm?: boolean;
  user?: { id: number };
  user_id?: number;
  assignment?: { id: number; name?: string }; // Abwesenheitsart (z. B. "Ferien", "Krankheit")
  absence_code?: number;
  symbol?: number;
  comment?: string;
}
export function scheduleUserId(s: MocoSchedule): number | undefined {
  return s.user?.id ?? s.user_id;
}

// Rechnungen (MOCO-Modul). Felder defensiv optional — je nach Account/Version.
export interface MocoInvoice {
  id: number;
  identifier?: string;
  date: string; // Rechnungsdatum YYYY-MM-DD
  due_date?: string | null;
  status?: string; // draft|created|sent|paid|partially_paid|overdue|ignored
  title?: string;
  net_total?: number;
  gross_total?: number;
  tax?: number;
  discount?: number;
  customer_id?: number;
  customer?: { id: number; name: string };
  project_id?: number | null;
}

// Offerten (MOCO-Modul).
export interface MocoOffer {
  id: number;
  date: string; // YYYY-MM-DD
  status?: string; // created|sent|accepted|partially_billed|billed|archived
  title?: string;
  net_total?: number;
  gross_total?: number;
  customer_id?: number;
  customer?: { id: number; name: string };
}

export interface MocoConfig {
  subdomain: string;
  apiKey: string;
  /**
   * MOCO-Login/Benutzername des API-Key-Besitzers. MOCO authentifiziert allein
   * über den Token; den Namen hinterlegen wir, um das Dashboard standardmäßig
   * auf die eigene Person zu setzen.
   */
  username?: string;
}
