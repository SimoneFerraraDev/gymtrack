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
      import('./shared/placeholder-page/placeholder-page').then(
        (m) => m.PlaceholderPage,
      ),
    data: { title: 'Storico', message: 'Qui vedrai le sessioni passate.' },
  },
  {
    path: 'progressi',
    loadComponent: () =>
      import('./shared/placeholder-page/placeholder-page').then(
        (m) => m.PlaceholderPage,
      ),
    data: { title: 'Progressi', message: 'Qui vedrai il grafico di progressione dei carichi.' },
  },
  { path: '**', redirectTo: 'schede' },
];
