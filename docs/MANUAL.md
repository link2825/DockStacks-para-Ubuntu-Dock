# Manual del gestor DockStacks

## Controles de la extensión

| Control | Función |
| --- | --- |
| Instalar / actualizar | Instala o reinstala el paquete local incluido con el gestor. No descarga una versión nueva de GitHub. |
| Actualizar estado | Consulta el estado de la extensión en GNOME Shell. No actualiza el programa. |
| Habilitar | Muestra los controles de DockStacks en Ubuntu Dock. |
| Deshabilitar | Retira los controles y restaura la opción anterior de aplicaciones abiertas del dock. No desinstala. |
| Personalizar iconos | Cambia los cuatro botones mediante nombre del tema o PNG/SVG. |
| Restaurar iconos por defecto | Recupera los cuatro diseños propios, sin borrar imágenes ni alterar otros ajustes. |

Habilitar queda desactivado cuando la extensión ya está activa; Deshabilitar queda desactivado cuando está apagada.

## Actualizaciones de GitHub

| Control | Función |
| --- | --- |
| Buscar actualizaciones | Consulta la última Release estable del repositorio oficial. También se comprueba al abrir la ventana. |
| Revisar actualizaciones diariamente | Interruptor opcional, desactivado por defecto. Activa o detiene el temporizador de usuario. |
| Ver cambios | Abre las notas de la Release en GitHub. |
| Actualizar ahora | Descarga, verifica e instala la Release pendiente. Conserva ajustes e iconos y crea un respaldo. |
| Más tarde | Pospone el aviso durante 24 horas; puedes actualizar manualmente antes. |

No se descargan ni instalan actualizaciones sin pulsar Actualizar ahora. Las búsquedas sí consultan la API pública de GitHub. No se necesitan claves ni una cuenta GitHub para usar el actualizador.

Si activas la revisión diaria, se utilizan unidades `dockstacks-updates.timer` y `dockstacks-updates.service` de systemd de usuario. El equipo debe estar encendido y tener sesión de usuario y conexión. Tras encenderlo recupera revisiones pendientes; un pequeño retraso aleatorio evita que todas las instalaciones consulten a la misma hora. Desactivar el interruptor detiene las revisiones de fondo; la búsqueda al abrir el gestor se mantiene.

La notificación informa de la versión y te pide abrir DockStacks para actualizar. Una versión ya notificada no genera avisos repetidos. Si la red falla, no cambia el estado de la extensión.

## Títulos de los controles

Al pasar el ratón por los cuatro controles aparecen Aplicaciones abiertas, Descargas, Documentos e Imágenes. La versión 12 corrige su visibilidad y los sitúa fuera del botón con el estilo nativo del dock.

## Después de actualizar

Cierra DockStacks y cierra sesión completamente. Al volver a entrar, abre el gestor y comprueba la nueva versión. No es necesario cerrar sesión para habilitar/deshabilitar o personalizar iconos.

Los respaldos de actualización quedan en el directorio de estado del usuario, normalmente `~/.local/state/dockstacks/backup-*`. No contienen tus documentos personales; incluyen los archivos del gestor y extensión anteriores.
