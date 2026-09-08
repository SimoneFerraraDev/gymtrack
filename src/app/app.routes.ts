import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'schede' },
  {
    path: 'schede',
    loadComponent: () =>
      import('./features/plans/plan-list/plan-list').then((m) => m.PlanList),
  },
  {
    path: 'schede/nuova',
    loadComponent: () =>
      import('./features/plans/plan-form/plan-form').then((m) => m.PlanForm),
  },
  {
    path: 'schede/:id/modifica',
    loadComponent: () =>
      import('./features/plans/plan-form/plan-form').then((m) => m.PlanForm),
  },
  {
    path: 'allenamento',
    loadComponent: () =>
      import('./features/sessions/session-start/session-start').then(
        (m) => m.SessionStart,
      ),
  },
  {
    path: 'allenamento/sessione/:id',
    loadComponent: () =>
      import('./features/sessions/session-log/session-log').then(
        (m) => m.SessionLog,
      ),
  },
  {
    path: 'storico',
    loadComponent: () =>
      import('./features/history/history-list/history-list').then(
        (m) => m.HistoryList,
      ),
  },
  {
    path: 'storico/:id',
    loadComponent: () =>
      import('./features/history/session-detail/session-detail').then(
        (m) => m.SessionDetail,
      ),
  },
  {
    path: 'progressi',
    loadComponent: () =>
      import('./features/progress/progress-page').then(
        (m) => m.ProgressPage,
      ),
  },
  {
    path: 'impostazioni',
    loadComponent: () =>
      import('./features/settings/settings-page').then(
        (m) => m.SettingsPage,
      ),
  },
  { path: '**', redirectTo: 'schede' },
];
