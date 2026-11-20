import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import type { TipoEvento } from '../models';

import { esFutura } from './fechas';

/** La fecha no puede ser posterior a hoy (p. ej. fecha de nacimiento). */
export const noFutura: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string | null;
  return valor && esFutura(valor) ? { futura: true } : null;
};

/** Texto obligatorio que no sea solo espacios. */
export const textoRequerido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = (control.value as string | null) ?? '';
  return valor.trim() ? null : { required: true };
};

/** ¿Este evento puede tener fecha futura? Solo las citas y los eventos con recordatorio (excepto el peso). */
export function admiteFechaFutura(tipo: TipoEvento, recordarme: boolean): boolean {
  if (tipo === 'peso') return false;
  return tipo === 'cita' || recordarme;
}

/**
 * Reglas del formulario de evento (P3):
 * - `fechaFutura`: un evento ya realizado (vacuna aplicada, desparasitación, peso) no puede tener fecha futura.
 * - `pesoInvalido`: el control de peso necesita un peso mayor que 0 (y menor que 200 kg).
 * - `recordatorioSinFecha`: para recordar un evento pasado hay que indicar cada cuánto se repite.
 */
export const reglasEvento: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const { tipo, fecha, pesoKg, recordarme, repetirCadaMeses } = grupo.value as {
    tipo: TipoEvento;
    fecha: string;
    pesoKg: number | string | null;
    recordarme: boolean;
    repetirCadaMeses: number;
  };
  const errores: ValidationErrors = {};
  if (fecha && esFutura(fecha) && !admiteFechaFutura(tipo, recordarme)) errores['fechaFutura'] = true;
  const peso = pesoKg === null || pesoKg === '' ? NaN : Number(pesoKg);
  if (tipo === 'peso' && !(peso > 0 && peso < 200)) errores['pesoInvalido'] = true;
  if (tipo !== 'peso' && recordarme && fecha && !esFutura(fecha) && !repetirCadaMeses) {
    errores['recordatorioSinFecha'] = true;
  }
  return Object.keys(errores).length ? errores : null;
};
