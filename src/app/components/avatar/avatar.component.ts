import { Component, effect, inject, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';

import type { Especie } from '../../models';
import { FotoService } from '../../services/foto.service';

/** Foto redonda de la mascota; si no tiene foto muestra una huella con el color de la especie. */
@Component({
  selector: 'app-avatar',
  imports: [IonIcon],
  template: `
    <div
      class="avatar"
      [class]="especie()"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
      [style.font-size.px]="tamano() * 0.45"
    >
      @if (src(); as url) {
        <img [src]="url" [alt]="'Foto de ' + nombre()" />
      } @else {
        <ion-icon name="paw" aria-hidden="true"></ion-icon>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .avatar {
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--hu-primario-suave);
      color: var(--ion-color-primary);
    }
    .avatar.gato {
      background: var(--hu-secundario-suave);
      color: var(--ion-color-secondary-shade);
    }
    .avatar.otro {
      background: var(--hu-terciario-suave);
      color: var(--ion-color-tertiary);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class AvatarComponent {
  private readonly fotos = inject(FotoService);

  readonly ruta = input<string | undefined>();
  readonly especie = input<Especie>('perro');
  readonly nombre = input('');
  readonly tamano = input(48);
  protected readonly src = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      const ruta = this.ruta();
      this.src.set(undefined);
      if (!ruta) return;
      this.fotos
        .srcDe(ruta)
        .then((url) => {
          if (this.ruta() === ruta) this.src.set(url);
        })
        .catch(() => this.src.set(undefined));
    });
  }
}
