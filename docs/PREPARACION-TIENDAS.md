# Preparación para distribución en catálogos — DockStacks v12

Estado: rama de preparación; **no publicar ni fusionar hasta superar pruebas reales**.

## Compatibilidad y dependencia
- Compatibilidad confirmada por el autor: Ubuntu 26.04 / GNOME Shell 50 con Ubuntu Dock.
- La extensión usa APIs internas de Ubuntu Dock, no una API estable pública. La protección de `_findDock()` comprueba los componentes necesarios antes de integrarse; no garantiza compatibilidad futura.
- Probar ausencia/desactivación/reinicio de Ubuntu Dock, cambio de orientación, varios monitores y escalado; confirmar restauración de `show-running`.
- No afirmar compatibilidad con otras versiones sin probar.

## Identidad
- Mantener UUID `carpetas-isla@manuel.local` para no romper actualizaciones y preferencias existentes.
- Nombre público: DockStacks para Ubuntu Dock. No cambiar UUID sin una migración comprobada y sin consultar requisitos del catálogo.

## Canales y actualizaciones
- **GitHub Releases**: paquete completo con gestor GTK4/libadwaita y actualizador integrado.
- **GNOME Extensions (candidato)**: solo archivos de `extension/`, sin instaladores ni actualizador externo. Actualizaciones gestionadas por GNOME Extensions.
- No ejecutar dos actualizadores sobre la misma instalación. Verificar migración/coexistencia antes de ofrecer ambos canales.
- Revisar las normas vigentes del catálogo y enviar a revisión solo después de validar el ZIP específico. El paquete completo de GitHub NO debe enviarse como ZIP de extensión.

## Validaciones obligatorias
1. Verificar sintaxis JS y XML del esquema; ejecutar las pruebas existentes.
2. Generar ZIP de extensión con metadata.json, extension.js, prefs.js, icon-paths.js, stylesheet.css, assets y schemas.
3. Comprobar que no contiene ejecutables, gestor Python, instalador ni artefactos ajenos.
4. Instalar en perfil limpio de Ubuntu 26.04; comprobar habilitar/deshabilitar, preferencias, scroll, ventanas, limpieza, restauración de configuración.
5. Verificar comportamiento al faltar Ubuntu Dock y tras actualizar desde una instalación previa.
6. Revisar cumplimiento de normas GNOME Extensions y enviar manualmente para revisión.

## Decisión de liberación
La versión v12.0.0 en `main` y la Release publicada permanecen sin cambios. Cualquier versión nueva requiere pruebas y aprobación explícita antes de fusionar o publicar.
