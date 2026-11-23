/** Id corto y único para mascotas, eventos y archivos. */
export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Id numérico (entero de 32 bits positivo) que exige LocalNotifications.
 * Siempre es par: el impar siguiente (id + 1) se reserva para el aviso de la siguiente repetición
 * de un recordatorio recurrente, así nunca choca con el id de otra notificación.
 */
export function nuevoIdNotificacion(): number {
  return (Math.floor(Math.random() * 1_000_000_000) + 1) * 2;
}
