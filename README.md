# Huellitas 🐾

Carné digital de las mascotas del hogar. El dueño registra sus mascotas y sus eventos de salud (vacunas, desparasitaciones, citas veterinarias y peso), recibe recordatorios y guarda la foto del carné. Todo se guarda en el celular: no hay servidor ni cuenta (app *standalone*).

Proyecto del módulo **Énfasis en programación móvil** · Politécnico Grancolombiano · Grupo B01-3.

- **Stack:** Ionic 9 + Angular 22 (componentes *standalone*, *signals*) + Capacitor 8.
- **Plugins:** `@capacitor/preferences` (datos), `@capacitor/filesystem` (fotos), `@capacitor/camera` (cámara y galería), `@capacitor/local-notifications` (recordatorios).
- **Plataformas:** Android 8 o superior (el mismo código compila para iOS desde macOS).

## Cómo instalar y correr

Requisitos: Node.js 20+, Git, JDK 21 (o 17) y el Android SDK (Android Studio o las *command-line tools*) con `ANDROID_HOME` configurado.

```bash
npm install            # dependencias
ionic serve            # app en el navegador: http://localhost:8100
ionic build            # compila la web en www/ (producción)
npx cap sync android   # copia www/ y los plugins al proyecto Android
npx cap open android   # abre Android Studio → Build > Build APK(s)
```

Sin abrir Android Studio:

```bash
npm run android:sync:dev                 # compila en modo desarrollo (muestra el botón de prueba de notificaciones) y sincroniza
cd android && .\gradlew assembleDebug    # APK en android/app/build/outputs/apk/debug/app-debug.apk
```

`npm run android:sync` hace lo mismo en modo producción (sin el botón de prueba). Antes de un Pull Request ejecuta `npm run build` y `npm run lint`.

La primera vez que se abre, la app carga datos de ejemplo (Toby, Mishi y Lola). Para empezar de cero: en el navegador borra el `localStorage` del sitio; en Android, *Ajustes > Apps > Huellitas > Almacenamiento > Borrar datos*.

## Estado de los requerimientos (Entrega 2)

| RF | Requerimiento | Estado | Responsable | Issue |
|---|---|---|---|---|
| RF01 | Registrar mascota con nombre, especie, raza, sexo, fecha de nacimiento y foto | ✅ Implementado | Base | — |
| RF02 | Listar, editar y eliminar mascotas | ✅ Implementado | Base | — |
| RF03 | Registrar eventos de salud (vacuna, desparasitación, cita, peso) con fecha y notas | ✅ Implementado | Base | — |
| RF04 | Historial de salud ordenado por fecha | ✅ Implementado | Base | — |
| RF13 | Registrar el peso y verlo como lista de controles | ✅ Implementado | Base | — |
| RF05 | Calendario precargado según especie y edad | 🔧 Interfaz lista, falta la lógica | Compañero 2 | ver Issues |
| RF06 | Recordatorios únicos o recurrentes | 🔧 Interfaz y datos listos, falta reprogramar | Compañero 1 | ver Issues |
| RF07 | Notificación local el día anterior | 🔧 Servicio real listo, falta programar el aviso de cada evento | Compañero 1 | ver Issues |
| RF08 | Próximos recordatorios de todas las mascotas | 🔧 Versión básica, falta completar | Compañero 2 | ver Issues |
| RF10 | Foto del carné asociada a un evento | 🔧 Interfaz y FotoService listos, falta conectar | Compañero 3 | ver Issues |
| RF09 | Jornada de vacunación con un toque | ⏳ Entrega 3 (botón con «Próximamente») | — | — |
| RF11 | Exportar historial en PDF | ⏳ Entrega 3 (botón con «Próximamente») | — | — |
| RF12 | Exportar e importar perfil en CSV | ⏳ Entrega 3 (botón con «Próximamente») | — | — |

Busca `TODO(RFxx)` en el código para ver exactamente qué falta de cada requerimiento.

## Requerimientos por pantalla

Igual que la sección 6 del documento de diseño. Un punto (●) indica que el requerimiento se cumple o se inicia en esa pantalla.

| RF | P1 Mis mascotas | P2 Perfil | P3 Nuevo evento | P4 Nueva/editar mascota | P5 Recordatorios | P6 Exportar |
|---|---|---|---|---|---|---|
| RF01 Registrar mascota | | | | ● | | |
| RF02 Listar, editar y eliminar | ● | ● | | ● | | |
| RF03 Registrar evento | | | ● | | | |
| RF04 Historial por fecha | | ● | | | | |
| RF05 Calendario precargado | | | | ● | | |
| RF06 Recordatorios recurrentes | | | ● | | ● | |
| RF07 Notificación el día anterior | | | ● | | ● | |
| RF08 Próximos recordatorios | ● | ● | | | ● | |
| RF09 Jornada (Entrega 3) | | | ● | | ● | |
| RF10 Foto del carné | | | ● | | | |
| RF11 PDF (Entrega 3) | | ● | | | | ● |
| RF12 CSV (Entrega 3) | ● | ● | | | | ● |
| RF13 Control de peso | | ● | ● | | | |

| Pantalla | Ruta | Archivo |
|---|---|---|
| P1 Mis mascotas | `/tabs/mascotas` | `src/app/pages/mis-mascotas/` |
| P2 Perfil de mascota | `/mascota/:id` | `src/app/pages/perfil-mascota/` |
| P3 Nuevo evento | `/mascota/:id/evento/nuevo` | `src/app/pages/nuevo-evento/` |
| P4 Nueva / editar mascota | `/mascota/nueva`, `/mascota/:id/editar` | `src/app/pages/mascota-form/` |
| P5 Recordatorios | `/tabs/recordatorios` | `src/app/pages/recordatorios/` |
| P6 Exportar historial | hoja inferior abierta desde P2 | `src/app/components/exportar-modal/` |

Al tocar una notificación se abre `/mascota/:id` con el `mascotaId` que viaja en `extra` (ver `NotificacionesService.iniciar`).

## Estructura de carpetas

```
src/app/
├── models/            Contrato de datos: Mascota, EventoSalud, Recordatorio y constantes
├── services/
│   ├── mascotas.service.ts        Datos (Preferences + signals): mascotas, eventos y pesos
│   ├── recordatorios.service.ts   Próximos recordatorios y cálculo de repeticiones (RF06, RF08)
│   ├── notificaciones.service.ts  Notificaciones locales: permiso, programar, cancelar, prueba (RF07)
│   ├── calendario.service.ts      Calendario precargado (RF05)
│   ├── foto.service.ts            Cámara/galería y archivos de fotos (RF01, RF10)
│   ├── avisos.service.ts          Mensajes, confirmaciones y avisos «Próximamente»
│   └── datos-ejemplo.ts           Toby, Mishi y Lola (solo la primera vez)
├── pages/             P1 a P5
├── components/        Avatar y P6 (modal de exportar)
├── tabs/              Pestañas Mascotas y Recordatorios
└── utils/             Fechas, validadores, ids e íconos
android/               Proyecto nativo de Capacitor (permisos en app/src/main/AndroidManifest.xml)
```

## Modelo de datos

Las fechas se guardan como texto `'YYYY-MM-DD'` en hora local. Los datos viven en Preferences con las claves `huellitas.mascotas` y `huellitas.eventos`. Las fotos se guardan como archivos en `Directory.Data/fotos/` y los datos solo guardan la ruta relativa (nunca base64).

```ts
Mascota      { id, nombre, especie: 'perro' | 'gato' | 'otro', raza, sexo: 'macho' | 'hembra', fechaNacimiento, fotoUrl? }
EventoSalud  { id, mascotaId, tipo: 'vacuna' | 'desparasitacion' | 'cita' | 'peso', fecha, notas?, pesoKg?, fotoCarneUrl?, recordatorio? }
Recordatorio { fecha, repetirCadaMeses?, notificacionId? }
```

`MascotasService` (todos los componentes leen sus *signals*; no guardes datos por fuera de él):

| Método | Qué hace |
|---|---|
| `mascotas()` / `eventos()` | *Signals* con todas las mascotas (por nombre) y todos los eventos |
| `crearMascota`, `obtenerMascota`, `listarMascotas`, `editarMascota`, `eliminarMascota` | CRUD de mascotas. Eliminar borra también sus eventos, fotos y notificaciones |
| `agregarEvento`, `actualizarEvento`, `obtenerEvento`, `eliminarEvento` | Eventos de salud. `actualizarEvento` sirve para RF06, RF07 y RF10 |
| `listarEventos(mascotaId)` | Historial ordenado del más reciente al más antiguo (RF04) |
| `historialPeso(mascotaId)`, `pesoActual(mascotaId)` | Controles de peso (RF13) |

Reglas de validación: campos obligatorios; la fecha de nacimiento no puede ser futura; un evento ya realizado (vacuna aplicada, desparasitación, peso) no puede tener fecha futura; las citas y los eventos con «Recordarme» sí; el peso debe ser mayor que 0. Antes de eliminar siempre se pide confirmación.

## Prueba de notificaciones

El tutor pidió probar pronto las notificaciones de los refuerzos de vacunas porque son el corazón de la app. El documento de la Entrega 2 reporta estos 6 casos, así que **todos deben pasar en un celular real antes de entregar**.

Prepara el celular: instala el APK de **desarrollo** (`npm run android:sync:dev` + `.\gradlew assembleDebug`) y abre la app. En el perfil de cualquier mascota aparece la tarjeta «Solo desarrollo» con el botón **Probar notificación en 2 min** (solo existe cuando `environment.production` es `false`).

| # | Caso | Cómo probarlo en el celular | Responsable | Estado |
|---|---|---|---|---|
| 1 | Al crear el primer recordatorio en Android 13+, la app pide el permiso de notificaciones y continúa al aceptarlo | Instala la app limpia → Perfil → «+ Evento» → activa «Recordarme» (o toca «Probar notificación en 2 min»). Debe salir el diálogo de Android; acepta y el interruptor queda activo | Base | Listo para probar |
| 2 | Una vacuna con refuerzo y «Recordarme» activo deja la notificación programada para el día anterior al refuerzo a las 9:00 a. m. | Registra una vacuna con «Repetir: cada año» y «Recordarme». Verifica con `adb shell dumpsys alarm \| findstr huellitas` o temporalmente con un refuerzo para mañana | Compañero 1 (RF07) | Pendiente: `NotificacionesService.programarRecordatorio` |
| 3 | Un recordatorio de prueba a 2 minutos llega con la app cerrada | Toca «Probar notificación en 2 min», cierra la app (deslízala de recientes) y espera | Base | Listo para probar |
| 4 | Un recordatorio programado llega después de reiniciar el celular | Toca «Probar notificación en 2 min» y reinicia el celular de inmediato. Desbloquéalo y espera a que llegue | Base | Listo para probar |
| 5 | Tocar la notificación abre el perfil de la mascota correspondiente | Cuando llegue la notificación del caso 3 o 4, tócala: debe abrir el perfil de esa mascota | Base | Listo para probar |
| 6 | Una desparasitación que se repite cada 3 meses programa automáticamente la siguiente al cumplirse la fecha | Registra una desparasitación «cada 3 meses» con «Recordarme»; al cumplirse la fecha debe quedar programada la siguiente | Compañero 1 (RF06) | Pendiente: `NotificacionesService.reprogramarRecurrentes` |

Notas para que la prueba salga bien:

- **Alarmas exactas:** en Android 12 o superior el sistema puede negar las alarmas exactas. Si es así, el botón de prueba lo avisa y ofrece abrir *Alarmas y recordatorios*; actívalo para Huellitas. Sin ese permiso la notificación puede llegar unos minutos tarde.
- **Ahorro de batería:** algunas marcas (Xiaomi, Huawei, Oppo, Samsung con optimización agresiva) bloquean las alarmas de apps cerradas. Si el caso 3 o 4 falla, pon Huellitas en «Sin restricciones» en *Batería*.
- **Reinicio:** el plugin `@capacitor/local-notifications` registra un receptor de `BOOT_COMPLETED` que vuelve a programar las notificaciones pendientes; el manifiesto declara `RECEIVE_BOOT_COMPLETED`.

## Reglas de trabajo

1. **Una rama por requerimiento**, creada desde `main`: `feature/rf06-recordatorios`, `feature/rf07-notificaciones`, `feature/rf05-calendario`, `feature/rf08-proximos`, `feature/rf10-foto-carne`.
2. Commits pequeños con mensajes claros en español.
3. **Pull Request a `main`**, con `npm run build` y `npm run lint` sin errores, y el issue enlazado (`Closes #n`).
4. **Nadie sube directo a `main`.** Otro integrante revisa y aprueba el PR antes de fusionarlo.
5. Si cambias el modelo de datos o un servicio compartido, avísalo en el PR: es el contrato de todo el equipo.
