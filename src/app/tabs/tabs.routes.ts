import type { Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'mascotas',
        loadComponent: () => import('../pages/mis-mascotas/mis-mascotas.page').then((m) => m.MisMascotasPage),
      },
      {
        path: 'recordatorios',
        loadComponent: () => import('../pages/recordatorios/recordatorios.page').then((m) => m.RecordatoriosPage),
      },
      { path: '', redirectTo: '/tabs/mascotas', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: '/tabs/mascotas', pathMatch: 'full' },
];
