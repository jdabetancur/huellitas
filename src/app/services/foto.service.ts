import { Injectable, inject } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ActionSheetController } from '@ionic/angular';

import { nuevoId } from '../utils/ids';

const CARPETA = 'fotos';
const OPCIONES = { quality: 70, targetWidth: 1024, targetHeight: 1024, webUseInput: true };

/**
 * Fotos de la app. Las imágenes se guardan como archivos en Directory.Data y los datos solo guardan
 * la ruta relativa (p. ej. 'fotos/mascota-abc.jpeg'), como declara el documento de diseño.
 * Funciona en Android y en el navegador (`ionic serve`), donde Filesystem usa IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class FotoService {
  private readonly hojaAcciones = inject(ActionSheetController);
  private readonly cache = new Map<string, string>();

  /**
   * Pregunta si usar la cámara o la galería, guarda la foto y devuelve su ruta.
   * Devuelve `undefined` si el usuario cancela. Lo usa RF01 (foto de la mascota) y lo reutiliza RF10.
   */
  async tomarFoto(prefijo: 'mascota' | 'carne'): Promise<string | undefined> {
    const origen = await this.elegirOrigen();
    if (!origen) return undefined;
    try {
      const resultado =
        origen === 'camara'
          ? await Camera.takePhoto(OPCIONES)
          : (await Camera.chooseFromGallery({ ...OPCIONES, limit: 1 })).results[0];
      if (!resultado?.webPath) return undefined;
      return await this.guardarFoto(resultado.webPath, prefijo);
    } catch (error) {
      // El usuario canceló o negó el permiso: no es un error de la app.
      console.warn('[FotoService] Foto cancelada o no disponible', error);
      return undefined;
    }
  }

  /** Copia la imagen (webPath de la cámara) a Directory.Data y devuelve la ruta relativa. */
  async guardarFoto(webPath: string, prefijo: string): Promise<string> {
    const respuesta = await fetch(webPath);
    const base64 = await this.blobABase64(await respuesta.blob());
    const ruta = `${CARPETA}/${prefijo}-${nuevoId()}.jpeg`;
    await Filesystem.writeFile({ path: ruta, data: base64, directory: Directory.Data, recursive: true });
    return ruta;
  }

  /** Devuelve una URL que se puede poner en <img src>. */
  async srcDe(ruta: string): Promise<string> {
    const enCache = this.cache.get(ruta);
    if (enCache) return enCache;
    let src: string;
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({ path: ruta, directory: Directory.Data });
      src = Capacitor.convertFileSrc(uri);
    } else {
      const { data } = await Filesystem.readFile({ path: ruta, directory: Directory.Data });
      src = typeof data === 'string' ? `data:image/jpeg;base64,${data}` : URL.createObjectURL(data);
    }
    this.cache.set(ruta, src);
    return src;
  }

  async eliminar(ruta?: string): Promise<void> {
    if (!ruta) return;
    this.cache.delete(ruta);
    try {
      await Filesystem.deleteFile({ path: ruta, directory: Directory.Data });
    } catch {
      // Si el archivo ya no existe no hay nada que borrar.
    }
  }

  /**
   * TODO(RF10): tomar o adjuntar la foto del carné físico o de una fórmula y asociarla a un evento.
   * - Reutiliza `tomarFoto('carne')` para obtener la ruta.
   * - Guárdala en `EventoSalud.fotoCarneUrl` con `MascotasService.actualizarEvento(eventoId, { fotoCarneUrl })`
   *   (si el evento ya tenía foto, borra la anterior con `eliminar()`).
   * - En P3 (NuevoEventoPage) conecta la zona "Foto del carné" para adjuntarla antes de guardar el evento,
   *   y en P2 (PerfilMascotaPage) muestra un ícono en el historial y permite ver la foto en grande.
   */
  async adjuntarAEvento(eventoId: string): Promise<string | undefined> {
    console.warn('[FotoService] TODO(RF10) adjuntarAEvento', eventoId);
    return undefined;
  }

  private async elegirOrigen(): Promise<'camara' | 'galeria' | undefined> {
    const hoja = await this.hojaAcciones.create({
      header: 'Agregar foto',
      buttons: [
        { text: 'Tomar foto', icon: 'camera-outline', data: 'camara' },
        { text: 'Elegir de la galería', icon: 'image-outline', data: 'galeria' },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await hoja.present();
    const { data } = await hoja.onDidDismiss<'camara' | 'galeria'>();
    return data;
  }

  private blobABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(lector.error);
      lector.onload = () => resolve((lector.result as string).split(',')[1]);
      lector.readAsDataURL(blob);
    });
  }
}
