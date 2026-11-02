# Versión 12: títulos de los controles y prueba del actualizador

## Incidencia comunicada

En la versión 11, Todoist muestra su título al pasar el ratón, mientras los controles añadidos por DockStacks no muestran los suyos. Capturas del equipo de Manuel:

![Referencia: Todoist muestra su título](capturas/10-referencia-titulo.webp)

![Incidencia previa: el stack de DockStacks no muestra el título](capturas/11-incidencia-titulo-dockstacks.webp)

Estas imágenes documentan el estado anterior a la corrección; no son capturas del resultado de la versión 12.

## Implementación

- Etiqueta nativa `dash-label`, coherente con GNOME Shell.
- Registro como top chrome y elevación al mostrarla para evitar quedar debajo del dock.
- Medición del tamaño preferido antes de posicionar; no se usa el tamaño transformado cero de una etiqueta recién creada.
- Posición fuera del botón, limitada al monitor; contempla orientación horizontal y vertical.
- Seguimiento del botón propietario para que un evento de salida tardío del icono anterior no oculte el título actual.
- Ocultación y limpieza al retirar el puntero o destruir los controles.

## Plan de prueba en el equipo

Con DockStacks 11 instalado, usar Buscar actualizaciones → Ver cambios → Actualizar ahora. No instalar manualmente el ZIP para esta prueba, pues queremos comprobar el actualizador real.

Después de la confirmación, cerrar el gestor y cerrar sesión. Al volver a entrar, comprobar la versión 12 y pasar el ratón por Aplicaciones abiertas, Descargas, Documentos e Imágenes, tanto lentamente como moviéndose entre ellos. Comprobar que el título desaparece al salir del dock y que no tapa los iconos.

Verificar que se conservaron iconos personalizados, habilitación y la preferencia de revisión diaria. Registrar el resultado y añadir una captura posterior cuando el usuario lo confirme.

## Resultado disponible

Pruebas de lógica y empaquetado superadas. Validación visual y actualización real 11 → 12 pendientes del usuario.
