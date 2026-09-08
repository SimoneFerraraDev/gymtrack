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
      import('./shared/placeholder-page/placeholder-page').then(
        (m) => m.PlaceholderPage,
      ),
    data: { title: 'Allenamento', message: 'Il log delle sessioni arriva nel prossimo passo.' },
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
