# Alcance y limitaciones de la versión 10 estable

## Validación confirmada

Manuel confirmó el funcionamiento de la versión 10 en su equipo Ubuntu 26.04.1 LTS con GNOME Shell 50.1 y Ubuntu Dock, y autorizó su publicación como estable.

Las incidencias del gestor bloqueado, identificación genérica de DockStacks, menú contextual que sustituía el stack y selector que abría solo la raíz del tema se corrigieron durante las versiones 6–9. La versión 10 incorpora cuatro iconos propios y restauración global, comprobados por el usuario.

## Compatibilidad por ampliar

- Varios monitores y escalado alto.
- Dock vertical y configuraciones de ocultación automática diferentes.
- Muchos favoritos que saturen el dock.
- Carpetas con miles de elementos.
- Versiones de GNOME distintas de 50 y docks distintos de Ubuntu Dock.

La integración utiliza estructuras internas de Ubuntu Dock y puede requerir adaptación si cambian. Se integra en el monitor principal.

## Comportamiento esperado

- Después de instalar o actualizar hay que cerrar sesión completamente y volver a entrar.
- Las personalizaciones anteriores se conservan; Restaurar iconos por defecto aplica el conjunto propio.
- Las imágenes personalizadas se copian a los datos del usuario; restaurar iconos no las borra.
- El cierre de aplicaciones es normal: una aplicación puede mostrar un aviso de documentos sin guardar.
- El listado de carpetas no incluye archivos ocultos ni miniaturas del contenido.
- No incluye copiar, mover, borrar ni arrastrar y soltar.
