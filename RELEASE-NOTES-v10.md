# DockStacks 10 estable

Primera publicación estable aprobada por el usuario tras completar sus pruebas en Ubuntu 26.04.1 LTS, GNOME Shell 50.1 y Ubuntu Dock.

## Novedades desde la versión 4 publicada

- Gestor visual para instalar, actualizar, habilitar/deshabilitar y consultar el estado real.
- Acceso persistente al gestor en el menú de aplicaciones.
- Icono propio y nombre reconocible de DockStacks.
- Cuatro iconos propios y personalización mediante nombres del tema o imágenes PNG/SVG.
- Vista previa, cambios inmediatos y restauración individual o global.
- Selector que busca imágenes en las subcarpetas del tema activo, incluidos temas personales.
- Nombre completo al pasar el ratón por los controles y aplicaciones.
- Clic derecho con Cerrar aplicación, menú anclado al icono y stack conservado.
- Consulta D-Bus corregida, errores visibles y apertura independiente del gestor.
- Esquemas compilados y pruebas automatizadas ampliadas.
- Tres capturas nuevas; la última es la portada del proyecto.

Se conserva el UUID y el número de versión de extensión 10 probado por el usuario. Solo se retiran las etiquetas de prueba y se actualiza la documentación e instalación estable.

## Instalación

Ejecutar `bash instalar-visual.sh`, cerrar sesión y volver a entrar. Para aplicar los nuevos diseños sobre personalizaciones anteriores, abrir Personalizar iconos y pulsar Restaurar iconos por defecto.

## Validación

Confirmación funcional del usuario, pruebas de lógica, sintaxis de Python/JavaScript/Bash, compilación estricta del esquema GSettings e integridad del ZIP. Las configuraciones de varios monitores, escalado y alta saturación del dock requieren validación adicional.
