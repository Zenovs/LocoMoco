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
