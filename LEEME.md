# DockStacks — versión 4 para GNOME 50

Integra Descargas, Documentos e Imágenes en Ubuntu Dock, después de las aplicaciones y con un separador. Conserva los paneles de vista previa. El tamaño sigue el tamaño de iconos del dock. No modifica los archivos de Ubuntu Dock. Mientras está activa, desactiva show-running para agrupar las aplicaciones en un stack y restaura su valor previo al desactivarse.

## Instalar o actualizar

Descomprime el paquete y ejecuta `bash instalar.sh` desde su carpeta. Cierra sesión completamente y vuelve a entrar: GNOME mantiene los módulos antiguos en memoria hasta salir de la sesión. Si hace falta, ejecuta `gnome-extensions enable carpetas-isla@manuel.local` después de volver a entrar.

Al desactivar esta versión se restaura el valor de show-running guardado antes de activar el stack. Si después quieres mostrar las aplicaciones individuales, usa:

```sh
gsettings set org.gnome.shell.extensions.dash-to-dock show-running true
```

## Stack de aplicaciones

Pulsa el botón morado de cuadrícula situado antes de las carpetas. Muestra todas las aplicaciones con ventanas (incluidas las favoritas), una por icono. Si solo hay una ventana la activa; si hay varias, permite seleccionar por título. Incluye cuatro columnas y scroll.

## Requisitos y límites

Ubuntu Dock habilitado, GNOME Shell 50. Usa su contenedor interno dashtodockBoxContainer; puede requerir ajustes si Ubuntu Dock cambia ese contenedor en otra versión. Se integra en el monitor principal. Sin Ubuntu Dock no aparece una barra independiente. Las posiciones y tamaño manuales anteriores se ignoran. Si cambia la estructura del dock, la extensión vuelve a buscarlo cada medio segundo. Los controles de carpetas y stack quedan fuera del área desplazable de aplicaciones. Se añade un ajuste reversible del presupuesto de espacio; requiere validación visual al saturar el dock.

Contenido completo (excepto archivos ocultos), por nombre, en cuatro columnas con desplazamiento vertical y barra lateral. Sin miniaturas. No hay límite de 12 elementos ni de 512 archivos leídos. La carga y construcción se hacen por lotes para ceder tiempo al escritorio. No modifica archivos ni carpetas hasta que eliges abrirlos con su aplicación predeterminada.

Validación: sintaxis JavaScript, instalador Bash y contenido de los ZIP. No se ha ejecutado esta versión en una sesión real de GNOME desde el entorno de desarrollo; el usuario confirmó la integración de la versión 2 y el scroll de la versión 3. La captura de v4 confirma el panel del stack. La selección entre varias ventanas y la reserva de espacio con muchos favoritos todavía necesitan validación. Las pruebas de lógica de agrupación, activación, restauración y presupuesto de espacio pasan con Node.js.

## Desactivar

```sh
gnome-extensions disable carpetas-isla@manuel.local
```

## Desinstalar

```sh
gnome-extensions uninstall carpetas-isla@manuel.local
```

Código bajo licencia MIT.
