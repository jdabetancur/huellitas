/** Id corto y único para mascotas, eventos y archivos. */
export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Id numérico (entero de 32 bits positivo) que exige LocalNotifications. */
export function nuevoIdNotificacion(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}
