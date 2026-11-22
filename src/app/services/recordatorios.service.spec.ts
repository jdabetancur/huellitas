import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventoSalud, Mascota } from '../models';

import type { DatosEvento } from './mascotas.service';
import { MascotasService } from './mascotas.service';
import { NotificacionesService } from './notificaciones.service';
import { RecordatoriosService } from './recordatorios.service';

const toby: Mascota = {
  id: 'toby',
  nombre: 'Toby',
  especie: 'perro',
  raza: 'Criollo',
  sexo: 'macho',
  fechaNacimiento: '2023-01-10',
};

/** MascotasService en memoria, sin Preferences. */
class DatosFalsos {
  readonly mascotas = signal<Mascota[]>([toby]);
  readonly eventos = signal<EventoSalud[]>([]);

  obtenerMascota(id: string): Mascota | undefined {
    return this.mascotas().find((m) => m.id === id);
  }

  readonly actualizarEvento = vi.fn(async (id: string, cambios: Partial<DatosEvento>) => {
    const editado = { ...this.eventos().find((e) => e.id === id)!, ...cambios, id };
    this.eventos.update((lista) => lista.map((e) => (e.id === id ? editado : e)));
    return editado;
  });
}

function evento(id: string, recordatorio: EventoSalud['recordatorio']): EventoSalud {
  return { id, mascotaId: 'toby', tipo: 'desparasitacion', fecha: '2026-08-10', notas: 'Pipeta', recordatorio };
}

describe('RecordatoriosService (RF06)', () => {
  let servicio: RecordatoriosService;
  let datos: DatosFalsos;
  let notificaciones: { cancelar: ReturnType<typeof vi.fn>; programarRecordatorio: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 22, 10, 0)); // 22 de noviembre de 2026

    datos = new DatosFalsos();
    notificaciones = {
      cancelar: vi.fn(async () => undefined),
      programarRecordatorio: vi.fn(async () => 4321),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: MascotasService, useValue: datos },
        { provide: NotificacionesService, useValue: notificaciones },
      ],
    });
    servicio = TestBed.inject(RecordatoriosService);
  });

  afterEach(() => vi.useRealTimers());

  describe('calcularProximaFecha', () => {
    it('deja igual una fecha futura', () => {
      expect(servicio.calcularProximaFecha('2026-12-01', 3)).toBe('2026-12-01');
    });

    it('sin repetición y en el pasado no hay recordatorio', () => {
      expect(servicio.calcularProximaFecha('2026-11-01')).toBeUndefined();
    });

    it('salta las repeticiones que ya pasaron', () => {
      expect(servicio.calcularProximaFecha('2026-01-15', 3)).toBe('2027-01-15');
    });

    it('hoy no cuenta como futuro: pasa a la siguiente repetición', () => {
      expect(servicio.calcularProximaFecha('2026-11-22', 1)).toBe('2026-12-22');
    });

    it('respeta el último día del mes', () => {
      expect(servicio.calcularProximaFecha('2026-08-31', 3)).toBe('2026-11-30');
    });
  });

  describe('reprogramarRecurrentes', () => {
    it('mueve una desparasitación cada 3 meses vencida a la siguiente repetición y programa su aviso', async () => {
      datos.eventos.set([evento('e1', { fecha: '2026-11-10', repetirCadaMeses: 3, notificacionId: 99 })]);

      const cantidad = await servicio.reprogramarRecurrentes();

      expect(cantidad).toBe(1);
      expect(notificaciones.cancelar).toHaveBeenCalledWith([99]);
      expect(notificaciones.programarRecordatorio).toHaveBeenCalledTimes(1);
      expect(datos.eventos()[0].recordatorio).toEqual({
        fecha: '2027-02-10',
        repetirCadaMeses: 3,
        notificacionId: 4321,
      });
      // El evento original sigue en el historial con su fecha.
      expect(datos.eventos()[0].fecha).toBe('2026-08-10');
    });

    it('si la notificación no se pudo programar, guarda la nueva fecha sin notificacionId', async () => {
      notificaciones.programarRecordatorio.mockResolvedValue(undefined);
      datos.eventos.set([evento('e1', { fecha: '2026-10-01', repetirCadaMeses: 1, notificacionId: 7 })]);

      await servicio.reprogramarRecurrentes();

      expect(datos.eventos()[0].recordatorio).toEqual({ fecha: '2026-12-01', repetirCadaMeses: 1 });
    });

    it('no toca recordatorios únicos, de hoy ni futuros', async () => {
      datos.eventos.set([
        evento('unico', { fecha: '2026-11-01' }),
        evento('hoy', { fecha: '2026-11-22', repetirCadaMeses: 3 }),
        evento('futuro', { fecha: '2027-01-05', repetirCadaMeses: 12, notificacionId: 3 }),
        evento('sin', undefined),
      ]);

      expect(await servicio.reprogramarRecurrentes()).toBe(0);
      expect(datos.actualizarEvento).not.toHaveBeenCalled();
      expect(notificaciones.programarRecordatorio).not.toHaveBeenCalled();
    });

    it('el recordatorio reprogramado aparece en los próximos', async () => {
      datos.eventos.set([evento('e1', { fecha: '2026-11-10', repetirCadaMeses: 3 })]);
      expect(servicio.proximos()).toHaveLength(0);

      await servicio.reprogramarRecurrentes();

      expect(servicio.proximos().map((r) => r.fecha)).toEqual(['2027-02-10']);
    });

    it('si se llama dos veces a la vez, reprograma una sola vez', async () => {
      datos.eventos.set([evento('e1', { fecha: '2026-11-10', repetirCadaMeses: 3 })]);

      const [a, b] = await Promise.all([servicio.reprogramarRecurrentes(), servicio.reprogramarRecurrentes()]);

      expect(a).toBe(1);
      expect(b).toBe(1);
      expect(notificaciones.programarRecordatorio).toHaveBeenCalledTimes(1);
    });

    it('un error en un evento no impide reprogramar los demás', async () => {
      notificaciones.programarRecordatorio.mockRejectedValueOnce(new Error('falló')).mockResolvedValue(5);
      datos.eventos.set([
        evento('e1', { fecha: '2026-11-10', repetirCadaMeses: 3 }),
        evento('e2', { fecha: '2026-11-01', repetirCadaMeses: 6 }),
      ]);

      await servicio.reprogramarRecurrentes();

      expect(datos.eventos().map((e) => e.recordatorio?.fecha)).toEqual(['2027-02-10', '2027-05-01']);
    });
  });

  describe('avisos pendientes (RF07)', () => {
    it('programa el aviso de los recordatorios futuros que no lo tienen', async () => {
      datos.eventos.set([
        evento('sinAviso', { fecha: '2026-12-05' }),
        evento('conAviso', { fecha: '2026-12-06', notificacionId: 8 }),
        evento('pasado', { fecha: '2026-11-01' }),
      ]);

      await servicio.reprogramarRecurrentes();

      expect(notificaciones.programarRecordatorio).toHaveBeenCalledTimes(1);
      expect(datos.eventos()[0].recordatorio).toEqual({ fecha: '2026-12-05', notificacionId: 4321 });
      expect(datos.eventos()[1].recordatorio?.notificacionId).toBe(8);
    });

    it('sin permiso deja el recordatorio como estaba', async () => {
      notificaciones.programarRecordatorio.mockResolvedValue(undefined);
      datos.eventos.set([evento('sinAviso', { fecha: '2026-12-05' })]);

      await servicio.reprogramarRecurrentes();

      expect(datos.actualizarEvento).not.toHaveBeenCalled();
    });
  });
});
