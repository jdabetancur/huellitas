import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { IonButton, IonContent, IonIcon, ModalController } from '@ionic/angular';

import { OPCIONES_REPETIR, TIPOS_EVENTO, tituloEvento } from '../../models';
import { MascotasService } from '../../services/mascotas.service';
import { cuandoTexto, hoyISO, sumarDias } from '../../utils/fechas';

/** Acción elegida en la hoja de detalle. */
export type AccionDetalle = 'editar' | 'eliminar' | 'perfil';

/**
 * Hoja inferior con el detalle de un evento o recordatorio (se abre desde P1, P2 y P5).
 * Devuelve la acción elegida; DetalleEventoService se encarga de ejecutarla.
 */
@Component({
  selector: 'app-detalle-evento',
  imports: [DatePipe, DecimalPipe, IonContent, IonButton, IonIcon],
  template: `
    <ion-content class="ion-padding">
      @if (evento(); as e) {
        <div class="cabecera">
          <div class="hu-icono-tipo" [class]="tipos[e.tipo].color">
            <ion-icon [name]="tipos[e.tipo].icono" aria-hidden="true"></ion-icon>
          </div>
          <div>
            <h2>{{ titulo(e) }}</h2>
            <p class="hu-nota">{{ mascota()?.nombre }}</p>
          </div>
        </div>

        <dl class="datos">
          <div>
            <dt>Fecha</dt>
            <dd>{{ e.fecha | date: "EEEE d 'de' MMMM y" }} · {{ cuando(e.fecha) }}</dd>
          </div>
          @if (e.tipo === 'peso') {
            <div>
              <dt>Peso</dt>
              <dd>{{ e.pesoKg | number: '1.0-1' }} kg</dd>
            </div>
          }
          @if (e.notas) {
            <div>
              <dt>Notas</dt>
              <dd>{{ e.notas }}</dd>
            </div>
          }
          <div>
            <dt>Recordatorio</dt>
            @if (e.recordatorio; as r) {
              <dd>
                {{ r.fecha | date: "EEEE d 'de' MMMM y" }} · {{ cuando(r.fecha) }}
                <span class="hu-nota bloque">
                  {{ repeticion(r.repetirCadaMeses) }} ·
                  @if (r.fecha <= hoy) {
                    el aviso se envía el día anterior; para este ya pasó
                  } @else if (r.notificacionId !== undefined) {
                    aviso el {{ aviso(r.fecha) | date: "d 'de' MMMM" }} a las 9:00 a. m.
                  } @else {
                    sin aviso en el celular (activa las notificaciones de Huellitas)
                  }
                </span>
              </dd>
            } @else {
              <dd>Sin recordatorio</dd>
            }
          </div>
        </dl>

        <div class="acciones">
          <ion-button expand="block" (click)="cerrar('editar')">
            <ion-icon slot="start" name="create-outline" aria-hidden="true"></ion-icon>
            Editar
          </ion-button>
          <ion-button expand="block" fill="outline" color="danger" (click)="cerrar('eliminar')">
            <ion-icon slot="start" name="trash-outline" aria-hidden="true"></ion-icon>
            Eliminar
          </ion-button>
          @if (mostrarPerfil) {
            <ion-button expand="block" fill="clear" (click)="cerrar('perfil')">
              <ion-icon slot="start" name="paw" aria-hidden="true"></ion-icon>
              Ver perfil de {{ mascota()?.nombre }}
            </ion-button>
          }
        </div>
      } @else {
        <p class="hu-nota">Este evento ya no existe.</p>
      }
    </ion-content>
  `,
  styles: `
    .cabecera {
      display: flex;
      gap: 12px;
      align-items: center;
      margin: 8px 0 12px;
    }
    h2 {
      font-size: 1.2rem;
      font-weight: 800;
      margin: 0;
    }
    .cabecera p {
      margin: 2px 0 0;
    }
    .datos {
      margin: 0 0 16px;
      background: var(--hu-tarjeta);
      border-radius: 16px;
      padding: 4px 16px;
    }
    .datos > div {
      padding: 10px 0;
      border-bottom: 1px solid var(--hu-borde);
    }
    .datos > div:last-child {
      border-bottom: 0;
    }
    dt {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ion-color-medium);
    }
    dd {
      margin: 2px 0 0;
    }
    dd::first-letter {
      text-transform: uppercase;
    }
    .bloque {
      display: block;
    }
    .acciones ion-button {
      margin: 0 0 8px;
    }
  `,
})
export class DetalleEventoComponent {
  private readonly datos = inject(MascotasService);
  private readonly controladorModal = inject(ModalController);

  private readonly id = signal('');
  /** Lo asigna ModalController con componentProps. */
  @Input({ required: true }) set eventoId(valor: string) {
    this.id.set(valor);
  }
  /** Muestra el botón "Ver perfil" (cuando se abre desde Recordatorios o Mis mascotas). */
  @Input() mostrarPerfil = false;

  protected readonly evento = computed(() => this.datos.obtenerEvento(this.id()));
  protected readonly mascota = computed(() => {
    const evento = this.evento();
    return evento ? this.datos.obtenerMascota(evento.mascotaId) : undefined;
  });
  protected readonly tipos = TIPOS_EVENTO;
  protected readonly titulo = tituloEvento;
  protected readonly cuando = cuandoTexto;
  protected readonly hoy = hoyISO();

  protected repeticion(meses?: number): string {
    return OPCIONES_REPETIR.find((o) => o.meses === meses && meses)?.etiqueta ?? 'Una vez';
  }

  protected aviso(fecha: string): string {
    return sumarDias(fecha, -1);
  }

  protected cerrar(accion: AccionDetalle): Promise<boolean> {
    return this.controladorModal.dismiss(accion);
  }
}
