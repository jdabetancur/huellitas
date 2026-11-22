import type { OnInit } from '@angular/core';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
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
import type { Especie, EventoSalud, Mascota, Sexo } from '../../models';
import { ESPECIES, SEXOS } from '../../models';
import { AvisosService } from '../../services/avisos.service';
import { CalendarioService, type EventoPropuesto } from '../../services/calendario.service';
import { FotoService } from '../../services/foto.service';
import { MascotasService } from '../../services/mascotas.service';
import { plantillasCalendario } from '../../services/plantillas-calendario';
import { esCachorro, hoyISO } from '../../utils/fechas';
import { noFutura, textoRequerido } from '../../utils/validadores';

/** P4 · Nueva / editar mascota (RF01, RF02 y RF05). */
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
    IonCheckbox,
    AvatarComponent,
  ],
})
export class MascotaFormPage implements OnInit {
  private readonly datos = inject(MascotasService);
  private readonly fotos = inject(FotoService);
  private readonly calendario = inject(CalendarioService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  readonly id = input<string>();

  protected readonly especies = Object.entries(ESPECIES) as [Especie, string][];
  protected readonly sexos = Object.entries(SEXOS) as [Sexo, string][];
  protected readonly hoy = hoyISO();

  protected readonly editando = computed(() => !!this.id());
  protected readonly guardando = signal(false);

  protected readonly mascotaRegistrada = signal<Mascota | undefined>(undefined);
  protected readonly propuestas = signal<EventoPropuesto[]>([]);

  /** Índices de propuestas que ya se guardaron correctamente. */
  protected readonly eventosGuardados = signal<number[]>([]);

  private fotoOriginal?: string;
  private mascotaOriginal?: Mascota;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [textoRequerido, Validators.maxLength(40)]],
    especie: ['perro' as Especie, Validators.required],
    raza: ['', [textoRequerido, Validators.maxLength(40)]],
    sexo: ['macho' as Sexo, Validators.required],
    fechaNacimiento: ['', [Validators.required, noFutura]],
    fotoUrl: [''],
  });

  private readonly valores = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

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
    this.mascotaOriginal = { ...mascota };

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

    if (anterior && anterior !== this.fotoOriginal) {
      await this.fotos.eliminar(anterior);
    }

    this.form.controls.fotoUrl.setValue(ruta);
  }

  protected async quitarFoto(): Promise<void> {
    const actual = this.form.controls.fotoUrl.value;

    if (actual && actual !== this.fotoOriginal) {
      await this.fotos.eliminar(actual);
    }

    this.form.controls.fotoUrl.setValue('');
  }

  protected error(campo: keyof typeof this.form.controls, tipo: string): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.hasError(tipo);
  }

  protected cambiarInclusion(index: number, incluir: boolean): void {
    this.propuestas.update((lista) => lista.map((evento, i) => (i === index ? { ...evento, incluir } : evento)));
  }

  protected cambiarFecha(index: number, fecha: string | null): void {
    this.propuestas.update((lista) =>
      lista.map((evento, i) => (i === index ? { ...evento, fecha: fecha ?? '' } : evento)),
    );
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
      const datos = {
        ...valores,
        fotoUrl: valores.fotoUrl || undefined,
      };

      const id = this.id();

      if (id) {
        const editada = await this.datos.editarMascota(id, datos);

        if (this.mascotaOriginal) {
          await this.actualizarCalendarioSiCambio(this.mascotaOriginal, editada);
        }

        if (this.fotoOriginal && this.fotoOriginal !== datos.fotoUrl) {
          await this.fotos.eliminar(this.fotoOriginal);
        }

        await this.avisos.mensaje('Cambios guardados.', 'success');
        this.nav.back();
        return;
      }
      const mascota = await this.datos.crearMascota(datos);
      const propuestas = await this.calendario.proponer(mascota);

      if (!propuestas.length) {
        await this.avisos.mensaje(`Se registró a ${mascota.nombre}.`, 'success');
        this.nav.back();
        return;
      }

      this.mascotaRegistrada.set(mascota);
      this.propuestas.set(propuestas);

      await this.avisos.mensaje('Mascota registrada. Revisa las propuestas de su calendario.', 'success');
    } finally {
      this.guardando.set(false);
    }
  }
  /**
   * Actualiza los eventos futuros cuando cambia la plantilla de la mascota.
   * Conserva los eventos pasados y los registros manuales.
   */
  private async actualizarCalendarioSiCambio(anterior: Mascota, nueva: Mascota): Promise<void> {
    const etapaAnterior = esCachorro(anterior.fechaNacimiento) ? 'cachorro' : 'adulto';

    const etapaNueva = esCachorro(nueva.fechaNacimiento) ? 'cachorro' : 'adulto';

    if (anterior.especie === 'otro') return;

    const origenAnterior = `${anterior.especie}.${etapaAnterior}`;
    const origenNuevo = nueva.especie === 'otro' ? undefined : `${nueva.especie}.${etapaNueva}`;

    // Si no cambió la plantilla, no hacemos nada.
    if (origenAnterior === origenNuevo) return;

    const plantillaAnterior = plantillasCalendario[anterior.especie][etapaAnterior];
    const hoy = hoyISO();

    // Identificar solamente eventos futuros de la plantilla anterior.
    const eventosAnteriores = this.datos.listarEventos(nueva.id).filter((evento: EventoSalud) => {
      if (evento.fecha < hoy) return false;

      // Eventos nuevos: identificación mediante su marca de origen.
      if (evento.origenPlantilla) {
        return evento.origenPlantilla === origenAnterior;
      }

      // Eventos antiguos: identificación conservadora por descripción,
      // tipo y recordatorio asociado a la fecha del evento.
      return (
        evento.recordatorio?.fecha === evento.fecha &&
        plantillaAnterior.some((plantilla) => plantilla.tipo === evento.tipo && plantilla.descripcion === evento.notas)
      );
    });

    // Si no había eventos de plantilla, no crear un calendario nuevo.
    if (!eventosAnteriores.length) return;

    // Retirar los eventos futuros de la plantilla anterior.
    for (const evento of eventosAnteriores) {
      await this.datos.eliminarEvento(evento.id);
    }

    // Si la nueva especie es "otro", no hay plantilla que proponer.
    if (nueva.especie === 'otro') return;

    // Crear los eventos correspondientes a la nueva plantilla.
    const nuevasPropuestas = await this.calendario.proponer(nueva);

    for (const propuesta of nuevasPropuestas) {
      await this.datos.agregarEvento({
        mascotaId: nueva.id,
        origenPlantilla: propuesta.origenPlantilla,
        tipo: propuesta.tipo,
        fecha: propuesta.fecha,
        notas: propuesta.notas,
        recordatorio: {
          fecha: propuesta.fecha,
          repetirCadaMeses: propuesta.repetirCadaMeses || undefined,
        },
      });
    }
  }

  protected async guardarCalendario(): Promise<void> {
    const mascota = this.mascotaRegistrada();
    if (!mascota) return;

    const seleccionados = this.propuestas()
      .map((evento, index) => ({ evento, index }))
      .filter(({ evento }) => evento.incluir);

    if (seleccionados.some(({ evento }) => !evento.fecha)) {
      await this.avisos.mensaje('Completa la fecha de los eventos seleccionados.', 'danger');
      return;
    }

    this.guardando.set(true);

    try {
      for (const { evento: propuesta, index } of seleccionados) {
        if (this.eventosGuardados().includes(index)) continue;

        const recordatorio = {
          fecha: propuesta.fecha,
          repetirCadaMeses: propuesta.repetirCadaMeses || undefined,
        };

        await this.datos.agregarEvento({
          mascotaId: mascota.id,
          origenPlantilla: propuesta.origenPlantilla,
          tipo: propuesta.tipo,
          fecha: propuesta.fecha,
          notas: propuesta.notas,
          recordatorio,
        });

        this.eventosGuardados.update((lista) => [...lista, index]);
      }

      const cantidadGuardada = this.eventosGuardados().length;

      await this.avisos.mensaje(
        cantidadGuardada ? 'Calendario guardado correctamente.' : 'Mascota registrada sin eventos en el calendario.',
        'success',
      );

      this.nav.back();
    } catch (error) {
      console.error('[RF05] No se pudo guardar el calendario', error);

      await this.avisos.mensaje('No se pudo guardar todo el calendario. Puedes intentar nuevamente.', 'danger');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async omitirCalendario(): Promise<void> {
    await this.avisos.mensaje('Mascota registrada. No se agregaron eventos al calendario.', 'dark');

    this.nav.back();
  }
}
