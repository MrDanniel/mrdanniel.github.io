# Daniel C. Studio — sitio web

Sitio estático preparado para GitHub Pages.

## Publicar en GitHub Pages

1. En GitHub, crea un repositorio público llamado **`mrdanniel.github.io`** (todo en minúsculas).
2. Sube el contenido de esta carpeta a la raíz del repositorio. `index.html` debe quedar en la raíz, no dentro de otra carpeta.
3. Abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`, guarda.
6. Espera a que termine la publicación. La dirección esperada será `https://mrdanniel.github.io/`.

Documentación oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Antes de enviar enlaces a Google Play Console

- Configura un correo público y actualiza `legal/contacto.html`, `legal/privacidad.html` y las páginas de cada app.
- Completa los términos y la política de privacidad específicos de cada aplicación. No publiques los textos marcados `PENDIENTE` como si fueran documentos definitivos.
- Revisa cada aplicación real: datos recopilados, permisos, SDK de analítica/publicidad, compras, cuentas, almacenamiento, ubicación, cámara, micrófono, contenido del usuario, transferencias y eliminación.
- Asegúrate de que la política de privacidad coincida con el comportamiento de la app y con el formulario de Seguridad de los datos de Play Console.
- Si declaras que eres operador/trader, Google indica que solicita un enlace a los términos de servicio para cada app. La clasificación debe reflejar tu actividad real; no se determina por tener este sitio web.

## Estructura

- `index.html`: página principal.
- `assets/style.css`: estilos.
- `legal/`: términos generales del sitio, privacidad del sitio y contacto.
- `apps/`: fichas iniciales por proyecto, con apartados legales pendientes de personalizar.

Este sitio es una plantilla técnica y no constituye asesoría jurídica. Solicita revisión profesional si vas a monetizar, tratar datos sensibles o prestar servicios sujetos a regulación.
