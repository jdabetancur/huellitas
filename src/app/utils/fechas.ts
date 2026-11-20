/**
 * Utilidades de fechas. Todas las fechas de la app se guardan como 'YYYY-MM-DD' en hora local,
 * para evitar los corrimientos de un día que produce convertir a UTC.
 */

export function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hoyISO(): string {
  return aISO(new Date());
}

/** Convierte 'YYYY-MM-DD' a un Date local a medianoche. */
export function desdeISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function esFutura(iso: string): boolean {
  return iso.slice(0, 10) > hoyISO();
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = desdeISO(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aISO(fecha);
}

/** Suma meses respetando el último día del mes (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(iso: string, meses: number): string {
  const fecha = desdeISO(iso);
  const dia = fecha.getDate();
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + meses);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  fecha.setDate(Math.min(dia, ultimoDia));
  return aISO(fecha);
}

/** Días desde hoy hasta la fecha (negativo si ya pasó). */
export function diasHasta(iso: string): number {
  const ms = desdeISO(iso).getTime() - desdeISO(hoyISO()).getTime();
  return Math.round(ms / 86_400_000);
}

export function mesesDeEdad(fechaNacimiento: string, referencia = hoyISO()): number {
  const nac = desdeISO(fechaNacimiento);
  const ref = desdeISO(referencia);
  let meses = (ref.getFullYear() - nac.getFullYear()) * 12 + (ref.getMonth() - nac.getMonth());
  if (ref.getDate() < nac.getDate()) meses--;
  return Math.max(0, meses);
}

/** Cachorro: menos de 12 meses (RF05 usa esta regla para proponer el calendario). */
export function esCachorro(fechaNacimiento: string): boolean {
  return mesesDeEdad(fechaNacimiento) < 12;
}

export function edadTexto(fechaNacimiento: string): string {
  const meses = mesesDeEdad(fechaNacimiento);
  if (meses < 1) return 'Menos de 1 mes';
  if (meses < 12) return meses === 1 ? '1 mes' : `${meses} meses`;
  const anios = Math.floor(meses / 12);
  return anios === 1 ? '1 año' : `${anios} años`;
}

/** "Hoy", "Mañana", "En 5 días", "Hace 3 días". */
export function cuandoTexto(iso: string): string {
  const dias = diasHasta(iso);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
}
