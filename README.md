# Prototipo · Portal de cursos de verano

Prototipo para mostrar a la gerencia mientras TI construye la API. Usa datos de demostración con la **misma forma del contrato de API**, así que al llegar la API real solo cambia la fuente de datos.

## Cómo abrirlo

- **Netlify:** crea un proyecto nuevo arrastrando la carpeta `prototipo-verano`.
- **En la computadora:** doble clic en `index.html`.

## Recorrido para la demostración

1. **Landing pública (`index.html`):** solo información general del verano. Sin planes, cursos ni oferta.
2. **Ingresar con Google:** en el prototipo se elige un estudiante de ejemplo:
   - **José Antonio** · al día, 6.° ciclo: cursos disponibles, condicionales y bloqueados; permite mostrar un cruce de horario (Innovación Social V-01 con Gestión Profesional V-02).
   - **María Fernanda** · 4.° ciclo, con Cálculo Diferencial desaprobado: el sistema recomienda recuperarlo primero.
   - **Luis Alberto** · 5.° ciclo, con impedimento de matrícula: puede simular, pero no enviar su solicitud.
3. **Mi avance:** créditos aprobados y faltantes, recomendaciones y cuándo podría terminar con y sin verano.
4. **Mi malla:** los 10 ciclos con el estado de cada curso; al tocar uno, sus prerrequisitos.
5. **Cursos de verano:** oferta separada en disponibles, con condición y aún no disponibles; elección de sección o solicitud de apertura. El panel "Mi selección" valida créditos (máximo 11), cruces, condiciones y habilitación.
6. **Mi horario:** semana de verano; los cursos que se cruzan aparecen en rojo, lado a lado.
7. **Mi solicitud:** revisión, validaciones, costo referencial, autorización de datos y envío. Luego: número de solicitud, qué sigue, **constancia en PDF con el horario** y botón a la intranet.

## Qué es de demostración

- La malla (cursos y créditos) viene del catálogo web de Ingeniería de Sistemas e Informática. Los códigos, prerrequisitos, oferta, secciones, horarios, fechas, costo por crédito y los tres estudiantes son ficticios.
- El ingreso con Google es simulado y las solicitudes se guardan solo en el navegador.
- La proyección de egreso es referencial: supone que aprueba lo que lleva ahora y hasta 25 créditos por semestre.

## Paso a la versión real

| Hoy (prototipo) | Versión real |
|---|---|
| `config.modo = 'prototipo'` | `config.modo = 'api'` |
| `datos-prototipo.js` | Backend Laravel → API de TI (contrato de API) |
| Selector de estudiantes | Google OAuth validado en el servidor (`/auth/google`) |
| Solicitud en el navegador | `POST /api/portal/solicitud` → servicio 12 del contrato |

Rutas que espera el frontend del backend Laravel (`config.backendBase`): `/sesion`, `/perfil`, `/historial`, `/malla`, `/oferta-verano`, `/parametros`, `/calendario`, `/habilitacion`, `/solicitud` (GET y POST).

## Estructura

```
index.html            Landing pública
app.html              Área privada
css/estilos.css       Estilos (mismo diseño de la landing y del portal)
js/config.js          Modo, rutas del backend, enlaces e imágenes
js/datos-prototipo.js Datos de demostración con la forma del contrato
js/api.js             Capa de datos (prototipo o backend)
js/simulador.js       Reglas: disponibilidad, condiciones, créditos, cruces y proyección
js/app.js             Interfaz del área privada
js/pdf.js             Constancia y horario en PDF
```
