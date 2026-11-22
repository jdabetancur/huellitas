import { describe, expect, it } from 'vitest';

import { momentoAviso, textoAviso } from './notificaciones.service';

describe('Aviso del día anterior (RF07)', () => {
  describe('momentoAviso', () => {
    const ahora = new Date(2026, 10, 22, 8, 0); // 22 de noviembre de 2026, 8:00 a. m.

    it('avisa el día anterior a las 9:00 a. m.', () => {
      expect(momentoAviso('2026-12-10', ahora)).toEqual(new Date(2026, 11, 9, 9, 0, 0, 0));
    });

    it('un recordatorio para mañana se avisa hoy a las 9:00 si aún no son las 9', () => {
      expect(momentoAviso('2026-11-23', ahora)).toEqual(new Date(2026, 10, 22, 9, 0, 0, 0));
    });

    it('si ya pasaron las 9:00 del día anterior, avisa en 1 minuto', () => {
      const tarde = new Date(2026, 10, 22, 10, 30);
      expect(momentoAviso('2026-11-23', tarde)).toEqual(new Date(2026, 10, 22, 10, 31));
    });

    it('cruza el cambio de mes y de año', () => {
      expect(momentoAviso('2027-01-01', ahora)).toEqual(new Date(2026, 11, 31, 9, 0, 0, 0));
    });

    it('no hay aviso para un recordatorio de hoy o pasado', () => {
      expect(momentoAviso('2026-11-22', ahora)).toBeUndefined();
      expect(momentoAviso('2026-11-01', ahora)).toBeUndefined();
    });
  });

  describe('textoAviso', () => {
    it('usa el tipo y la mascota en el título, y la primera línea de las notas en el cuerpo', () => {
      expect(textoAviso({ tipo: 'vacuna', notas: 'Antirrábica\nRefuerzo anual' }, { nombre: 'Toby' })).toEqual({
        titulo: 'Mañana: Vacuna de Toby',
        cuerpo: 'Antirrábica. Toca para ver el perfil de Toby.',
      });
    });

    it('sin notas solo invita a abrir el perfil', () => {
      expect(textoAviso({ tipo: 'desparasitacion' }, { nombre: 'Mishi' })).toEqual({
        titulo: 'Mañana: Desparasitación de Mishi',
        cuerpo: 'Toca para ver el perfil de Mishi.',
      });
    });
  });
});
