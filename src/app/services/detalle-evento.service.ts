import { Injectable, inject } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';

import type { AccionDetalle } from '../components/detalle-evento/detalle-evento.component';
import { DetalleEventoComponent } from '../components/detalle-evento/detalle-evento.component';
import { tituloEvento } from '../models';

import { AvisosService } from './avisos.service';
import { MascotasService } from './mascotas.service';
import { RecordatoriosService } from './recordatorios.service';

/** Abre el detalle de un evento o recordatorio y ejecuta la acción elegida (editar, eliminar o ver perfil). */
@Injectable({ providedIn: 'root' })
export class DetalleEventoService {
  private readonly modales = inject(ModalController);
  private readonly nav = inject(NavController);
  private readonly datos = inject(MascotasService);
  private readonly avisos = inject(AvisosService);

  private readonly recordatorios = inject(RecordatoriosService);

  async abrir(eventoId: string, opciones: { mostrarPerfil?: boolean; fechaRecordatorio?: string } = {}): Promise<void> {
    const modal = await this.modales.create({
      component: DetalleEventoComponent,
      componentProps: {
        eventoId,
        mostrarPerfil: opciones.mostrarPerfil ?? false,
        fechaRecordatorio: opciones.fechaRecordatorio,
      },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      cssClass: 'hu-hoja',
    });
    await modal.present();
    const { data: accion } = await modal.onWillDismiss<AccionDetalle>();
    const evento = this.datos.obtenerEvento(eventoId);
    if (!accion || !evento) return;

    if (accion === 'editar') {
      await this.nav.navigateForward(['/mascota', evento.mascotaId, 'evento', evento.id, 'editar']);
    } else if (accion === 'perfil') {
      await this.nav.navigateForward(['/mascota', evento.mascotaId]);
    } else if (accion === 'completar' && opciones.fechaRecordatorio) {
      try {
        if (await this.recordatorios.marcarComoHecho(evento.id, opciones.fechaRecordatorio)) {
          await this.avisos.mensaje('Recordatorio marcado como hecho.', 'success');
        }
      } catch {
        await this.avisos.mensaje('No se pudo completar el recordatorio.', 'danger');
      }
    } else if (accion === 'eliminar') {
      await this.eliminar(evento.id);
    }
  }

  /** Pide confirmación y elimina el evento (y cancela su notificación). Devuelve true si se eliminó. */
  async eliminar(eventoId: string): Promise<boolean> {
    const evento = this.datos.obtenerEvento(eventoId);
    if (!evento) return false;
    const ok = await this.avisos.confirmar(
      '¿Eliminar este evento?',
      `${tituloEvento(evento)}. Si tenía un recordatorio, también se cancela.`,
    );
    if (!ok) return false;
    await this.datos.eliminarEvento(evento.id);
    await this.avisos.mensaje('Evento eliminado.');
    return true;
  }
}
