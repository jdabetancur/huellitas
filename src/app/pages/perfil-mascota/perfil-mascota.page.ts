import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
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
  ModalController,
  NavController,
} from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { ExportarModalComponent } from '../../components/exportar-modal/exportar-modal.component';
import type { EventoSalud } from '../../models';
import { ESPECIES, OPCIONES_REPETIR, SEXOS, TIPOS_EVENTO, tituloEvento } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { MascotasService } from '../../services/mascotas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { RecordatoriosService } from '../../services/recordatorios.service';
import { cuandoTexto, edadTexto, hoyISO } from '../../utils/fechas';

/** P2 · Perfil de mascota (RF02 editar/eliminar, RF04 historial, RF08 próximo, RF11/RF12 exportar, RF13 peso). */
@Component({
  selector: 'app-perfil-mascota',
  templateUrl: 'perfil-mascota.page.html',
  styleUrls: ['perfil-mascota.page.scss'],
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    AvatarComponent,
  ],
})
export class PerfilMascotaPage {
  private readonly datos = inject(MascotasService);
  private readonly recordatorios = inject(RecordatoriosService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly avisos = inject(AvisosService);
  private readonly modales = inject(ModalController);
  private readonly nav = inject(NavController);

  readonly id = input.required<string>();

  protected readonly mascota = computed(() => this.datos.obtenerMascota(this.id()));

  /** Historial (RF04): lo que ya ocurrió, hasta hoy, del más reciente al más antiguo. */
  protected readonly historial = computed(() =>
    this.datos.listarEventos(this.id()).filter((evento) => evento.fecha <= hoyISO()),
  );

  /** Eventos programados después de hoy (citas, vacunas y desparasitaciones), del más cercano al más lejano. */
  protected readonly proximosEventos = computed(() =>
    this.datos
      .listarEventos(this.id())
      .filter((evento) => evento.fecha > hoyISO())
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );
  protected readonly pesos = computed(() => this.datos.historialPeso(this.id()));
  protected readonly pesoActual = computed(() => this.pesos()[0]?.pesoKg);
  protected readonly vacunas = computed(() => this.historial().filter((e) => e.tipo === 'vacuna').length);
  protected readonly proximo = computed(() => this.recordatorios.proximoDe(this.id()));

  /** Botón de prueba de notificaciones: solo en compilaciones de desarrollo. */
  protected readonly esDesarrollo = !environment.production;
  protected readonly probando = signal(false);
  protected readonly pruebaProgramada = signal<Date | undefined>(undefined);

  protected readonly tipos = TIPOS_EVENTO;
  protected readonly especies = ESPECIES;
  protected readonly sexos = SEXOS;
  protected readonly titulo = tituloEvento;
  protected readonly edad = edadTexto;
  protected readonly cuando = cuandoTexto;

  protected repeticion(meses?: number): string | undefined {
    return OPCIONES_REPETIR.find((o) => o.meses === meses && meses)?.etiqueta;
  }

  /** Diferencia con el control de peso anterior (RF13). */
  protected diferencia(indice: number): number | undefined {
    const actual = this.pesos()[indice]?.pesoKg;
    const anterior = this.pesos()[indice + 1]?.pesoKg;
    if (actual === undefined || anterior === undefined) return undefined;
    return Math.round((actual - anterior) * 10) / 10;
  }

  protected async exportar(): Promise<void> {
    const mascota = this.mascota();
    if (!mascota) return;
    const modal = await this.modales.create({
      component: ExportarModalComponent,
      componentProps: { mascota },
      breakpoints: [0, 0.6],
      initialBreakpoint: 0.6,
      cssClass: 'hu-hoja',
    });
    await modal.present();
  }

  protected async eliminarMascota(): Promise<void> {
    const mascota = this.mascota();
    if (!mascota) return;
    const ok = await this.avisos.confirmar(
      `¿Eliminar a ${mascota.nombre}?`,
      'Se borrarán su perfil, su historial de salud y sus recordatorios. Esta acción no se puede deshacer.',
    );
    if (!ok) return;
    await this.datos.eliminarMascota(mascota.id);
    await this.avisos.mensaje(`Se eliminó a ${mascota.nombre}.`);
    await this.nav.navigateRoot('/tabs/mascotas', { animationDirection: 'back' });
  }

  protected async eliminarEvento(evento: EventoSalud, deslizable: IonItemSliding): Promise<void> {
    await deslizable.close();
    const ok = await this.avisos.confirmar(
      '¿Eliminar este evento?',
      `${this.titulo(evento)} del historial. Si tenía un recordatorio, también se cancela.`,
    );
    if (!ok) return;
    await this.datos.eliminarEvento(evento.id);
    await this.avisos.mensaje('Evento eliminado.');
  }

  /** Solo desarrollo: programa una notificación de prueba a 2 minutos (casos de prueba 1, 3, 4 y 5). */
  protected async probarNotificacion(): Promise<void> {
    const mascota = this.mascota();
    if (!mascota || this.probando()) return;
    this.probando.set(true);
    try {
      const resultado = await this.notificaciones.probar(mascota);
      if (!resultado.permiso) {
        await this.avisos.alerta(
          'Sin permiso de notificaciones',
          'Activa las notificaciones de Huellitas en Ajustes > Aplicaciones > Huellitas > Notificaciones y vuelve a intentarlo.',
          [{ text: 'Entendido' }],
        );
        return;
      }
      this.pruebaProgramada.set(resultado.fecha);
      if (!resultado.alarmaExacta) {
        const rol = await this.avisos.alerta(
          'La notificación puede retrasarse',
          'Android no permite alarmas exactas para esta app, así que la notificación puede llegar unos minutos tarde. ' +
            'Para que llegue a la hora exacta, activa "Alarmas y recordatorios" para Huellitas.',
          [
            { text: 'Ahora no', role: 'cancel' },
            { text: 'Abrir ajuste', role: 'confirm' },
          ],
        );
        if (rol === 'confirm') await this.notificaciones.abrirAjusteAlarmaExacta();
        return;
      }
      await this.avisos.mensaje('Notificación programada en 2 minutos. Ya puedes cerrar la app.', 'success');
    } catch (error) {
      console.error(error);
      await this.avisos.mensaje('No se pudo programar la notificación de prueba.', 'danger');
    } finally {
      this.probando.set(false);
    }
  }
}
