/**
 * Plantillas del calendario precargado (RF05). Son orientativas: la app recuerda al usuario
 * verificarlas con su veterinario.
 *
 * - Cachorros: `edadSemanas` es la edad a la que corresponde el evento; la fecha se calcula
 *   desde la fecha de nacimiento.
 * - Adultos: `diasDesdeRegistro` ubica el primer evento a partir de hoy (no depende de la edad).
 * - `repetirCadaMeses`: el evento se vuelve un recordatorio recurrente (RF06).
 */
export interface PlantillaEvento {
  nombre: string;
  tipo: 'vacuna' | 'desparasitacion';
  /** Texto de referencia que se muestra en la propuesta. */
  edad: string;
  descripcion: string;
  edadSemanas?: number;
  diasDesdeRegistro?: number;
  repetirCadaMeses?: number;
}

export const plantillasCalendario = {
  perro: {
    cachorro: [
      {
        nombre: 'Primera vacuna (puppy)',
        tipo: 'vacuna',
        edad: '6 semanas',
        edadSemanas: 6,
        descripcion: 'Inicio del esquema de vacunación.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Desde las 8 semanas, cada 3 meses',
        edadSemanas: 8,
        repetirCadaMeses: 3,
        descripcion: 'Control de parásitos internos.',
      },
      {
        nombre: 'Vacuna múltiple',
        tipo: 'vacuna',
        edad: '9 semanas',
        edadSemanas: 9,
        descripcion: 'Continuación del esquema de vacunación.',
      },
      {
        nombre: 'Refuerzo de vacuna múltiple',
        tipo: 'vacuna',
        edad: '12 semanas',
        edadSemanas: 12,
        descripcion: 'Refuerzo del esquema de vacunación.',
      },
      {
        nombre: 'Vacuna antirrábica',
        tipo: 'vacuna',
        edad: 'Desde las 16 semanas, cada año',
        edadSemanas: 16,
        repetirCadaMeses: 12,
        descripcion: 'Aplicación según indicación veterinaria.',
      },
    ],
    adulto: [
      {
        nombre: 'Refuerzo anual de vacunas',
        tipo: 'vacuna',
        edad: 'Adulto, cada año',
        diasDesdeRegistro: 30,
        repetirCadaMeses: 12,
        descripcion: 'Ajusta la fecha según el carné de vacunación.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Adulto, cada 3 meses',
        diasDesdeRegistro: 14,
        repetirCadaMeses: 3,
        descripcion: 'Según valoración y riesgo del animal.',
      },
    ],
  },
  gato: {
    cachorro: [
      {
        nombre: 'Primera vacuna triple felina',
        tipo: 'vacuna',
        edad: '8 semanas',
        edadSemanas: 8,
        descripcion: 'Inicio del esquema de vacunación.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Desde las 8 semanas, cada 3 meses',
        edadSemanas: 8,
        repetirCadaMeses: 3,
        descripcion: 'Control de parásitos internos.',
      },
      {
        nombre: 'Refuerzo triple felina',
        tipo: 'vacuna',
        edad: '12 semanas',
        edadSemanas: 12,
        descripcion: 'Continuación del esquema de vacunación.',
      },
      {
        nombre: 'Vacuna antirrábica',
        tipo: 'vacuna',
        edad: 'Desde las 16 semanas, cada año',
        edadSemanas: 16,
        repetirCadaMeses: 12,
        descripcion: 'Aplicación según recomendación veterinaria.',
      },
    ],
    adulto: [
      {
        nombre: 'Refuerzo anual de vacunas',
        tipo: 'vacuna',
        edad: 'Adulto, cada año',
        diasDesdeRegistro: 30,
        repetirCadaMeses: 12,
        descripcion: 'Ajusta la fecha según el carné de vacunación.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Adulto, cada 3 meses',
        diasDesdeRegistro: 14,
        repetirCadaMeses: 3,
        descripcion: 'Según valoración veterinaria.',
      },
    ],
  },
} satisfies Record<'perro' | 'gato', Record<'cachorro' | 'adulto', PlantillaEvento[]>>;
