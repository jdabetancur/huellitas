import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonRouterLink,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import { AvatarComponent } from '../../components/avatar/avatar.component';
import type { Mascota } from '../../models';
import { ESPECIES, tituloEvento } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { MascotasService } from '../../services/mascotas.service';
import type { ProximoRecordatorio } from '../../services/recordatorios.service';
import { RecordatoriosService } from '../../services/recordatorios.service';
import { cuandoTexto, edadTexto } from '../../utils/fechas';

/** P1 · Mis mascotas (RF02 listar/editar/eliminar, RF08 próximo recordatorio, RF12 importar CSV). */
@Component({
  selector: 'app-mis-mascotas',
  templateUrl: 'mis-mascotas.page.html',
  styleUrls: ['mis-mascotas.page.scss'],
  imports: [
    DatePipe,
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItemSliding,
    IonItem,
    IonLabel,
    IonChip,
    IonItemOptions,
    IonItemOption,
    IonFab,
    IonFabButton,
    AvatarComponent,
  ],
})
export class MisMascotasPage {
  private readonly datos = inject(MascotasService);
  private readonly recordatorios = inject(RecordatoriosService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  protected readonly mascotas = this.datos.mascotas;
  protected readonly proximo = computed(() => this.recordatorios.proximos()[0]);
  protected readonly estaSemana = computed(() => this.recordatorios.proximos().filter((r) => r.dias <= 7).length);
  protected readonly especies = ESPECIES;
  protected readonly titulo = tituloEvento;
  protected readonly edad = edadTexto;
  protected readonly cuando = cuandoTexto;

  protected proximoDe(id: string): ProximoRecordatorio | undefined {
    return this.recordatorios.proximoDe(id);
  }

  protected importarCsv(): Promise<void> {
    // Entrega 3 · RF12: importar el perfil de una mascota desde un archivo CSV.
    return this.avisos.proximamente('Importar un perfil desde CSV', 'RF12');
  }

  protected async editar(mascota: Mascota, deslizable: IonItemSliding): Promise<void> {
    await deslizable.close();
    await this.nav.navigateForward(['/mascota', mascota.id, 'editar']);
  }

  protected async eliminar(mascota: Mascota, deslizable: IonItemSliding): Promise<void> {
    await deslizable.close();
    const ok = await this.avisos.confirmar(
      `¿Eliminar a ${mascota.nombre}?`,
      'Se borrarán su perfil, su historial de salud y sus recordatorios. Esta acción no se puede deshacer.',
    );
    if (!ok) return;
    await this.datos.eliminarMascota(mascota.id);
    await this.avisos.mensaje(`Se eliminó a ${mascota.nombre}.`);
  }
}
