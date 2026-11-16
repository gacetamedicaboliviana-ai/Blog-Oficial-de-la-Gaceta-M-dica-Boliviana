# Plataforma editorial de la Gaceta Médica Boliviana

Sitio complementario del OJS de la revista (https://gacetamedicaboliviana.com) para publicar editoriales,
opinión y divulgación. **No reemplaza al OJS**: los artículos científicos originales siguen allí.

- **Sitio público:** páginas estáticas generadas por `build.mjs` y alojadas en GitHub Pages.
- **Panel de administración:** [Pages CMS](https://app.pagescms.org), configurado en `.pages.yml`. Los auxiliares
  solo usan formularios; nunca tocan código.
- **Historial y recuperación:** cada cambio queda como un commit de Git y se puede revertir.

Manuales: [`docs/MANUAL-ADMINISTRACION.md`](docs/MANUAL-ADMINISTRACION.md) (auxiliares editoriales) y
[`docs/ARQUITECTURA-Y-SEGURIDAD.md`](docs/ARQUITECTURA-Y-SEGURIDAD.md) (responsable técnico).

## Puesta en marcha (una sola vez, la hace la persona responsable)

1. En GitHub, crear un repositorio nuevo (por ejemplo `gaceta-editoriales`) y subir todo el contenido de esta carpeta a la rama `main`.
2. **Settings → Pages → Source: GitHub Actions.** El flujo `.github/workflows/deploy.yml` publica el sitio con cada cambio y una vez al día (para las editoriales programadas).
3. **Settings → Collaborators:** invitar a las 1 a 3 personas del equipo (cada una necesita su propia cuenta de GitHub). Rol *Admin* para quien gestiona usuarios; rol *Write* para quienes publican.
4. Entrar a https://app.pagescms.org con GitHub, instalar la aplicación en este repositorio y abrirlo.
5. En *Configuración del sitio*: cargar los tres logotipos, el archivo de números y las instrucciones para autores del OJS, el sitio de la Facultad, el correo editorial y las redes oficiales. Mientras un dato esté vacío, ese enlace no se muestra.
6. Crear los primeros autores y, desde *Editoriales y opinión*, la primera publicación en estado **Borrador**.
7. Si se usará un dominio propio, configurarlo en *Settings → Pages* (GitHub crea el archivo `CNAME`) y activar *Enforce HTTPS*.

## Desarrollo local (opcional, para quien mantenga el código)

```bash
npm install
SITE_URL=http://localhost:8080 npm run build   # genera _site/
npm run build:borradores                        # incluye borradores para revisarlos en local
```
Requiere Node 20 o superior. Los borradores y las publicaciones con fecha futura nunca se publican en el sitio real.
