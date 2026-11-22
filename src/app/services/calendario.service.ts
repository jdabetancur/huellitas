import { Injectable } from '@angular/core';

import type { Mascota, TipoEvento } from '../models';
import { esCachorro, esFutura, hoyISO, sumarDias, sumarMeses } from '../utils/fechas';

import type { PlantillaEvento } from './plantillas-calendario';
import { plantillasCalendario } from './plantillas-calendario';

/** Evento sugerido por el calendario precargado, antes de que el usuario lo acepte. */
export interface EventoPropuesto {
  tipo: Extract<TipoEvento, 'vacuna' | 'desparasitacion'>;
  nombre: string;
  /** Plantilla de la que viene, p. ej. 'perro.cachorro'. Se guarda en EventoSalud.origenPlantilla. */
  origenPlantilla: string;
  /** Fecha sugerida ('YYYY-MM-DD'), siempre posterior a hoy. */
  fecha: string;
  repetirCadaMeses?: number;
  /** El usuario puede desmarcarlo antes de guardar. */
  incluir: boolean;
  edad?: string;
  notas?: string;
}

/** Calendario precargado de vacunas y desparasitaciones según especie y edad (RF05). */
@Injectable({ providedIn: 'root' })
export class CalendarioService {
  /** Plantilla que corresponde a la mascota hoy, p. ej. 'perro.cachorro'; undefined para 'otro'. */
  origenDe(mascota: Pick<Mascota, 'especie' | 'fechaNacimiento'>): string | undefined {
    if (mascota.especie === 'otro') return undefined;
    return `${mascota.especie}.${esCachorro(mascota.fechaNacimiento) ? 'cachorro' : 'adulto'}`;
  }

  async proponer(mascota: Mascota): Promise<EventoPropuesto[]> {
    if (mascota.especie === 'otro') return [];

    const etapa = esCachorro(mascota.fechaNacimiento) ? 'cachorro' : 'adulto';
    const plantilla: PlantillaEvento[] = plantillasCalendario[mascota.especie][etapa];
    const origenPlantilla = `${mascota.especie}.${etapa}`;

    const propuestas: EventoPropuesto[] = [];
    for (const evento of plantilla) {
      const fecha = this.fechaSugerida(evento, mascota.fechaNacimiento);
      // Las dosis únicas que ya pasaron según la edad no se proponen.
      if (!fecha) continue;
      propuestas.push({
        tipo: evento.tipo,
        nombre: evento.nombre,
        origenPlantilla,
        fecha,
        repetirCadaMeses: evento.repetirCadaMeses,
        incluir: true,
        edad: evento.edad,
        notas: evento.descripcion,
      });
    }
    return propuestas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Fecha del evento: desde el nacimiento (cachorros) o desde hoy (adultos).
   * Si ya pasó, los recurrentes saltan a su próxima repetición y las dosis únicas se omiten.
   * Nunca devuelve hoy, para que el aviso del día anterior (RF07) se pueda programar.
   */
  private fechaSugerida(evento: PlantillaEvento, fechaNacimiento: string): string | undefined {
    let fecha =
      evento.edadSemanas !== undefined
        ? sumarDias(fechaNacimiento, evento.edadSemanas * 7)
        : sumarDias(hoyISO(), evento.diasDesdeRegistro ?? 0);
    if (esFutura(fecha)) return fecha;
    if (!evento.repetirCadaMeses) return undefined;
    while (!esFutura(fecha)) fecha = sumarMeses(fecha, evento.repetirCadaMeses);
    return fecha;
  }
}
