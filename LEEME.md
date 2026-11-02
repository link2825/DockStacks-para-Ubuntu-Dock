# DockStacks — versión 5 para GNOME 50

## Gestor visual

Descomprime el proyecto y ejecuta desde su carpeta:

```bash
bash abrir-instalador.sh
```

Pulsa **Instalar / actualizar**, cierra sesión y vuelve a entrar. Se añade **DockStacks** al menú de aplicaciones. Desde esa ventana podrás habilitar o deshabilitar la extensión y abrir **Personalizar iconos**.

Cambia los iconos del stack y de las tres carpetas mediante nombres del tema o imágenes PNG/SVG, con vista previa y restauración individual. Las imágenes elegidas se copian a los datos de DockStacks. Una vez cargada v5 los cambios son inmediatos.

Si faltan dependencias:

```bash
sudo apt install python3-gi gir1.2-gtk-4.0 gir1.2-adw-1 libglib2.0-bin
```

Abre el gestor sin sudo. Ubuntu Dock debe estar habilitado y GNOME Shell debe ser versión 50. El UUID anterior se conserva para actualizar tu instalación. También puedes usar `bash instalar.sh`.

Consulta README.md para detalles y limitaciones. El gestor y los nuevos iconos todavía requieren una prueba visual en GNOME 50. Código bajo licencia MIT.
