import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { EventoSalud, Mascota } from '../models';
import { TIPOS_EVENTO } from '../models';
import { aISO, desdeISO, sumarDias } from '../utils/fechas';
import { nuevoIdNotificacion } from '../utils/ids';

import { AvisosService } from './avisos.service';

export const CANAL_RECORDATORIOS = 'recordatorios';

/** Hora del aviso del día anterior (RF07). */
export const HORA_AVISO = 9;

/**
 * Momento en que se avisa un recordatorio (RF07):
 * - El día anterior a `fechaRecordatorio` a las 9:00 a. m. (hora local).
 * - Si esa hora ya pasó pero el recordatorio sigue siendo mañana (p. ej. se guarda a las 10 a. m. un
 *   recordatorio para mañana), el aviso sale en 1 minuto: así el usuario igual recibe el aviso el día anterior.
 * - Si el recordatorio es hoy o ya pasó, no hay aviso (undefined).
 */
export function momentoAviso(fechaRecordatorio: string, ahora = new Date()): Date | undefined {
  if (fechaRecordatorio <= aISO(ahora)) return undefined;
  const aviso = desdeISO(sumarDias(fechaRecordatorio, -1));
  aviso.setHours(HORA_AVISO, 0, 0, 0);
  return aviso > ahora ? aviso : new Date(ahora.getTime() + 60_000);
}

/** Texto del aviso: «Mañana: Vacuna de Toby» y, en el cuerpo, la primera línea de las notas. */
export function textoAviso(
  evento: Pick<EventoSalud, 'tipo' | 'notas'>,
  mascota: Pick<Mascota, 'nombre'>,
): { titulo: string; cuerpo: string } {
  const detalle = evento.notas?.split('\n')[0].trim();
  const abrir = `Toca para ver el perfil de ${mascota.nombre}.`;
  return {
    titulo: `Mañana: ${TIPOS_EVENTO[evento.tipo].etiqueta} de ${mascota.nombre}`,
    cuerpo: detalle ? `${detalle}. ${abrir}` : abrir,
  };
}

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
 * Permiso, canal de Android, programar, cancelar, aviso del día anterior a las 9:00 a. m., prueba a 2 minutos
 * y abrir el perfil al tocar.
 * Sobrevive al reinicio: el plugin registra un BroadcastReceiver de BOOT_COMPLETED que reprograma las pendientes.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisosService);
  private iniciado = false;
  private avisoAlarmaMostrado = false;

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
   * RF07 (caso de prueba 2): programa la notificación del recordatorio de un evento para el día anterior
   * a las 9:00 a. m. (ver `momentoAviso`) y devuelve su id, que el llamador guarda en
   * `evento.recordatorio.notificacionId`.
   * No pide el permiso (eso lo hacen las pantallas, con contexto para el usuario): si no está concedido,
   * o el recordatorio ya no tiene aviso posible, devuelve undefined y el recordatorio se guarda sin aviso.
   * Al editar o eliminar el evento, P3 y MascotasService cancelan la notificación con `cancelar()`.
   */
  async programarRecordatorio(evento: EventoSalud, mascota: Mascota): Promise<number | undefined> {
    const fecha = evento.recordatorio?.fecha;
    if (!fecha) return undefined;
    const cuando = momentoAviso(fecha);
    if (!cuando) return undefined;
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') return undefined;
      const { titulo, cuerpo } = textoAviso(evento, mascota);
      return await this.programar({ titulo, cuerpo, fecha: cuando, mascotaId: mascota.id, eventoId: evento.id });
    } catch (error) {
      console.warn('[Notificaciones] No se pudo programar el recordatorio', evento.id, error);
      return undefined;
    }
  }

  /**
   * Si Android no permite alarmas exactas, explica que el aviso puede llegar tarde y ofrece abrir el ajuste.
   * Se muestra como mucho una vez por sesión, después de programar un recordatorio desde una pantalla.
   */
  async avisarSiAlarmaInexacta(): Promise<void> {
    if (this.avisoAlarmaMostrado || (await this.alarmaExactaPermitida())) return;
    this.avisoAlarmaMostrado = true;
    const rol = await this.avisos.alerta(
      'El aviso puede retrasarse',
      'Android no permite alarmas exactas para Huellitas, así que el aviso del día anterior puede llegar ' +
        'más tarde de las 9:00 a. m. Para que llegue a tiempo, activa "Alarmas y recordatorios" para Huellitas.',
      [
        { text: 'Ahora no', role: 'cancel' },
        { text: 'Abrir ajuste', role: 'confirm' },
      ],
    );
    if (rol === 'confirm') await this.abrirAjusteAlarmaExacta();
  }

  // RF06: la reprogramación de recurrentes vive en RecordatoriosService.reprogramarRecurrentes(),
  // que llama a programarRecordatorio() (aquí no se puede inyectar MascotasService: dependencia circular).
}
