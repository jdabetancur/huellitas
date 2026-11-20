import { Injectable } from '@angular/core';

import type { Mascota, TipoEvento } from '../models';

/** Evento sugerido por el calendario precargado, antes de que el usuario lo acepte. */
export interface EventoPropuesto {
  tipo: Extract<TipoEvento, 'vacuna' | 'desparasitacion'>;
  nombre: string;
  /** Fecha sugerida ('YYYY-MM-DD'). */
  fecha: string;
  repetirCadaMeses?: number;
  /** El usuario puede desmarcarlo antes de guardar. */
  incluir: boolean;
}

/**
 * Calendario precargado de vacunas y desparasitaciones (RF05).
 */
@Injectable({ providedIn: 'root' })
export class CalendarioService {
  /**
   * TODO(RF05): proponer el calendario según especie y edad.
   * - Usa `esCachorro(mascota.fechaNacimiento)` (utils/fechas) para distinguir cachorro (< 12 meses) y adulto.
   * - Define las plantillas de perro y gato (vacunas, refuerzos y desparasitaciones con su frecuencia) en un
   *   archivo de datos (p. ej. `services/plantillas-calendario.ts`); para 'otro' puede quedar vacío.
   * - MascotaFormPage (P4) ya llama a este método al crear una mascota: muestra las propuestas para que el
   *   usuario las ajuste (fecha, incluir o no) y guárdalas con `MascotasService.agregarEvento` con su `recordatorio`.
   */
  async proponer(mascota: Mascota): Promise<EventoPropuesto[]> {
    console.warn('[Calendario] TODO(RF05) proponer', mascota.nombre);
    return [];
  }
}
