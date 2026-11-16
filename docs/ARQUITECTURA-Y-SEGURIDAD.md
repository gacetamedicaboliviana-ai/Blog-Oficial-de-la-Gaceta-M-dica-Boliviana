# Arquitectura y seguridad

## Decisión técnica
| Componente | Elección | Motivo |
|---|---|---|
| Repositorio | GitHub | Historial completo de cambios y control de permisos |
| Alojamiento | GitHub Pages (flujo con GitHub Actions) | Gratuito, HTTPS incluido, sin servidor que mantener |
| Generador | `build.mjs` propio, 2 dependencias (`marked`, `js-yaml`) | Sin plantillas genéricas; el diseño es propio y fácil de auditar |
| Panel | Pages CMS (`.pages.yml`) | Inicio de sesión con GitHub: no hay contraseñas ni tokens en el repositorio ni servidor propio |
| Buscador | JavaScript propio sobre `search-index.json` | Sin servicios externos |

Alternativa descartada: Decap CMS. Es más maduro y permite flujo de revisión, pero exige un servicio OAuth propio
para iniciar sesión, que añade mantenimiento y una pieza crítica de seguridad. Se puede migrar después si se requiere revisión obligatoria.

## Qué se cumple y qué no (límites reales)
- **Roles.** GitHub Pages no tiene roles propios; se usan los permisos del repositorio. *Administrador* = rol Admin; *Editor* = rol Write. **El rol «Colaborador que no puede publicar» no se puede imponer técnicamente con esta solución**: quien tiene permiso de escritura puede cambiar el estado a *Publicada*. Se acuerda por norma interna que los colaboradores dejen sus textos en *Borrador*; la historia de Git permite ver y revertir cualquier cambio. Si se necesita imponerlo, la alternativa es proteger `main` y exigir *pull request* con aprobación (con Decap CMS u otro flujo).
- **Borradores.** Un borrador no aparece en el sitio, pero **está en el repositorio**: si el repositorio es público, cualquiera puede leer ese archivo en GitHub. Para borradores confidenciales usar un repositorio privado (GitHub Pages desde repositorios privados requiere un plan de pago de GitHub) o redactar fuera hasta tener la versión final.
- **Vista previa.** Pages CMS no muestra la página tal como quedará. El editor de texto es visual; la revisión final se hace tras publicar, o en local con `npm run build:borradores`.
- **Programación.** La fecha futura funciona: el sitio se reconstruye cada día a las 03:15 (hora de Bolivia) y publica lo que ya cumplió su fecha.
- **OJS.** En esta versión la integración es por enlaces (menú, barra superior, botón permanente, enlace por editorial a un artículo del OJS). No se importan datos automáticamente; se puede añadir más adelante con el feed OAI-PMH del OJS si la instalación lo tiene habilitado.

## Seguridad aplicada
- Sin credenciales en el código. El acceso es individual, con la cuenta de GitHub de cada persona (recomendar verificación en dos pasos).
- Cada cambio queda registrado con autor y fecha; para recuperar una versión: *Historial de commits → Revert*.
- El texto de las editoriales se convierte a HTML seguro: el HTML o los scripts escritos a mano se muestran como texto y no se ejecutan; se bloquean enlaces `javascript:`.
- Política de seguridad de contenido (CSP) en cada página; enlaces externos con `noopener noreferrer`.
- Solo se aceptan imágenes `jpg`, `jpeg`, `png` y `webp` desde el panel; el sitio avisa si una imagen pesa más de 1,5 MB.
- Recomendado: proteger la rama `main` contra borrado y *force push*, y activar Dependabot y la verificación en dos pasos.
- Copias de respaldo: el repositorio es la fuente; se aconseja clonarlo periódicamente a una unidad institucional.

## Pendientes que requieren datos de la institución
Logotipos (no se inventaron), enlaces del archivo e instrucciones del OJS, sitio de la Facultad, correo editorial, redes oficiales y revisión institucional del aviso de privacidad. El enlace de la UMSS (`https://www.umss.edu.bo`) debe confirmarse.
