import type { EventoSalud, Mascota } from '../models';
import { hoyISO, sumarDias, sumarMeses } from '../utils/fechas';

/**
 * Datos de ejemplo que se cargan solo la primera vez que se abre la app.
 * Las fechas son relativas a hoy para que siempre haya recordatorios próximos que mostrar.
 * Estos recordatorios no tienen notificación programada (no tienen notificacionId).
 */
export function crearDatosEjemplo(): { mascotas: Mascota[]; eventos: EventoSalud[] } {
  const hoy = hoyISO();
  const hace = (meses: number, dias = 0): string => sumarDias(sumarMeses(hoy, -meses), -dias);

  const mascotas: Mascota[] = [
    { id: 'ej-toby', nombre: 'Toby', especie: 'perro', raza: 'Criollo', sexo: 'macho', fechaNacimiento: hace(36, 20) },
    { id: 'ej-mishi', nombre: 'Mishi', especie: 'gato', raza: 'Siamés', sexo: 'hembra', fechaNacimiento: hace(24, 5) },
    { id: 'ej-lola', nombre: 'Lola', especie: 'perro', raza: 'Beagle', sexo: 'hembra', fechaNacimiento: hace(5, 3) },
  ];

  const eventos: EventoSalud[] = [
    // Toby
    {
      id: 'ej-e1',
      mascotaId: 'ej-toby',
      tipo: 'vacuna',
      fecha: sumarDias(hace(12), 4),
      notas: 'Antirrábica',
      recordatorio: { fecha: sumarDias(hoy, 4), repetirCadaMeses: 12 },
    },
    { id: 'ej-e2', mascotaId: 'ej-toby', tipo: 'peso', fecha: hace(4), pesoKg: 11.8 },
    { id: 'ej-e3', mascotaId: 'ej-toby', tipo: 'peso', fecha: hace(1), pesoKg: 12.4 },
    { id: 'ej-e4', mascotaId: 'ej-toby', tipo: 'desparasitacion', fecha: hace(2), notas: 'Antiparasitario interno' },
    { id: 'ej-e5', mascotaId: 'ej-toby', tipo: 'cita', fecha: hace(1, 10), notas: 'Control general' },
    // Mishi
    {
      id: 'ej-e6',
      mascotaId: 'ej-mishi',
      tipo: 'desparasitacion',
      fecha: sumarDias(hace(3), 15),
      notas: 'Pipeta',
      recordatorio: { fecha: sumarDias(hoy, 15), repetirCadaMeses: 3 },
    },
    { id: 'ej-e7', mascotaId: 'ej-mishi', tipo: 'vacuna', fecha: hace(6), notas: 'Triple felina' },
    { id: 'ej-e8', mascotaId: 'ej-mishi', tipo: 'peso', fecha: hace(2), pesoKg: 4.1 },
    // Lola (cachorra)
    { id: 'ej-e9', mascotaId: 'ej-lola', tipo: 'vacuna', fecha: hace(2), notas: 'Puppy (primera dosis)' },
    { id: 'ej-e10', mascotaId: 'ej-lola', tipo: 'peso', fecha: hace(0, 20), pesoKg: 6.3 },
    {
      id: 'ej-e11',
      mascotaId: 'ej-lola',
      tipo: 'cita',
      fecha: sumarDias(hoy, 20),
      notas: 'Refuerzo de vacunas',
      recordatorio: { fecha: sumarDias(hoy, 20) },
    },
  ];

  return { mascotas, eventos };
}
