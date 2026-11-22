export interface PlantillaEvento {
  nombre: string;
  tipo: 'vacuna' | 'desparasitacion';
  edad: string;
  diasDesdeRegistro: number;
  descripcion: string;
}

export const plantillasCalendario = {
  perro: {
    cachorro: [
      {
        nombre: 'Primera vacuna (puppy)',
        tipo: 'vacuna',
        edad: '6 semanas',
        diasDesdeRegistro: 0,
        descripcion: 'Inicio del esquema de vacunación.',
      },
      {
        nombre: 'Vacuna múltiple',
        tipo: 'vacuna',
        edad: '8 semanas',
        diasDesdeRegistro: 14,
        descripcion: 'Continuación del esquema de vacunación.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Según valoración veterinaria',
        diasDesdeRegistro: 21,
        descripcion: 'Control de parásitos internos.',
      },
      {
        nombre: 'Refuerzo de vacuna múltiple',
        tipo: 'vacuna',
        edad: '12 semanas',
        diasDesdeRegistro: 42,
        descripcion: 'Refuerzo del esquema de vacunación.',
      },
      {
        nombre: 'Vacuna antirrábica',
        tipo: 'vacuna',
        edad: 'Desde las 12 semanas',
        diasDesdeRegistro: 56,
        descripcion: 'Aplicación según indicación veterinaria.',
      },
    ],
    adulto: [
      {
        nombre: 'Revisión del esquema de vacunación',
        tipo: 'vacuna',
        edad: 'Adulto',
        diasDesdeRegistro: 0,
        descripcion: 'Verificar vacunas pendientes y refuerzos.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Adulto',
        diasDesdeRegistro: 30,
        descripcion: 'Según valoración y riesgo del animal.',
      },
    ],
  },
  gato: {
    cachorro: [
      {
        nombre: 'Primera vacuna triple felina',
        tipo: 'vacuna',
        edad: '6-8 semanas',
        diasDesdeRegistro: 0,
        descripcion: 'Inicio del esquema de vacunación.',
      },
      {
        nombre: 'Refuerzo triple felina',
        tipo: 'vacuna',
        edad: '9-12 semanas',
        diasDesdeRegistro: 21,
        descripcion: 'Continuación del esquema de vacunación.',
      },
      {
        nombre: 'Vacuna antirrábica',
        tipo: 'vacuna',
        edad: 'Según edad e indicación veterinaria',
        diasDesdeRegistro: 42,
        descripcion: 'Aplicación según recomendación veterinaria.',
      },
    ],
    adulto: [
      {
        nombre: 'Revisión del esquema de vacunación',
        tipo: 'vacuna',
        edad: 'Adulto',
        diasDesdeRegistro: 0,
        descripcion: 'Verificar vacunas y refuerzos pendientes.',
      },
      {
        nombre: 'Desparasitación',
        tipo: 'desparasitacion',
        edad: 'Adulto',
        diasDesdeRegistro: 30,
        descripcion: 'Según valoración veterinaria.',
      },
    ],
  },
} satisfies Record<'perro' | 'gato', Record<'cachorro' | 'adulto', PlantillaEvento[]>>;
