export type Especie = 'perro' | 'gato' | 'otro';
export type Sexo = 'macho' | 'hembra';

/** Mascota registrada en el celular (RF01). Las fechas se guardan como 'YYYY-MM-DD'. */
export interface Mascota {
  id: string;
  nombre: string;
  especie: Especie;
  raza: string;
  sexo: Sexo;
  fechaNacimiento: string;
  /** Ruta relativa del archivo de la foto en Directory.Data (nunca base64). Ver FotoService. */
  fotoUrl?: string;
}

export const ESPECIES: Record<Especie, string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Otro',
};

export const SEXOS: Record<Sexo, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
};
