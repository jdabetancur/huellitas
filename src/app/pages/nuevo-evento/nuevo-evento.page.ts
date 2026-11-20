import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import type { Recordatorio, TipoEvento } from '../../models';
import { OPCIONES_REPETIR, ORDEN_TIPOS, TIPOS_EVENTO } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { MascotasService } from '../../services/mascotas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { RecordatoriosService } from '../../services/recordatorios.service';
import { hoyISO, sumarDias } from '../../utils/fechas';
import { admiteFechaFutura, reglasEvento } from '../../utils/validadores';

/**
 * P3 · Nuevo evento (RF03 registrar evento, RF13 peso).
 * También tiene la interfaz de RF06 (Repetir), RF07 (Recordarme), RF09 (jornada, Entrega 3) y RF10 (foto del carné).
 * RNF04: desde el perfil son 3 toques: "+ Evento" → tipo → "Guardar evento" (la fecha empieza en hoy).
 */
@Component({
  selector: 'app-nuevo-evento',
  templateUrl: 'nuevo-evento.page.html',
  styleUrls: ['nuevo-evento.page.scss'],
  imports: [
    DatePipe,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonTextarea,
  ],
})
export class NuevoEventoPage {
  private readonly datos = inject(MascotasService);
  private readonly recordatorios = inject(RecordatoriosService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  /** Id de la mascota (ruta /mascota/:id/evento/nuevo). */
  readonly id = input.required<string>();

  protected readonly mascota = computed(() => this.datos.obtenerMascota(this.id()));
  protected readonly ordenTipos = ORDEN_TIPOS;
  protected readonly tipos = TIPOS_EVENTO;
  protected readonly opcionesRepetir = OPCIONES_REPETIR;
  protected readonly guardando = signal(false);
  protected readonly intentoGuardar = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      tipo: ['vacuna' as TipoEvento],
      fecha: [hoyISO(), Validators.required],
      pesoKg: [null as number | null],
      repetirCadaMeses: [0],
      recordarme: [false],
      notas: ['', Validators.maxLength(300)],
    },
    { validators: reglasEvento },
  );

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly tipo = computed(() => this.valores().tipo ?? 'vacuna');
  protected readonly maxFecha = computed(() =>
    admiteFechaFutura(this.tipo(), !!this.valores().recordarme) ? undefined : hoyISO(),
  );
  /** Fecha en que vence el recordatorio, si "Recordarme" está activo. */
  protected readonly fechaRecordatorio = computed(() => {
    const v = this.valores();
    if (!v.recordarme || !v.fecha) return undefined;
    return this.recordatorios.calcularProximaFecha(v.fecha, v.repetirCadaMeses || undefined);
  });
  protected readonly fechaAviso = computed(() => {
    const fecha = this.fechaRecordatorio();
    return fecha ? sumarDias(fecha, -1) : undefined;
  });

  protected elegirTipo(tipo: TipoEvento): void {
    this.form.controls.tipo.setValue(tipo);
    if (tipo === 'peso') {
      this.form.patchValue({ recordarme: false, repetirCadaMeses: 0 });
    } else {
      this.form.controls.pesoKg.setValue(null);
    }
  }

  /** Caso de prueba 1: al activar el primer recordatorio, Android 13+ pide el permiso de notificaciones. */
  protected async cambiarRecordarme(activo: boolean): Promise<void> {
    if (!activo) return;
    const permiso = await this.notificaciones.asegurarPermiso();
    if (!permiso) {
      this.form.controls.recordarme.setValue(false);
      await this.avisos.alerta(
        'Sin permiso de notificaciones',
        'Para recordarte este evento, activa las notificaciones de Huellitas en los ajustes del celular.',
        [{ text: 'Entendido' }],
      );
    }
  }

  protected usarJornada(): Promise<void> {
    // Entrega 3 · RF09: agregar con un toque una jornada de vacunación de la secretaría de salud.
    return this.avisos.proximamente('Agregar una jornada de vacunación con un toque', 'RF09');
  }

  protected adjuntarFotoCarne(): Promise<void> {
    // TODO(RF10): usar FotoService.tomarFoto('carne') para obtener la ruta, guardarla en un control
    // `fotoCarneUrl` de este formulario, mostrar la miniatura aquí y enviarla en `agregarEvento`.
    return this.avisos.mensaje('La foto del carné está en desarrollo (RF10).');
  }

  protected mostrarError(nombre: 'fechaFutura' | 'pesoInvalido' | 'recordatorioSinFecha'): boolean {
    return this.intentoGuardar() && this.form.hasError(nombre);
  }

  protected async guardar(): Promise<void> {
    this.intentoGuardar.set(true);
    const mascota = this.mascota();
    if (!mascota) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.avisos.mensaje('Revisa los campos marcados.', 'danger');
      return;
    }
    this.guardando.set(true);
    try {
      const v = this.form.getRawValue();
      const fechaRecordatorio = this.fechaRecordatorio();
      const recordatorio: Recordatorio | undefined =
        v.recordarme && fechaRecordatorio
          ? { fecha: fechaRecordatorio, repetirCadaMeses: v.repetirCadaMeses || undefined }
          : undefined;
      const evento = await this.datos.agregarEvento({
        mascotaId: mascota.id,
        tipo: v.tipo,
        fecha: v.fecha,
        notas: v.notas,
        pesoKg: v.tipo === 'peso' ? Number(v.pesoKg) : undefined,
        recordatorio,
      });
      if (recordatorio) {
        // TODO(RF07): programarRecordatorio aún no programa nada; cuando devuelva el id se guarda aquí.
        const notificacionId = await this.notificaciones.programarRecordatorio(evento, mascota);
        if (notificacionId !== undefined) {
          await this.datos.actualizarEvento(evento.id, { recordatorio: { ...recordatorio, notificacionId } });
        }
      }
      await this.avisos.mensaje('Evento guardado.', 'success');
      this.nav.back();
    } finally {
      this.guardando.set(false);
    }
  }
}
