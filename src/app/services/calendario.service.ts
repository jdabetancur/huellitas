import { Injectable } from '@angular/core';

import type { Mascota, TipoEvento } from '../models';
import { esCachorro, hoyISO, sumarDias } from '../utils/fechas';

import { plantillasCalendario, type PlantillaEvento } from './plantillas-calendario';

export interface EventoPropuesto {
  tipo: Extract<TipoEvento, 'vacuna' | 'desparasitacion'>;
  nombre: string;
  origenPlantilla: string;
  fecha: string;
  repetirCadaMeses?: number;
  incluir: boolean;
  edad?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  async proponer(mascota: Mascota): Promise<EventoPropuesto[]> {
    if (mascota.especie === 'otro') {
      return [];
    }

    const etapa = esCachorro(mascota.fechaNacimiento) ? 'cachorro' : 'adulto';

    const plantilla: PlantillaEvento[] = plantillasCalendario[mascota.especie][etapa];
    const origenPlantilla = `${mascota.especie}.${etapa}`;

    const fechaBase = hoyISO();

    return plantilla.map((evento: PlantillaEvento) => ({
      tipo: evento.tipo,
      origenPlantilla,
      nombre: evento.nombre,
      fecha: sumarDias(fechaBase, evento.diasDesdeRegistro),
      incluir: true,
      edad: evento.edad,
      notas: evento.descripcion,
    }));
  }
}
