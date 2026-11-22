import { Injectable, computed, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { EventoSalud, Mascota, Recordatorio } from '../models';
import { diasHasta, esFutura, hoyISO, sumarMeses } from '../utils/fechas';

import { MascotasService } from './mascotas.service';
import { NotificacionesService } from './notificaciones.service';

export interface ProximoRecordatorio {
  evento: EventoSalud;
  mascota: Mascota;
  /** Fecha del recordatorio ('YYYY-MM-DD'). */
  fecha: string;
  /** Días que faltan (0 = hoy). */
  dias: number;
}

/**
 * Recordatorios de todas las mascotas (RF06, RF08).
 *
 * RF06 · Recordatorios únicos o recurrentes:
 * - Único: `recordatorio` sin `repetirCadaMeses`. Vence una sola vez en `recordatorio.fecha`.
 * - Recurrente: `recordatorio.repetirCadaMeses` (1, 3, 6 o 12). Cuando su fecha ya pasó,
 *   `reprogramarRecurrentes()` lo mueve a la siguiente repetición futura y programa su notificación.
 *   Se ejecuta al abrir la app, al volver a ella (`resume`) y al recibir una notificación.
 *   El evento original se queda en el historial con su fecha; solo avanza el recordatorio.
 */
@Injectable({ providedIn: 'root' })
export class RecordatoriosService {
  private readonly datos = inject(MascotasService);
  private readonly notificaciones = inject(NotificacionesService);

  /** Día actual como signal, para que `proximos` se recalcule si la app sigue abierta al cambiar el día. */
  private readonly hoy = signal(hoyISO());
  private iniciado = false;
  private enCurso?: Promise<number>;

  /**
   * Recordatorios desde hoy en adelante, del más cercano al más lejano.
   * TODO(RF08): completar la vista única de próximos recordatorios:
   * - Incluir las próximas repeticiones de los recurrentes (no solo la fecha guardada).
   * - Mostrar los vencidos (fecha pasada y sin marcar como hechos) y permitir marcarlos como hechos.
   * - Incluir las jornadas de vacunación cuando exista RF09 (Entrega 3).
   */
  readonly proximos = computed<ProximoRecordatorio[]>(() => {
    const hoy = this.hoy();
    const mascotas = new Map(this.datos.mascotas().map((m) => [m.id, m]));
    return this.datos
      .eventos()
      .filter((e) => e.recordatorio && e.recordatorio.fecha >= hoy && mascotas.has(e.mascotaId))
      .map((evento) => {
        const fecha = evento.recordatorio!.fecha;
        return { evento, mascota: mascotas.get(evento.mascotaId)!, fecha, dias: diasHasta(fecha) };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  });

  /**
   * Se llama una vez al abrir la app, después de cargar los datos (ver main.ts).
   * Reprograma los recurrentes vencidos y vuelve a hacerlo cuando la app regresa al frente
   * o llega una notificación, para no depender de que el usuario cierre y abra la app.
   */
  async iniciar(): Promise<void> {
    if (this.iniciado) return;
    this.iniciado = true;
    try {
      await App.addListener('resume', () => void this.reprogramarRecurrentes());
      await LocalNotifications.addListener('localNotificationReceived', () => void this.reprogramarRecurrentes());
    } catch (error) {
      console.warn('[RF06] No se pudieron registrar los listeners', error);
    }
    await this.reprogramarRecurrentes();
  }

  proximoDe(mascotaId: string): ProximoRecordatorio | undefined {
    return this.proximos().find((r) => r.mascota.id === mascotaId);
  }

  /**
   * Fecha del recordatorio de un evento:
   * - Si el evento es a futuro, el recordatorio es ese mismo día.
   * - Si ya pasó y se repite, la siguiente repetición después de hoy.
   * - Si ya pasó y no se repite, no hay recordatorio (undefined).
   * La usan P3 (al guardar el evento) y `reprogramarRecurrentes` (cuando se cumple la fecha).
   */
  calcularProximaFecha(fecha: string, repetirCadaMeses?: number): string | undefined {
    if (esFutura(fecha)) return fecha;
    if (!repetirCadaMeses) return undefined;
    let siguiente = sumarMeses(fecha, repetirCadaMeses);
    while (!esFutura(siguiente)) siguiente = sumarMeses(siguiente, repetirCadaMeses);
    return siguiente;
  }

  /**
   * RF06 (caso de prueba 6): mueve cada recordatorio recurrente cuya fecha ya pasó (antes de hoy) a su
   * siguiente repetición futura, cancela la notificación anterior y programa la nueva (RF07).
   * Los recordatorios de hoy se dejan como están (se muestran como «Hoy»); los únicos vencidos no se tocan.
   * Además programa el aviso de los recordatorios futuros que no lo tienen (ver `programarSinAviso`).
   * Si se llama varias veces a la vez, todas esperan la misma ejecución. Devuelve cuántos se reprogramaron.
   */
  reprogramarRecurrentes(): Promise<number> {
    this.enCurso ??= this.reprogramar().finally(() => (this.enCurso = undefined));
    return this.enCurso;
  }

  private async reprogramar(): Promise<number> {
    const hoy = hoyISO();
    this.hoy.set(hoy);

    const vencidos = this.datos
      .eventos()
      .filter((e) => !!e.recordatorio?.repetirCadaMeses && e.recordatorio.fecha < hoy);

    let reprogramados = 0;
    const procesados = new Set<string>();
    for (const evento of vencidos) {
      procesados.add(evento.id);
      try {
        const anterior = evento.recordatorio!;
        const fecha = this.calcularProximaFecha(anterior.fecha, anterior.repetirCadaMeses);
        if (!fecha) continue;

        await this.notificaciones.cancelar([anterior.notificacionId]);
        const recordatorio: Recordatorio = { fecha, repetirCadaMeses: anterior.repetirCadaMeses };
        const actualizado = await this.datos.actualizarEvento(evento.id, { recordatorio });
        reprogramados++;

        const mascota = this.datos.obtenerMascota(evento.mascotaId);
        if (!mascota) continue;
        const notificacionId = await this.notificaciones.programarRecordatorio(actualizado, mascota);
        if (notificacionId !== undefined) {
          await this.datos.actualizarEvento(evento.id, { recordatorio: { ...recordatorio, notificacionId } });
        }
      } catch (error) {
        // Un evento con problemas no debe impedir reprogramar los demás.
        console.warn('[RF06] No se pudo reprogramar el recordatorio', evento.id, error);
      }
    }
    await this.programarSinAviso(hoy, procesados);
    return reprogramados;
  }

  /**
   * RF07: recordatorios futuros que aún no tienen notificación (datos de ejemplo, eventos guardados sin
   * permiso o antes de RF07). Si el permiso ya está concedido, se les programa el aviso del día anterior.
   */
  private async programarSinAviso(hoy: string, excluir: Set<string>): Promise<void> {
    const pendientes = this.datos
      .eventos()
      .filter(
        (e) =>
          !excluir.has(e.id) &&
          !!e.recordatorio &&
          e.recordatorio.fecha > hoy &&
          e.recordatorio.notificacionId === undefined,
      );
    for (const evento of pendientes) {
      const mascota = this.datos.obtenerMascota(evento.mascotaId);
      if (!mascota) continue;
      try {
        const notificacionId = await this.notificaciones.programarRecordatorio(evento, mascota);
        if (notificacionId === undefined) continue;
        await this.datos.actualizarEvento(evento.id, { recordatorio: { ...evento.recordatorio!, notificacionId } });
      } catch (error) {
        console.warn('[RF07] No se pudo programar el aviso', evento.id, error);
      }
    }
  }
}
