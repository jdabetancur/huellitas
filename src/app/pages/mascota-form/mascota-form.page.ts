import type { OnInit } from '@angular/core';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import { AvatarComponent } from '../../components/avatar/avatar.component';
import type { Especie, Sexo } from '../../models';
import { ESPECIES, SEXOS } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { CalendarioService } from '../../services/calendario.service';
import { FotoService } from '../../services/foto.service';
import { MascotasService } from '../../services/mascotas.service';
import { esCachorro, hoyISO } from '../../utils/fechas';
import { noFutura, textoRequerido } from '../../utils/validadores';

/** P4 · Nueva / editar mascota (RF01 registrar, RF02 editar, aviso de RF05 calendario precargado). */
@Component({
  selector: 'app-mascota-form',
  templateUrl: 'mascota-form.page.html',
  styleUrls: ['mascota-form.page.scss'],
  imports: [
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
    IonInput,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    AvatarComponent,
  ],
})
export class MascotaFormPage implements OnInit {
  private readonly datos = inject(MascotasService);
  private readonly fotos = inject(FotoService);
  private readonly calendario = inject(CalendarioService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  /** Viene de la ruta /mascota/:id/editar; no existe en /mascota/nueva. */
  readonly id = input<string>();

  protected readonly especies = Object.entries(ESPECIES) as [Especie, string][];
  protected readonly sexos = Object.entries(SEXOS) as [Sexo, string][];
  protected readonly hoy = hoyISO();
  protected readonly editando = computed(() => !!this.id());
  protected readonly guardando = signal(false);
  /** Foto antes de editar, para borrar el archivo viejo si se cambia. */
  private fotoOriginal?: string;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [textoRequerido, Validators.maxLength(40)]],
    especie: ['perro' as Especie, Validators.required],
    raza: ['', [textoRequerido, Validators.maxLength(40)]],
    sexo: ['macho' as Sexo, Validators.required],
    fechaNacimiento: ['', [Validators.required, noFutura]],
    fotoUrl: [''],
  });

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly fotoUrl = computed(() => this.valores().fotoUrl || undefined);
  protected readonly especieActual = computed(() => this.valores().especie ?? 'perro');
  protected readonly etapa = computed(() => {
    const fecha = this.valores().fechaNacimiento;
    if (!fecha) return undefined;
    return esCachorro(fecha) ? 'cachorro' : 'adulto';
  });
  protected readonly etapaTexto = computed(() => (this.etapa() ? ` (${this.etapa()})` : ''));

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    const mascota = this.datos.obtenerMascota(id);
    if (!mascota) {
      void this.avisos.mensaje('No encontramos esa mascota.', 'danger');
      void this.nav.navigateRoot('/tabs/mascotas');
      return;
    }
    this.fotoOriginal = mascota.fotoUrl;
    this.form.setValue({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      sexo: mascota.sexo,
      fechaNacimiento: mascota.fechaNacimiento,
      fotoUrl: mascota.fotoUrl ?? '',
    });
  }

  protected async elegirFoto(): Promise<void> {
    const ruta = await this.fotos.tomarFoto('mascota');
    if (!ruta) return;
    const anterior = this.form.controls.fotoUrl.value;
    // Si ya había elegido otra foto en este formulario (sin guardar), se borra ese archivo.
    if (anterior && anterior !== this.fotoOriginal) await this.fotos.eliminar(anterior);
    this.form.controls.fotoUrl.setValue(ruta);
  }

  protected async quitarFoto(): Promise<void> {
    const actual = this.form.controls.fotoUrl.value;
    if (actual && actual !== this.fotoOriginal) await this.fotos.eliminar(actual);
    this.form.controls.fotoUrl.setValue('');
  }

  protected error(campo: keyof typeof this.form.controls, tipo: string): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.hasError(tipo);
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.avisos.mensaje('Revisa los campos marcados.', 'danger');
      return;
    }
    this.guardando.set(true);
    try {
      const valores = this.form.getRawValue();
      const datos = { ...valores, fotoUrl: valores.fotoUrl || undefined };
      const id = this.id();
      if (id) {
        await this.datos.editarMascota(id, datos);
        if (this.fotoOriginal && this.fotoOriginal !== datos.fotoUrl) await this.fotos.eliminar(this.fotoOriginal);
        await this.avisos.mensaje('Cambios guardados.', 'success');
      } else {
        const mascota = await this.datos.crearMascota(datos);
        // TODO(RF05): mostrar las propuestas del calendario precargado para que el usuario las ajuste
        // (por ejemplo en un modal) y guardarlas como eventos con recordatorio.
        const propuestas = await this.calendario.proponer(mascota);
        if (propuestas.length) console.warn('[RF05] Propuestas pendientes de mostrar', propuestas);
        await this.avisos.mensaje(`Se registró a ${mascota.nombre}.`, 'success');
      }
      this.nav.back();
    } finally {
      this.guardando.set(false);
    }
  }
}
