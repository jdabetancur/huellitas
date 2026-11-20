import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { EventoSalud, Mascota } from '../models';
import { nuevoIdNotificacion } from '../utils/ids';

export const CANAL_RECORDATORIOS = 'recordatorios';

export interface NotificacionAProgramar {
  id?: number;
  titulo: string;
  cuerpo: string;
  fecha: Date;
  mascotaId: string;
  eventoId?: string;
}

export interface ResultadoPrueba {
  permiso: boolean;
  /** false si Android no permite alarmas exactas: la notificación puede llegar unos minutos tarde. */
  alarmaExacta: boolean;
  fecha?: Date;
}

/**
 * Notificaciones locales (RF07). Las programa el propio celular: no hay servidor ni internet (RNF02, RNF06).
 * Ya funciona: permiso, canal de Android, programar, cancelar, prueba a 2 minutos y abrir el perfil al tocar.
 * Sobrevive al reinicio: el plugin registra un BroadcastReceiver de BOOT_COMPLETED que reprograma las pendientes.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly router = inject(Router);
  private iniciado = false;

  /** Se llama una vez al abrir la app (ver app.config). */
  async iniciar(): Promise<void> {
    if (this.iniciado) return;
    this.iniciado = true;
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: CANAL_RECORDATORIOS,
        name: 'Recordatorios de salud',
        description: 'Vacunas, desparasitaciones y citas de tus mascotas',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    }
    // Al tocar una notificación se abre el perfil de la mascota (también si la app estaba cerrada:
    // el plugin guarda el evento hasta que este listener se registra).
    await LocalNotifications.addListener('localNotificationActionPerformed', (accion) => {
      const mascotaId = accion.notification.extra?.mascotaId as string | undefined;
      if (mascotaId) void this.router.navigateByUrl(`/mascota/${mascotaId}`);
    });
  }

  /**
   * Pide el permiso de notificaciones si hace falta (Android 13+ muestra el diálogo del sistema).
   * Devuelve true si quedó concedido.
   */
  async asegurarPermiso(): Promise<boolean> {
    try {
      let estado = await LocalNotifications.checkPermissions();
      if (estado.display === 'prompt' || estado.display === 'prompt-with-rationale') {
        estado = await LocalNotifications.requestPermissions();
      }
      return estado.display === 'granted';
    } catch (error) {
      console.warn('[Notificaciones] No se pudo pedir el permiso', error);
      return false;
    }
  }

  /** Android 12+ puede negar las alarmas exactas; sin ellas la notificación puede retrasarse. */
  async alarmaExactaPermitida(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return true;
    try {
      const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
      return exact_alarm === 'granted';
    } catch {
      return true;
    }
  }

  /** Abre el ajuste de Android "Alarmas y recordatorios" para esta app. */
  async abrirAjusteAlarmaExacta(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    await LocalNotifications.changeExactNotificationSetting();
  }

  /** Programa una notificación local y devuelve su id. */
  async programar(n: NotificacionAProgramar): Promise<number> {
    const id = n.id ?? nuevoIdNotificacion();
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: n.titulo,
          body: n.cuerpo,
          channelId: CANAL_RECORDATORIOS,
          schedule: { at: n.fecha, allowWhileIdle: true },
          extra: { mascotaId: n.mascotaId, eventoId: n.eventoId },
        },
      ],
    });
    return id;
  }

  async cancelar(ids: (number | undefined)[]): Promise<void> {
    const validos = ids.filter((id): id is number => typeof id === 'number');
    if (!validos.length) return;
    try {
      await LocalNotifications.cancel({ notifications: validos.map((id) => ({ id })) });
    } catch (error) {
      console.warn('[Notificaciones] No se pudieron cancelar', validos, error);
    }
  }

  /** Solo para desarrollo: notificación de prueba a 2 minutos con el mascotaId en `extra`. */
  async probar(mascota: Mascota): Promise<ResultadoPrueba> {
    const permiso = await this.asegurarPermiso();
    if (!permiso) return { permiso, alarmaExacta: false };
    const alarmaExacta = await this.alarmaExactaPermitida();
    const fecha = new Date(Date.now() + 2 * 60 * 1000);
    await this.programar({
      titulo: `Prueba de Huellitas: ${mascota.nombre}`,
      cuerpo: 'Si ves esto, las notificaciones funcionan. Tócala para abrir el perfil.',
      fecha,
      mascotaId: mascota.id,
    });
    return { permiso, alarmaExacta, fecha };
  }

  /**
   * TODO(RF07): programar la notificación del recordatorio de un evento.
   * - Fecha: el día anterior a `evento.recordatorio.fecha`, a las 9:00 a. m. (caso de prueba 2).
   *   Si esa hora ya pasó (p. ej. el recordatorio es mañana y ya son las 10 a. m.), decidir qué hacer y documentarlo.
   * - Texto sugerido: "Mañana: Vacuna de Toby" / cuerpo con las notas del evento.
   * - Llamar a `programar()` con `mascotaId` y `eventoId` en extra, y devolver el id para guardarlo en
   *   `evento.recordatorio.notificacionId` (NuevoEventoPage ya lo guarda si se devuelve un número).
   * - Al editar o eliminar el evento hay que cancelar la notificación (MascotasService ya llama a `cancelar()`).
   * - Si `alarmaExactaPermitida()` es false, avisar al usuario y ofrecer `abrirAjusteAlarmaExacta()`.
   */
  async programarRecordatorio(evento: EventoSalud, mascota: Mascota): Promise<number | undefined> {
    console.warn('[Notificaciones] TODO(RF07) programarRecordatorio', evento.id, mascota.nombre);
    return undefined;
  }

  /**
   * TODO(RF06): reprogramar los recordatorios recurrentes (caso de prueba 6).
   * Llamarlo al abrir la app y al recibir una notificación ('localNotificationReceived'): para cada evento
   * con `recordatorio.repetirCadaMeses` cuya fecha ya se cumplió, calcular la siguiente con
   * `RecordatoriosService.calcularProximaFecha`, guardarla con `MascotasService.actualizarEvento` y
   * programar su notificación. Alternativa: dejar programadas desde el inicio las próximas N repeticiones.
   */
  async reprogramarRecurrentes(): Promise<void> {
    // Pendiente RF06.
  }
}
