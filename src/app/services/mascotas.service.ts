import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { EventoSalud, Mascota } from '../models';
import { nuevoId } from '../utils/ids';

import { crearDatosEjemplo } from './datos-ejemplo';
import { FotoService } from './foto.service';
import { NotificacionesService } from './notificaciones.service';

const CLAVE_MASCOTAS = 'huellitas.mascotas';
const CLAVE_EVENTOS = 'huellitas.eventos';
const CLAVE_INICIADA = 'huellitas.datosEjemploCargados';

export type DatosMascota = Omit<Mascota, 'id'>;
export type DatosEvento = Omit<EventoSalud, 'id'>;

/**
 * Fuente única de datos de la app (contrato con todo el equipo).
 * Guarda mascotas y eventos en el celular con Capacitor Preferences y expone el estado con signals:
 * cualquier `computed()` que lea `mascotas()` o `eventos()` se actualiza solo.
 */
@Injectable({ providedIn: 'root' })
export class MascotasService {
  private readonly fotos = inject(FotoService);
  private readonly notificaciones = inject(NotificacionesService);

  private readonly _mascotas = signal<Mascota[]>([]);
  private readonly _eventos = signal<EventoSalud[]>([]);
  private carga?: Promise<void>;

  /** Mascotas ordenadas por nombre. */
  readonly mascotas = computed(() => [...this._mascotas()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
  /** Todos los eventos de todas las mascotas, sin orden. */
  readonly eventos = this._eventos.asReadonly();

  /** Carga los datos guardados (y los de ejemplo la primera vez). Se llama al iniciar la app. */
  iniciar(): Promise<void> {
    this.carga ??= this.cargar();
    return this.carga;
  }

  // ---------- Mascotas (RF01, RF02) ----------

  listarMascotas(): Mascota[] {
    return this.mascotas();
  }

  obtenerMascota(id: string): Mascota | undefined {
    return this._mascotas().find((m) => m.id === id);
  }

  async crearMascota(datos: DatosMascota): Promise<Mascota> {
    const mascota: Mascota = { ...limpiar(datos), id: nuevoId() };
    this._mascotas.update((lista) => [...lista, mascota]);
    await this.guardar();
    return mascota;
  }

  async editarMascota(id: string, cambios: Partial<DatosMascota>): Promise<Mascota> {
    const actual = this.obtenerMascota(id);
    if (!actual) throw new Error(`No existe la mascota ${id}`);
    const editada: Mascota = limpiar({ ...actual, ...cambios, id });
    this._mascotas.update((lista) => lista.map((m) => (m.id === id ? editada : m)));
    await this.guardar();
    return editada;
  }

  /** Elimina la mascota con sus eventos, sus fotos y sus notificaciones pendientes. */
  async eliminarMascota(id: string): Promise<void> {
    const mascota = this.obtenerMascota(id);
    const suyos = this._eventos().filter((e) => e.mascotaId === id);
    this._mascotas.update((lista) => lista.filter((m) => m.id !== id));
    this._eventos.update((lista) => lista.filter((e) => e.mascotaId !== id));
    await this.guardar();
    await this.notificaciones.cancelar(suyos.map((e) => e.recordatorio?.notificacionId));
    await Promise.all([mascota?.fotoUrl, ...suyos.map((e) => e.fotoCarneUrl)].map((ruta) => this.fotos.eliminar(ruta)));
  }

  // ---------- Eventos de salud (RF03, RF04, RF13) ----------

  async agregarEvento(datos: DatosEvento): Promise<EventoSalud> {
    const evento: EventoSalud = { ...limpiar(datos), id: nuevoId() };
    this._eventos.update((lista) => [...lista, evento]);
    await this.guardar();
    return evento;
  }

  /** Para RF06, RF07 y RF10: actualizar recordatorio, notificacionId o foto del carné de un evento. */
  async actualizarEvento(id: string, cambios: Partial<DatosEvento>): Promise<EventoSalud> {
    const actual = this._eventos().find((e) => e.id === id);
    if (!actual) throw new Error(`No existe el evento ${id}`);
    const editado: EventoSalud = limpiar({ ...actual, ...cambios, id });
    this._eventos.update((lista) => lista.map((e) => (e.id === id ? editado : e)));
    await this.guardar();
    return editado;
  }

  /** Historial de una mascota ordenado por fecha, del más reciente al más antiguo (RF04). */
  listarEventos(mascotaId: string): EventoSalud[] {
    return this._eventos()
      .filter((e) => e.mascotaId === mascotaId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }

  obtenerEvento(id: string): EventoSalud | undefined {
    return this._eventos().find((e) => e.id === id);
  }

  async eliminarEvento(id: string): Promise<void> {
    const evento = this.obtenerEvento(id);
    if (!evento) return;
    this._eventos.update((lista) => lista.filter((e) => e.id !== id));
    await this.guardar();
    await this.notificaciones.cancelar([evento.recordatorio?.notificacionId]);
    await this.fotos.eliminar(evento.fotoCarneUrl);
  }

  /** Controles de peso de la mascota, del más reciente al más antiguo (RF13). */
  historialPeso(mascotaId: string): EventoSalud[] {
    return this.listarEventos(mascotaId).filter((e) => e.tipo === 'peso' && typeof e.pesoKg === 'number');
  }

  pesoActual(mascotaId: string): number | undefined {
    return this.historialPeso(mascotaId)[0]?.pesoKg;
  }

  // ---------- Persistencia ----------

  private async cargar(): Promise<void> {
    const [mascotas, eventos, iniciada] = await Promise.all([
      Preferences.get({ key: CLAVE_MASCOTAS }),
      Preferences.get({ key: CLAVE_EVENTOS }),
      Preferences.get({ key: CLAVE_INICIADA }),
    ]);
    if (!iniciada.value) {
      // Primera vez que se abre la app: datos de ejemplo (Toby, Mishi y Lola).
      const ejemplo = crearDatosEjemplo();
      this._mascotas.set(ejemplo.mascotas);
      this._eventos.set(ejemplo.eventos);
      await this.guardar();
      await Preferences.set({ key: CLAVE_INICIADA, value: 'true' });
      return;
    }
    this._mascotas.set(leerJson<Mascota[]>(mascotas.value));
    this._eventos.set(leerJson<EventoSalud[]>(eventos.value));
  }

  private async guardar(): Promise<void> {
    await Promise.all([
      Preferences.set({ key: CLAVE_MASCOTAS, value: JSON.stringify(this._mascotas()) }),
      Preferences.set({ key: CLAVE_EVENTOS, value: JSON.stringify(this._eventos()) }),
    ]);
  }
}

function leerJson<T extends unknown[]>(valor: string | null): T {
  if (!valor) return [] as unknown as T;
  try {
    const datos = JSON.parse(valor) as unknown;
    return (Array.isArray(datos) ? datos : []) as T;
  } catch {
    return [] as unknown as T;
  }
}

/** Quita propiedades `undefined`, cadenas vacías y espacios sobrantes antes de guardar. */
function limpiar<T extends object>(objeto: T): T {
  const resultado = {} as Record<string, unknown>;
  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null) continue;
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (texto) resultado[clave] = texto;
      continue;
    }
    resultado[clave] = valor;
  }
  return resultado as T;
}
