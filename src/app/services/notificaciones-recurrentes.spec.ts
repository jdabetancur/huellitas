import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import { provideIonicAngular } from '@ionic/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventoSalud, Mascota } from '../models';
import { nuevoIdNotificacion } from '../utils/ids';

import { NotificacionesService } from './notificaciones.service';

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(async () => undefined),
    addListener: vi.fn(async () => ({ remove: async () => undefined })),
  },
}));

const mascota: Mascota = {
  id: 'm1',
  nombre: 'Mishi',
  especie: 'gato',
  raza: 'Siamés',
  sexo: 'hembra',
  fechaNacimiento: '2024-01-01',
};

describe('Avisos de recordatorios recurrentes (RF06 + RF07)', () => {
  let servicio: NotificacionesService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 0));
    vi.mocked(LocalNotifications.schedule).mockClear();
    vi.mocked(LocalNotifications.cancel).mockClear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideIonicAngular()] });
    servicio = TestBed.inject(NotificacionesService);
  });

  afterEach(() => vi.useRealTimers());

  const evento = (repetirCadaMeses?: number): EventoSalud => ({
    id: 'e1',
    mascotaId: 'm1',
    tipo: 'desparasitacion',
    fecha: '2026-09-10',
    recordatorio: { fecha: '2026-12-10', repetirCadaMeses },
  });

  it('un recordatorio recurrente deja programado también el aviso de la siguiente repetición (id + 1)', async () => {
    const id = await servicio.programarRecordatorio(evento(3), mascota);
    expect(id).toBeDefined();
    const programadas = vi.mocked(LocalNotifications.schedule).mock.calls.map((c) => c[0].notifications[0]);
    expect(programadas).toHaveLength(2);
    expect(programadas[0].id).toBe(id);
    expect(programadas[0].schedule?.at).toEqual(new Date(2026, 11, 9, 9, 0, 0, 0));
    expect(programadas[1].id).toBe(id! + 1);
    expect(programadas[1].schedule?.at).toEqual(new Date(2027, 2, 9, 9, 0, 0, 0));
  });

  it('un recordatorio único programa un solo aviso', async () => {
    await servicio.programarRecordatorio(evento(), mascota);
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it('cancelar quita el aviso y el de la siguiente repetición', async () => {
    await servicio.cancelar([40, undefined]);
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 40 }, { id: 41 }] });
  });

  it('los ids de notificación son pares, para reservar id + 1', () => {
    for (let i = 0; i < 50; i++) expect(nuevoIdNotificacion() % 2).toBe(0);
  });
});
