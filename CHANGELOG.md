# Historial de cambios

La versión 10 es la primera publicación estable aprobada por el usuario. Las versiones 1–9 fueron iteraciones de desarrollo y pruebas.

## Versión 12 — Títulos visibles en los controles (2 de noviembre de 2026)

- Corrige los títulos de Aplicaciones abiertas, Descargas, Documentos e Imágenes al pasar el ratón.
- Usa el estilo nativo dash-label, capa superior y medición del tamaño preferido antes de posicionar.
- Evita que la etiqueta quede debajo del dock y que la salida tardía de otro botón la oculte.
- Limita la posición al monitor y limpia la etiqueta al destruir controles.
- Añade pruebas de regresión y documentación con capturas previas y plan de actualización 11 → 12.
- La revisión diaria sigue siendo opcional y conserva la elección del usuario.
- Pendiente de confirmar el resultado visual y el flujo de actualización real en el equipo del usuario.

## Versión 11 — Actualizaciones opcionales

- Busca Releases estables al abrir y mediante botón manual.
- Revisión diaria opcional, desactivada inicialmente; activación y detención desde el gestor.
- Notificación de escritorio sin mantener abierto el gestor, si el usuario habilita la revisión diaria.
- Aviso de nueva versión, notas, actualización manual y posposición de 24 horas.
- Verificación SHA-256, validación del ZIP, respaldo y recuperación de archivos ante fallo.
- Conserva personalizaciones y estado de habilitación.
- GitHub Actions publica etiquetas, Releases y paquetes al cambiar version.json.
- Pruebas del actualizador y manual de botones. El aviso real se verificará con la siguiente Release.

## Versión 10 — Estable

- Publicación autorizada después de la confirmación funcional del usuario.
- Cuatro iconos propios: aplicaciones abiertas, Descargas, Documentos e Imágenes.
- Botón Restaurar iconos por defecto; conserva las restauraciones individuales y otros ajustes.
- Las personalizaciones existentes se mantienen al actualizar.
- Instalación estable del gestor y retirada de etiquetas de prueba.
- Tres capturas nuevas, con la última como portada.

## Versiones 6–9 — Correcciones y pruebas privadas

- Consulta D-Bus corregida; botones habilitados según el estado real y errores visibles.
- Identidad del lanzador alineada con la ventana y apertura independiente del gestor.
- Icono propio de DockStacks en menú, ventana y stack.
- Nombres completos al pasar el ratón.
- Menú contextual anclado a cada aplicación, manteniendo abierto el stack; cierre normal de ventanas.
- Selector ubicado en el tema activo y búsqueda de subcarpetas que contienen PNG/SVG.
- Pruebas de iconos, restauración, rutas y ciclo de vida del menú contextual.

## Versión 5 — Gestor visual e iconos personalizables

- Gestor nativo GTK 4/libadwaita para instalar, actualizar, habilitar y deshabilitar.
- Estado consultado a GNOME Shell y mensajes de error visibles; operaciones de instalación asíncronas.
- Acceso persistente DockStacks en el menú de aplicaciones tras instalar.
- Preferencias con vista previa y selección PNG/SVG o nombre de icono del tema para los cuatro botones.
- Copia local de imágenes, restauración por botón y aplicación de iconos en vivo.
- Recuperación al icono original si se elimina un archivo personalizado.
- Empaquetado con esquemas GSettings compilados y pruebas de iconos.
- Pendiente de validación visual en GNOME 50; se requiere cerrar sesión después de actualizar.

## Nombre del proyecto — DockStacks para Ubuntu Dock

- Nuevo nombre público y metadatos; se conserva el identificador interno para mantener las actualizaciones.
- Publicación del código, instalador, paquete y documentación en GitHub.
- Seis capturas reales del desarrollo, optimizadas a WebP.
- Captura de v4 confirma el panel de aplicaciones con tres entradas; las pruebas de selección de múltiples ventanas y saturación siguen pendientes.

## Versión 4 — Stack y reserva de espacio

- Botón morado «Aplicaciones abiertas» con contador de aplicaciones.
- Un icono por aplicación, con contador de ventanas; selección por título cuando hay varias.
- Panel en cuatro columnas con scroll y actualización de la lista cada 500 ms.
- Las aplicaciones sin anclar dejan de añadir iconos individuales: show-running se guarda y se desactiva durante el uso del stack; se restaura al desactivar la extensión.
- Los controles se mueven fuera del área desplazable de aplicaciones.
- Ajuste reversible del cálculo del tamaño de iconos y del máximo del área desplazable, reservando espacio para los controles.
- Nuevas pruebas de lógica con Node.js: agrupación, activación, restauración y espacio, también ante errores.
- Stack y reserva de espacio pendientes de confirmación visual en GNOME.

## Versión 3 — Cuatro columnas y scroll

- Se sustituye la vista limitada a 12 iconos por un contenedor desplazable vertical.
- Se mantienen cuatro columnas; el panel limita su altura según el monitor y el escalado.
- Se elimina el límite de 512 entradas leídas: se enumeran todos los elementos no ocultos.
- Se construyen los iconos por lotes, cediendo tiempo al escritorio cada 64 elementos.
- Se muestra un contador de elementos.
- Se mejora la presentación de errores durante la construcción del panel.
- Scroll confirmado por el usuario; captura con cuatro columnas y contador de 58 elementos.

## Versión 2 — Integración en Ubuntu Dock

- Se retira el bloque flotante independiente.
- Los tres botones se insertan dentro de `dashtodockBoxContainer`, después de las aplicaciones.
- Se añade un separador visual.
- Los iconos toman su tamaño del dock.
- Se vuelve a buscar el contenedor cada 500 ms para detectar su recreación.
- Se mantienen paneles de carpetas y apertura de archivos.
- Se ignoran los antiguos márgenes manuales.
- El usuario confirma que la integración funciona.
- Se identifica un problema pendiente con el espacio disponible al saturar el dock.

## Versión 1 — Prototipo independiente

- Bloque de tres carpetas situado en el borde inferior derecho del monitor principal.
- Preferencias de márgenes y tamaño de iconos.
- Vista previa de hasta 12 elementos en cuatro columnas; orden por nombre.
- Lectura de un máximo de 512 entradas.
- Apertura de carpetas y archivos mediante aplicaciones predeterminadas.
- Corrección del fallo de clics: GNOME rechaza abrir un menú vacío; se añade una entrada provisional antes de abrir y cargar el contenido.
- Ajustes manuales de tamaño y alineación. La posición fija no seguía el crecimiento del dock, por lo que se reemplazó en la versión 2.

## Propuestas sin implementar

- Validar visualmente el stack y la nueva reserva de espacio implementados en v4.
- Miniaturas y configuración de carpetas adicionales.
