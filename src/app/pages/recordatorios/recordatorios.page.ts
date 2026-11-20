import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRouterLink,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import { OPCIONES_REPETIR, TIPOS_EVENTO, tituloEvento } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { MascotasService } from '../../services/mascotas.service';
import type { ProximoRecordatorio } from '../../services/recordatorios.service';
import { RecordatoriosService } from '../../services/recordatorios.service';
import { cuandoTexto } from '../../utils/fechas';

/**
 * P5 · Recordatorios de todas las mascotas (RF06, RF07, RF08; jornadas RF09 en la Entrega 3).
 * TODO(RF08): completar según RecordatoriosService.proximos (recurrentes, vencidos, marcar como hecho).
 */
@Component({
  selector: 'app-recordatorios',
  templateUrl: 'recordatorios.page.html',
  styleUrls: ['recordatorios.page.scss'],
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class RecordatoriosPage {
  private readonly datos = inject(MascotasService);
  private readonly recordatorios = inject(RecordatoriosService);
  private readonly avisos = inject(AvisosService);
  private readonly hojaAcciones = inject(ActionSheetController);
  private readonly nav = inject(NavController);

  protected readonly hoy = new Date();
  protected readonly estaSemana = computed(() => this.recordatorios.proximos().filter((r) => r.dias <= 7));
  protected readonly masAdelante = computed(() => this.recordatorios.proximos().filter((r) => r.dias > 7));
  protected readonly tipos = TIPOS_EVENTO;
  protected readonly titulo = tituloEvento;
  protected readonly cuando = cuandoTexto;

  protected repeticion(r: ProximoRecordatorio): string {
    const meses = r.evento.recordatorio?.repetirCadaMeses;
    return OPCIONES_REPETIR.find((o) => o.meses === meses && meses)?.etiqueta ?? 'Una vez';
  }

  /** "+" del encabezado: elegir la mascota y abrir P3 Nuevo evento. */
  protected async nuevoRecordatorio(): Promise<void> {
    const mascotas = this.datos.mascotas();
    if (!mascotas.length) {
      await this.avisos.mensaje('Primero registra una mascota.');
      return;
    }
    const hoja = await this.hojaAcciones.create({
      header: '¿Para qué mascota?',
      buttons: [
        ...mascotas.map((m) => ({ text: m.nombre, icon: 'paw', data: m.id })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await hoja.present();
    const { data } = await hoja.onDidDismiss<string>();
    if (data) await this.nav.navigateForward(['/mascota', data, 'evento', 'nuevo']);
  }

  protected verJornadas(): Promise<void> {
    // Entrega 3 · RF09: jornadas de vacunación de las secretarías de salud.
    return this.avisos.proximamente('Las jornadas de vacunación de la secretaría de salud', 'RF09');
  }
}
