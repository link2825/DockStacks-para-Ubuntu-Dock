# Publicar una actualización de DockStacks

El actualizador consulta únicamente la última Release estable del repositorio `link2825/DockStacks-para-Ubuntu-Dock`. Los cambios en main sin una Release nueva no generan avisos.

## Preparar la siguiente publicación

1. Implementar y probar el cambio.
2. Incrementar el entero GNOME y la versión pública juntos: por ejemplo versión 12 de extensión y `12.0.0`.
3. Actualizar `extension/metadata.json`, `updates.py` (`APP_VERSION`) y `version.json` (version, extension_version, asset).
4. Añadir `RELEASE-NOTES-v12.md`, actualizar CHANGELOG y las etiquetas de versión del gestor.
5. Ejecutar las pruebas y `python3 empaquetar.py`; después `python3 build-release.py`.
6. Subir a main. El cambio en version.json ejecuta `.github/workflows/release.yml`.

El workflow ejecuta las pruebas, genera el paquete y crea la etiqueta/Release estable con `DockStacks-vN.0.0.zip` y `SHA256SUMS`. Usa el token efímero de GitHub Actions con permiso de escritura de contenido, sin credenciales personales. Si la Release ya existe la conserva, sin sobrescribir sus archivos. También se puede ejecutar manualmente desde Actions.

El proyecto usa `vN.0.0` para que el entero de GNOME y la comparación de versiones sean inequívocos. No publicar prereleases como estables. El SHA-256 del paquete se comprueba contra el digest calculado por GitHub.

## Prueba real del aviso

- Instalar la versión 11 y comprobar manualmente: debe informar que está al día cuando su Release esté publicada.
- Opcionalmente habilitar la revisión diaria y comprobar que el interruptor puede volver a apagarse.
- Publicar la siguiente versión con el cambio acordado con Manuel.
- Desde la versión 11 pulsar Buscar actualizaciones: debe ofrecer la versión nueva.
- Ver cambios, posponer o pulsar Actualizar ahora; después cerrar sesión y comprobar versión, iconos y estado de activación.

Si GitHub bloquea la edición de workflows o tiene Actions deshabilitado, la Release debe publicarse desde la web con la etiqueta, paquete y notas preparados. No simular una versión nueva ni notificar una actualización inexistente.
