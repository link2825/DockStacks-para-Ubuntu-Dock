# DockStacks 12.0.0 — Títulos visibles al pasar el ratón

## Corrección

Los cuatro controles de DockStacks ahora usan una etiqueta con el estilo nativo del dock: **Aplicaciones abiertas**, **Descargas**, **Documentos** e **Imágenes**.

La etiqueta se mide antes de calcular su posición, se registra en la capa superior de GNOME Shell y se coloca fuera del icono, dentro del monitor. Al moverse entre controles, la salida del icono anterior ya no puede ocultar el título del nuevo. Se oculta al retirar el ratón o al eliminar el control. También se mantiene la etiqueta de las aplicaciones dentro del stack.

## Actualizar desde la versión 11

1. Abrir DockStacks y pulsar **Buscar actualizaciones**.
2. Debe aparecer **v12.0.0**. **Ver cambios** abre estas notas.
3. Pulsar **Actualizar ahora** y esperar la confirmación.
4. Cerrar el gestor, cerrar sesión completamente y volver a entrar.
5. Comprobar versión 12 y pasar el ratón por los cuatro controles.

Se conservan los iconos personalizados, ajustes y estado de habilitación. La revisión diaria sigue siendo opcional y no se activa al actualizar.

## Validación

Pruebas automatizadas de los cuatro textos, tamaño inicial sin asignación previa, capa superior, cambio rápido entre iconos, límites del monitor, orientación vertical y limpieza. También pasan las pruebas existentes y del actualizador. El 2 de noviembre de 2026, Manuel confirmó con éxito la detección e instalación 11 → 12 desde el gestor y la corrección visual después de cerrar sesión. Las capturas se conservan en docs/CAMBIO-v12-TITULOS.md.
