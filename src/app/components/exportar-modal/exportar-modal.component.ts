import { Component, Input, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRadio,
  IonRadioGroup,
  ModalController,
} from '@ionic/angular';

import type { Mascota } from '../../models';
import { AvisosService } from '../../services/avisos.service';

type Formato = 'pdf' | 'csv';

/**
 * P6 · Exportar historial (hoja inferior que se abre desde el perfil).
 * RF11 (PDF) y RF12 (CSV) quedan para la Entrega 3: por ahora muestran "Próximamente".
 */
@Component({
  selector: 'app-exportar-modal',
  imports: [IonContent, IonList, IonItem, IonLabel, IonIcon, IonRadioGroup, IonRadio, IonButton],
  template: `
    <ion-content class="ion-padding">
      <h2 class="titulo">Exportar historial</h2>
      <p class="hu-nota">{{ mascota.nombre }} · elige el formato</p>

      <ion-radio-group [value]="formato()" (ionChange)="formato.set($event.detail.value)">
        <ion-list lines="none" class="opciones">
          <ion-item [class.activa]="formato() === 'pdf'">
            <ion-icon slot="start" name="document-text-outline" color="primary" aria-hidden="true"></ion-icon>
            <ion-radio value="pdf" justify="space-between">
              <ion-label>
                <h3>PDF para el veterinario</h3>
                <p>Historial de salud listo para imprimir o compartir</p>
              </ion-label>
            </ion-radio>
          </ion-item>
          <ion-item [class.activa]="formato() === 'csv'">
            <ion-icon slot="start" name="download-outline" color="primary" aria-hidden="true"></ion-icon>
            <ion-radio value="csv" justify="space-between">
              <ion-label>
                <h3>Respaldo en CSV</h3>
                <p>Perfil completo para guardarlo o pasarlo a otro celular</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-list>
      </ion-radio-group>

      <ion-button expand="block" (click)="exportar()">
        {{ formato() === 'pdf' ? 'Exportar PDF' : 'Exportar CSV' }}
      </ion-button>
      <ion-button expand="block" fill="clear" color="medium" (click)="cerrar()">Cancelar</ion-button>
    </ion-content>
  `,
  styles: `
    .titulo {
      font-weight: 800;
      margin: 8px 0 0;
    }
    .opciones {
      background: transparent;
      margin: 16px 0;
    }
    ion-item {
      --border-radius: 16px;
      --background: var(--hu-tarjeta);
      border: 2px solid var(--hu-borde);
      border-radius: 16px;
      margin-bottom: 10px;
    }
    ion-item.activa {
      border-color: var(--ion-color-primary);
      --background: var(--hu-primario-suave);
    }
    h3 {
      font-weight: 700;
    }
  `,
})
export class ExportarModalComponent {
  private readonly modal = inject(ModalController);
  private readonly avisos = inject(AvisosService);

  /** Lo asigna ModalController con componentProps. */
  @Input({ required: true }) mascota!: Mascota;
  protected readonly formato = signal<Formato>('pdf');

  async exportar(): Promise<void> {
    if (this.formato() === 'pdf') {
      // Entrega 3 · RF11: generar el PDF del historial y compartirlo.
      await this.avisos.proximamente('Exportar el historial en PDF', 'RF11');
    } else {
      // Entrega 3 · RF12: exportar el perfil completo en CSV.
      await this.avisos.proximamente('Exportar el perfil en CSV', 'RF12');
    }
  }

  cerrar(): Promise<boolean> {
    return this.modal.dismiss();
  }
}
