import { Injectable, computed, inject } from '@angular/core';

import type { EventoSalud, Mascota } from '../models';
import { diasHasta, esFutura, hoyISO, sumarMeses } from '../utils/fechas';

import { MascotasService } from './mascotas.service';

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
 * Ya hay una versión básica de `proximos` para que P1, P2 y P5 muestren datos reales.
 */
@Injectable({ providedIn: 'root' })
export class RecordatoriosService {
  private readonly datos = inject(MascotasService);

  /**
   * Recordatorios desde hoy en adelante, del más cercano al más lejano.
   * TODO(RF08): completar la vista única de próximos recordatorios:
   * - Incluir las próximas repeticiones de los recurrentes (no solo la fecha guardada).
   * - Mostrar los vencidos (fecha pasada y sin marcar como hechos) y permitir marcarlos como hechos.
   * - Incluir las jornadas de vacunación cuando exista RF09 (Entrega 3).
   */
  readonly proximos = computed<ProximoRecordatorio[]>(() => {
    const hoy = hoyISO();
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

  proximoDe(mascotaId: string): ProximoRecordatorio | undefined {
    return this.proximos().find((r) => r.mascota.id === mascotaId);
  }

  /**
   * Fecha del recordatorio de un evento:
   * - Si el evento es a futuro, el recordatorio es ese mismo día.
   * - Si ya pasó y se repite, la siguiente repetición después de hoy.
   * - Si ya pasó y no se repite, no hay recordatorio (undefined).
   * TODO(RF06): usar esta función también para reprogramar la siguiente repetición cuando se cumple la fecha
   * (ver NotificacionesService.reprogramarRecurrentes).
   */
  calcularProximaFecha(fecha: string, repetirCadaMeses?: number): string | undefined {
    if (esFutura(fecha)) return fecha;
    if (!repetirCadaMeses) return undefined;
    let siguiente = sumarMeses(fecha, repetirCadaMeses);
    while (!esFutura(siguiente)) siguiente = sumarMeses(siguiente, repetirCadaMeses);
    return siguiente;
  }
}
