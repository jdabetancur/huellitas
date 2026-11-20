export type TipoEvento = 'vacuna' | 'desparasitacion' | 'cita' | 'peso';

/**
 * Recordatorio asociado a un evento (RF06, RF07).
 * - `fecha`: día en que vence el recordatorio ('YYYY-MM-DD'), por ejemplo el refuerzo de una vacuna.
 * - `repetirCadaMeses`: si existe, el recordatorio es recurrente (p. ej. 3 = desparasitación cada 3 meses).
 * - `notificacionId`: id de la notificación local programada con NotificacionesService.
 */
export interface Recordatorio {
  fecha: string;
  repetirCadaMeses?: number;
  notificacionId?: number;
}

/** Evento de salud de una mascota (RF03). El control de peso (RF13) es un evento de tipo 'peso'. */
export interface EventoSalud {
  id: string;
  mascotaId: string;
  tipo: TipoEvento;
  /** Fecha en que ocurrió (o, para citas y eventos con recordatorio, en que ocurrirá) el evento. */
  fecha: string;
  notas?: string;
  /** Solo para tipo 'peso'. */
  pesoKg?: number;
  /** Ruta relativa de la foto del carné o fórmula en Directory.Data (RF10). */
  fotoCarneUrl?: string;
  recordatorio?: Recordatorio;
}

export interface InfoTipoEvento {
  etiqueta: string;
  icono: string;
  color: 'primary' | 'secondary' | 'tertiary' | 'medium';
}

export const TIPOS_EVENTO: Record<TipoEvento, InfoTipoEvento> = {
  vacuna: { etiqueta: 'Vacuna', icono: 'shield-checkmark-outline', color: 'primary' },
  desparasitacion: { etiqueta: 'Desparasitación', icono: 'medkit-outline', color: 'secondary' },
  cita: { etiqueta: 'Cita veterinaria', icono: 'pulse-outline', color: 'tertiary' },
  peso: { etiqueta: 'Control de peso', icono: 'barbell-outline', color: 'medium' },
};

export const ORDEN_TIPOS: TipoEvento[] = ['vacuna', 'desparasitacion', 'cita', 'peso'];

/** Opciones del selector "Repetir" (meses). 0 = no se repite. */
export const OPCIONES_REPETIR: { meses: number; etiqueta: string }[] = [
  { meses: 0, etiqueta: 'No se repite' },
  { meses: 1, etiqueta: 'Cada mes' },
  { meses: 3, etiqueta: 'Cada 3 meses' },
  { meses: 6, etiqueta: 'Cada 6 meses' },
  { meses: 12, etiqueta: 'Cada año' },
];

/** Título corto para listas: "Vacuna · Antirrábica". */
export function tituloEvento(evento: Pick<EventoSalud, 'tipo' | 'notas'>): string {
  const base = TIPOS_EVENTO[evento.tipo].etiqueta;
  const detalle = evento.notas?.split('\n')[0].trim();
  if (!detalle) return base;
  return `${base} · ${detalle.length > 40 ? detalle.slice(0, 40) + '…' : detalle}`;
}
