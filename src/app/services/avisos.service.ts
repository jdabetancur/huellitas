import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Mensajes y confirmaciones reutilizables. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  async mensaje(texto: string, color: 'dark' | 'danger' | 'success' = 'dark'): Promise<void> {
    const toast = await this.toasts.create({ message: texto, duration: 2500, position: 'top', color });
    await toast.present();
  }

  /** Pide confirmación antes de una acción destructiva. Devuelve true si el usuario confirma. */
  async confirmar(titulo: string, texto: string, boton = 'Eliminar'): Promise<boolean> {
    const alerta = await this.alertas.create({
      header: titulo,
      message: texto,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: boton, role: 'confirm', cssClass: 'boton-peligro' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    return role === 'confirm';
  }

  /** Aviso para las funciones de la Entrega 3 (RF09, RF11 y RF12). */
  async proximamente(funcion: string, rf: string): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Próximamente',
      message: `${funcion} estará disponible en la próxima versión (${rf}).`,
      buttons: ['Entendido'],
    });
    await alerta.present();
  }

  async alerta(titulo: string, texto: string, botones: { text: string; role?: string }[]): Promise<string | undefined> {
    const alerta = await this.alertas.create({ header: titulo, message: texto, buttons: botones });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    return role;
  }
}
