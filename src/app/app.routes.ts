import type { Routes } from '@angular/router';

/**
 * Navegación de Huellitas (documento de diseño, sección 4):
 * P1 /tabs/mascotas · P2 /mascota/:id · P3 /mascota/:id/evento/nuevo y /mascota/:id/evento/:eventoId/editar · P4 /mascota/nueva y /mascota/:id/editar
 * P5 /tabs/recordatorios · P6 modal "Exportar historial" que se abre desde P2.
 */
export const routes: Routes = [
  {
    path: 'mascota/nueva',
    loadComponent: () => import('./pages/mascota-form/mascota-form.page').then((m) => m.MascotaFormPage),
  },
  {
    path: 'mascota/:id/editar',
    loadComponent: () => import('./pages/mascota-form/mascota-form.page').then((m) => m.MascotaFormPage),
  },
  {
    path: 'mascota/:id/evento/:eventoId/editar',
    loadComponent: () => import('./pages/nuevo-evento/nuevo-evento.page').then((m) => m.NuevoEventoPage),
  },
  {
    path: 'mascota/:id/evento/nuevo',
    loadComponent: () => import('./pages/nuevo-evento/nuevo-evento.page').then((m) => m.NuevoEventoPage),
  },
  {
    path: 'mascota/:id',
    loadComponent: () => import('./pages/perfil-mascota/perfil-mascota.page').then((m) => m.PerfilMascotaPage),
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: '/tabs/mascotas' },
];
