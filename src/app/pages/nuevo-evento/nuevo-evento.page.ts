import { DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
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

import type { EventoSalud, Recordatorio, TipoEvento } from '../../models';
import { OPCIONES_REPETIR, ORDEN_TIPOS, TIPOS_EVENTO } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { FotoService } from '../../services/foto.service';
import { MascotasService } from '../../services/mascotas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { RecordatoriosService } from '../../services/recordatorios.service';
import { hoyISO, sumarDias } from '../../utils/fechas';
import { admiteFechaFutura, reglasEvento } from '../../utils/validadores';

/**
 * P3 · Nuevo / editar evento (RF03 registrar evento, RF13 peso).
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
export class NuevoEventoPage implements OnInit {
  private readonly fotos = inject(FotoService);
  private readonly destruccion = inject(DestroyRef);
  private fotoGuardada?: string;
  private eventoOriginal?: EventoSalud;
  private readonly fotoRuta = signal<string | undefined>(undefined);
  protected readonly tieneFoto = computed(() => !!this.fotoRuta());
  protected readonly fotoSrc = signal<string | undefined>(undefined);
  protected readonly eligiendoFoto = signal(false);

  private readonly datos = inject(MascotasService);
  private readonly recordatorios = inject(RecordatoriosService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  /** Id de la mascota (ruta /mascota/:id/evento/nuevo). */
  readonly id = input.required<string>();
  /** Id del evento cuando se edita (ruta /mascota/:id/evento/:eventoId/editar). */
  readonly eventoId = input<string>();
  /** Tipo con el que abre un evento nuevo, p. ej. /mascota/:id/evento/nuevo?tipoInicial=peso desde «Registrar peso». */
  readonly tipoInicial = input<string>();

  protected readonly editando = computed(() => !!this.eventoId());

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
    {
      validators: (grupo) => {
        const errores = reglasEvento(grupo);
        if (errores?.['recordatorioSinFecha'] && this.mismaProgramacion(grupo.value)) {
          delete errores['recordatorioSinFecha'];
        }
        return errores && Object.keys(errores).length ? errores : null;
      },
    },
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
    if (this.mismaProgramacion(v)) return this.eventoOriginal?.recordatorio?.fecha;
    return this.recordatorios.calcularProximaFecha(v.fecha, v.repetirCadaMeses || undefined);
  });
  protected readonly fechaAviso = computed(() => {
    const fecha = this.fechaRecordatorio();
    return fecha ? sumarDias(fecha, -1) : undefined;
  });

  ngOnInit(): void {
    this.destruccion.onDestroy(() => {
      const ruta = this.fotoRuta();
      if (!this.guardando() && ruta && ruta !== this.fotoGuardada) void this.fotos.eliminar(ruta);
    });
    const eventoId = this.eventoId();
    if (!eventoId) {
      const tipo = this.tipoInicial();
      if (tipo && (ORDEN_TIPOS as string[]).includes(tipo)) this.elegirTipo(tipo as TipoEvento);
      return;
    }
    const evento = this.datos.obtenerEvento(eventoId);
    if (!evento || evento.mascotaId !== this.id()) {
      void this.avisos.mensaje('No encontramos ese evento.', 'danger');
      this.nav.back();
      return;
    }
    this.eventoOriginal = evento;
    this.fotoGuardada = evento.fotoCarneUrl;
    this.fotoRuta.set(this.fotoGuardada);
    if (this.fotoGuardada) void this.cargarFoto(this.fotoGuardada);
    this.form.setValue({
      tipo: evento.tipo,
      fecha: evento.fecha,
      pesoKg: evento.pesoKg ?? null,
      repetirCadaMeses: evento.recordatorio?.repetirCadaMeses ?? 0,
      recordarme: !!evento.recordatorio,
      notas: evento.notas ?? '',
    });
  }

  private mismaProgramacion(v: {
    tipo?: TipoEvento;
    fecha?: string;
    recordarme?: boolean;
    repetirCadaMeses?: number;
  }): boolean {
    const original = this.eventoOriginal;
    return (
      !!original &&
      v.tipo === original.tipo &&
      v.fecha === original.fecha &&
      v.recordarme === !!original.recordatorio &&
      v.repetirCadaMeses === (original.recordatorio?.repetirCadaMeses ?? 0)
    );
  }

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

  protected async adjuntarFotoCarne(): Promise<void> {
    if (this.eligiendoFoto() || this.guardando()) return;
    this.eligiendoFoto.set(true);
    try {
      const ruta = await this.fotos.tomarFoto('carne');
      if (!ruta) return;
      if (this.destruccion.destroyed) {
        await this.fotos.eliminar(ruta);
        return;
      }
      const anterior = this.fotoRuta();
      this.fotoRuta.set(ruta);
      this.fotoSrc.set(undefined);
      if (anterior && anterior !== this.fotoGuardada) await this.fotos.eliminar(anterior);
      await this.cargarFoto(ruta);
    } finally {
      this.eligiendoFoto.set(false);
    }
  }

  protected async quitarFotoCarne(): Promise<void> {
    if (this.eligiendoFoto() || this.guardando()) return;
    const ruta = this.fotoRuta();
    this.fotoRuta.set(undefined);
    this.fotoSrc.set(undefined);
    if (ruta && ruta !== this.fotoGuardada) await this.fotos.eliminar(ruta);
  }

  private async cargarFoto(ruta: string): Promise<void> {
    try {
      const src = await this.fotos.srcDe(ruta);
      if (!this.destruccion.destroyed && this.fotoRuta() === ruta) this.fotoSrc.set(src);
    } catch {
      if (!this.destruccion.destroyed && this.fotoRuta() === ruta) {
        await this.avisos.mensaje('No se pudo cargar la vista previa de la foto.', 'danger');
      }
    }
  }

  protected mostrarError(nombre: 'fechaFutura' | 'pesoInvalido' | 'recordatorioSinFecha'): boolean {
    return this.intentoGuardar() && this.form.hasError(nombre);
  }

  protected async guardar(): Promise<void> {
    if (this.guardando() || this.eligiendoFoto()) return;
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
      const conservarRecordatorio = this.mismaProgramacion(v);
      const recordatorio: Recordatorio | undefined = conservarRecordatorio
        ? this.datos.obtenerEvento(this.eventoId()!)?.recordatorio
        : v.recordarme && fechaRecordatorio
          ? { fecha: fechaRecordatorio, repetirCadaMeses: v.repetirCadaMeses || undefined }
          : undefined;
      const datos = {
        tipo: v.tipo,
        fecha: v.fecha,
        notas: v.notas,
        pesoKg: v.tipo === 'peso' ? Number(v.pesoKg) : undefined,
        recordatorio,
        fotoCarneUrl: v.tipo === 'peso' ? this.fotoGuardada : this.fotoRuta(),
      };
      const eventoId = this.eventoId();
      let evento;
      if (eventoId) {
        // Al editar se cancela la notificación anterior y se vuelve a programar con los datos nuevos.
        if (!conservarRecordatorio) {
          await this.notificaciones.cancelar([this.datos.obtenerEvento(eventoId)?.recordatorio?.notificacionId]);
        }
        evento = await this.datos.actualizarEvento(eventoId, datos);
      } else {
        evento = await this.datos.agregarEvento({ mascotaId: mascota.id, ...datos });
      }
      const anterior = this.fotoGuardada;
      const borrador = this.fotoRuta();
      this.fotoGuardada = evento.fotoCarneUrl;
      this.fotoRuta.set(this.fotoGuardada);
      if (anterior && anterior !== this.fotoGuardada) await this.fotos.eliminar(anterior);
      if (borrador && borrador !== anterior && borrador !== this.fotoGuardada) await this.fotos.eliminar(borrador);
      let sinAviso = false;
      if (recordatorio && !conservarRecordatorio) {
        const notificacionId = await this.notificaciones.programarRecordatorio(evento, mascota);
        if (notificacionId !== undefined) {
          await this.datos.actualizarEvento(evento.id, { recordatorio: { ...recordatorio, notificacionId } });
          await this.notificaciones.avisarSiAlarmaInexacta();
        } else {
          sinAviso = true;
        }
      }
      const guardado = eventoId ? 'Cambios guardados.' : 'Evento guardado.';
      await this.avisos.mensaje(
        sinAviso ? `${guardado} Sin permiso de notificaciones no recibirás el aviso del día anterior.` : guardado,
        sinAviso ? 'dark' : 'success',
      );
      this.nav.back();
    } finally {
      this.guardando.set(false);
    }
  }
}
