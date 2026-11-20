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
  ],
});
