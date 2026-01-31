# PROYECTO: Custom OHIF Viewer (v3)

## 1. PERFIL TÉCNICO

- **Arquitectura:** Monorepo (Yarn Workspaces).
- **Framework:** React 17/18 + TypeScript.
- **Estilos:** Tailwind CSS (Híbrido: Configuración Legacy y UI-Next).
- **Iconografía:** SVGs personalizados (React Components).
- **Estado:** En desarrollo activo con personalización profunda de UI/UX.

## 2. MAPA DE MODIFICACIONES (Hot Spots)

Estos archivos han sido modificados manualmente y contienen la lógica personalizada del proyecto.
**NO SOBREESCRIBIR SIN ANALIZAR PRIMERO:**

- Configuración de UI (Colores): `platform/ui/tailwind.config.js`
- Iconos (MPR Custom): `platform/ui-next/src/components/Icons/Sources/Layout.tsx`
- Barra de Herramientas: `modes/basic/src/toolbarButtons.ts`
- Orden de Herramientas: `modes/basic/src/index.tsx`
- Info Paciente: `extensions/default/src/ViewerLayout/HeaderPatientInfo/HeaderPatientInfo.tsx`

## 3. REGLAS DE DESARROLLO (Specific Guidelines)

### A. Gestión de Colores (Theming)

- **Fuente de la Verdad:** El archivo maestro de colores es `platform/ui/tailwind.config.js`.
- **NO inventar colores hex:** Usar siempre las variables definidas en Tailwind (ej: `bg-secondary-dark`, `text-primary-light`).
- **Paneles Laterales:** Los encabezados usan `secondary.dark`. Las pestañas activas usan `customblue.40`.
- **Importante:** Cualquier cambio en `tailwind.config.js` requiere reiniciar el servidor de desarrollo (`yarn run dev`).

### B. Iconografía

- **Sistema:** No usar archivos `.svg` sueltos. Los iconos son componentes React exportados en `platform/ui-next/src/components/Icons/Sources`.
- **Modificar Iconos:** Para cambiar un icono (ej. MPR), editar el componente React directamente (ajustar `path`, `opacity`, `strokeWidth`).
- **Registro:** Para usar un icono nuevo, registrar su ID en `modes/basic/src/toolbarButtons.ts`.

### C. Estructura del Header

- El orden de los botones en `modes/basic/src/index.tsx` sigue el flujo de trabajo radiológico:
  1. Configuración (Layout/MPR)
  2. Navegación (Scroll/WindowLevel)
  3. Manipulación
  4. Medición

## 4. COMANDOS ÚTILES

- Iniciar entorno dev: `yarn run dev`
- Docker (Build): Ver `dockercommands.txt`
- Servidor DICOM Local: Configurado en `platform/app/public/config/local-dev.js`

## 5. CONTEXTO DE NEGOCIO

El objetivo es un visor optimizado para radiólogos. La prioridad es la ergonomía (botones grandes, alto contraste) y la claridad en la información del paciente (Panel Izquierdo y Header).
