import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID, inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { MascotasService } from './app/services/mascotas.service';
import { NotificacionesService } from './app/services/notificaciones.service';
import { RecordatoriosService } from './app/services/recordatorios.service';
import { registrarIconos } from './app/utils/iconos';

registerLocaleData(localeEsCo);
registrarIconos();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideIonicAngular({ backButtonText: '', mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Antes de mostrar la primera pantalla: cargar los datos guardados y preparar las notificaciones.
    provideAppInitializer(() => inject(MascotasService).iniciar()),
    provideAppInitializer(() => inject(NotificacionesService).iniciar()),
    // RF06 y RF07: con los datos ya cargados, se reprograman los recordatorios en segundo plano,
    // sin demorar la primera pantalla (RNF03).
    provideAppInitializer(() => {
      const datos = inject(MascotasService);
      const recordatorios = inject(RecordatoriosService);
      void datos
        .iniciar()
        .then(() => (datos.errorCarga() ? undefined : recordatorios.iniciar()))
        .catch((error: unknown) => console.warn('[RF06] No se pudieron reprogramar los recordatorios', error));
    }),
  ],
});
