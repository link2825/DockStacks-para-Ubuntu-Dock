# Historial de cambios

Las versiones son iteraciones del prototipo, no una declaración de estabilidad. Desarrollo inicial: 1–2 de noviembre de 2026.

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
