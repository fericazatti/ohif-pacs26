# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

This is a fork of [OHIF Viewer](https://ohif.org/) v3, an open-source medical imaging viewer. The repo is a Lerna monorepo managed with Yarn workspaces. All institutional customizations live on the `dev` branch (5 commits ahead of upstream, not pushed).

This viewer is part of the **INTECNUSPACS** system: a hospital VNA PACS (200TB+) deployed at INTECNUS. It integrates with:
- **dcm4chee** — DICOMweb PACS backend (`https://10.73.173.205:8443/dcm4chee-arc`, AET `DCM4CHEE`)
- **Keycloak** — authentication (OpenID Connect), hosted at `dicomsecurity.intranet.intecnus.org.ar` (IP `10.73.173.205`, port `8843`), realm `dcm4che`
- **HEROS** — buscador de estudios (React + FastAPI) que genera los enlaces directos al viewer. Vive en `/home/cneapacs/frontend/{frontend,backend}` y se orquesta con `/home/cneapacs/frontend/docker-compose.yml` junto con este viewer. **Ver `/home/cneapacs/frontend/HEROS.md`** para la documentación completa del stack HEROS.
- **Nginx** — gateway upstream (fuera de `docker-compose.yml`) que rutea `/` → heros-frontend, `/api/` → heros-backend, `/viewer/` → este viewer

---

## Commands

```bash
# Install dependencies (run from repo root)
yarn install

# Development server
yarn dev

# Build for production
yarn build

# Run unit tests
yarn test:unit

# Run a single unit test file
cd platform/app && yarn test:unit --testPathPattern="<filename>"

# Run E2E tests (Cypress)
yarn test:e2e

# Lint / format
yarn run prettier --check .
```

> **IMPORTANT:** Any change to React/OHIF source code requires `docker compose build` to take effect in production — a container restart is NOT enough.

---

## Monorepo Structure

```
extensions/          # Feature modules (rendering, SR, SEG, RT, PDF, video, etc.)
modes/               # Viewer workflow configurations (basic, longitudinal, segmentation, etc.)
platform/
  app/               # Main PWA application (entry point, routing, config loading)
  core/              # Business logic: services, managers, utilities
  ui-next/           # Modern component library (Radix UI + Tailwind + shadcn/ui)
  ui/                # Legacy component library
  i18n/              # Internationalization (i18next)
```

---

## Architecture: How Extensions and Modes Work

The viewer uses a plugin system. Extensions register UI panels, viewports, commands, and toolbar buttons. Modes compose extensions into specific workflows.

**Boot sequence:**
1. `platform/app/src/index.js` loads config and renders `<App>`
2. `App.tsx` initializes `ExtensionManager`, `CommandsManager`, `HotkeysManager`, and `ServicesManager`
3. `appInit()` registers all extensions and modes, sets up services
4. Routes are created from loaded modes; each mode defines its layout, toolbars, and panels

**Active extensions/modes** are listed in `platform/app/pluginConfig.json`. The `pluginImports.js` file is auto-generated from this config at build time.

**Key managers** (in `@ohif/core`):
- `ExtensionManager` — registers and looks up extension modules
- `CommandsManager` — executes named commands across extensions
- `HotkeysManager` — keyboard shortcut bindings
- `ServicesManager` — dependency injection container for all services

**Key services** (registered in `platform/app/src/appInit.js`):
- `DisplaySetService` — manages study display sets
- `ViewportGridService` — viewport layout state
- `HangingProtocolService` — controls how studies are displayed
- `MeasurementService` — annotations and measurements
- `ToolbarService` — toolbar state management
- `PanelService` — side panel registration

---

## Nginx Routing (Critical)

The Nginx gateway (`ohif-prod-new` container, port 443) routes:
- `/` → React frontend app
- `/api/` → Django backend
- `/viewer/` → this OHIF viewer

**Rules:**
- OHIF URLs **must end with `/`** to match Nginx `location` blocks.
- Direct study URL: `https://.../viewer/viewer?StudyInstanceUIDs={uid}` (double `/viewer/` because of `routerBasename`).
- `routerBasename` is **`/viewer`** — this is critical and must not change.
- `docker-compose.yml` must maintain `dicomsecurity.intranet.intecnus.org.ar → 10.73.173.205` in `extra_hosts`.

---

## App Configuration

Runtime config files live in `platform/app/public/config/`. The active config is set via the `APP_CONFIG` env var or URL query param.

### `dicomweb-server.js` (main production config — customized)

Key settings:
```js
routerBasename: '/viewer'           // CRITICAL — must match Nginx location
maxNumberOfWebWorkers: 6            // optimized for intranet CPU-bound DICOM decoding
maxCacheSize: 3221225472            // 3 GB — room for large CT + prior without evictions
maxNumRequests: { interaction: 12, thumbnail: 6, prefetch: 10, compute: 6 }
useNorm16Texture: true
strictZSpacingForVolumeViewport: false
investigationalUseDialog: { option: 'never' }  // disables investigational use banner
showPatientInfo: 'visibleReadOnly'
// Logo via whiteLabeling.createLogoComponentFn → /viewer/logo-institucion-gray.png
```

**Why these `maxNumRequests` values (2026-04-10 tuning):** the previous config had `interaction: 100, thumbnail: 75` which sounds faster but is actually worse — with only 6 workers, anything beyond ~2× workers only piles up in the queue, holding references to decoded pixel data and triggering GC pauses that freeze the UI during MPR volume loads. The rule-of-thumb is `~2× maxNumberOfWebWorkers` for the dominant request type. These values are read in `extensions/cornerstone/src/init.tsx` and applied to `imageLoadPoolManager.maxNumRequests`.

---

## Custom Modifications in This Fork

All changes are on `dev` branch. **Before touching any file, check if it's in this list.**

### New Components (untracked in git)

#### `BlendModeMenu` — `extensions/cornerstone/src/components/BlendModeMenu/`
- Files: `BlendModeMenu.tsx`, `BlendModeMenuWrapper.tsx`, `index.ts`
- Volumetric blend mode selector: **MIP / MinIP / Average**
- Integrated slab thickness (mm) control
- Syncs CrosshairsTool config so handle dragging respects the chosen mode
- Falls back to the active viewport if no `viewportId` is passed

#### `MPRProjectionControls` — `extensions/cornerstone/src/components/MPRProjectionControls/`
- Files: `MPRProjectionControls.tsx`, `MPRProjectionControlsViewportOverlay.tsx`, `index.ts`
- Buttons: **MIP / MinIP / AVG** — clicking an active button **toggles it off** (deactivates projection)
- On deactivation: blend mode resets to `COMPOSITE`, slab resets to 0.5 mm
- On activation: always sets slab to `DEFAULT_SLAB_THICKNESS` (10 mm) if current slab < 1 mm, ensuring the projection effect is immediately visible
- Slab slider appears only when a mode is active; hidden when no mode is selected
- **Non-linear slider** (cubic curve):
  - 0–50% of slider → 0.5–13 mm (fine precision at low values)
  - 50–100% of slider → 13–100 mm
- Mouse wheel on slider also adjusts slab thickness
- Syncs `slabThicknessBlendMode` in CrosshairsTool config of the toolGroup that owns the viewport, so dragging crosshair handles respects the chosen blend mode (critical — without this, handle-dragging always defaults to MIP)
- **Does NOT auto-activate any mode when MPR loads** — user must explicitly click a button. The previous auto-activate caused viewport flickering during volume loading.
- Accepts `viewportId` prop. When omitted, falls back to the active viewport.

**Per-viewport overlay rendering (2026-04-12):** previously this component lived as a popover under the MPR text button in the secondary toolbar (controlled the active viewport only). Now `MPRProjectionControlsViewportOverlay` wraps it and is mounted **inside `OHIFCornerstoneViewport.tsx`** at the bottom-center of every viewport. Each instance receives its own `viewportId` and keeps independent React state, so the radiologist can pick MIP on axial, MinIP on coronal, and AVG on sagittal in the same MPR layout. The overlay only renders when the cornerstone viewport reports `type === 'orthographic'`; otherwise returns `null`. Subscriptions used to detect orthographic state: `viewportGridService` LAYOUT_CHANGED / GRID_STATE_CHANGED / VIEWPORTS_READY + `cornerstoneViewportService` VIEWPORT_DATA_CHANGED, all funneled through a single `requestAnimationFrame` to avoid stale checks.

The MPR text button itself (`MPRTextButton` in `getToolbarModule.tsx`) was simplified at the same time: the popover was removed and the text "MPR" was replaced by the `layout-advanced-mpr` icon (the same one shown in the change-layout menu). The button retains its green "active" styling when an orthographic viewport is selected.

#### `IrregularSpacingWarningOverlay` — `extensions/cornerstone/src/components/IrregularSpacingWarning/`
- Files: `IrregularSpacingWarningOverlay.tsx`, `index.ts`
- Per-viewport amber badge "Espesor irregular" rendered top-center, only on `orthographic` (MPR) viewports whose displaySet has the `IRREGULAR_SPACING` or `MISSING_FRAMES` message.
- Hover expands a tooltip explaining (in Spanish) that coronal/sagittal may look squashed because cornerstone uses average spacing for the whole volume.
- Mounted inside `OHIFCornerstoneViewport.tsx` next to the MPR overlay. Subscribes to the same viewportGrid + cornerstoneViewport events through a single `requestAnimationFrame`.
- **Critical detail:** message lookups use the numeric `DisplaySetMessage.CODES` constants imported from `@ohif/core`, NOT the string names. `messageList.includesMessage(DisplaySetMessage.CODES.IRREGULAR_SPACING)` is the correct API. The first version compared against string IDs and silently never matched.
- Paired with a tighter warning threshold in `extensions/default/src/utils/validations/areAllImageSpacingEqual.ts`: a local `_getSpacingIssueWarn` with `WARN_SPACING_TOLERANCE = 0.05` (5%) replaces the shared `_getSpacingIssue` so warnings fire on volumes that still pass the 20% reconstructable gate but render distorted in MPR.

### Viewport overlay — slice technical params (2026-04-12)

**File:** `extensions/cornerstone/src/customizations/viewportOverlayCustomization.tsx`

Three new items appended to `viewportOverlay.bottomRight` (after `InstanceNumber`):

- **`Loc:`** — slice location in mm. Reads `instance.SliceLocation`, falls back to `instance.ImagePositionPatient[2]`. Format: `123.4 mm`.
- **`Esp:`** — slice thickness (`SliceThickness`). Falls back to the displaySet's first instance if the current `instance` is missing it. Format: `1.25 mm`.
- **`Sp:`** — average spacing between frames (`displaySet.averageSpacingBetweenFrames`, the value OHIF already computes in `isDisplaySetReconstructable`). Format: `2.50 mm`.

Each item has a `condition` so it returns `null` when the data doesn't exist (e.g. MPR coronal/sagittal where `instance` doesn't map to a real DICOM slice). All numbers go through `Number.isFinite` before `.toFixed()` to defend against malformed metadata. Labels are short Spanish abbreviations to keep the corner compact alongside the existing `I:` instance counter.

### DisplaySet splitting for mixed-acquisition CT series (2026-04-12)

**File:** `extensions/default/src/getSopClassHandlerModule.js`

**Problem:** some PACS deliver one DICOM Series containing multiple acquisitions (e.g. helical body scan + axial head/feet + secondary thick reconstructions + scouts). OHIF defaults to one displaySet per series, which makes the resulting volume non-reconstructable for MPR — the user gets *"The selected display sets could not be added to the viewport due to a mismatch in the Hanging Protocol rules"* and all four messages: inconsistent positions, irregular spacing, missing frames, not reconstructable. Real-world incident: a 1222-slice CT failed to open in MPR entirely.

**Solution:** in `getDisplaySetsFromSeries` we always emit the **full series** as the primary displaySet (so head-to-feet stack scroll keeps working as the radiologist expects). If that full displaySet is **not reconstructable**, we additionally emit a **secondary displaySet** containing the largest subset of instances sharing the same `(SliceThickness, ImageOrientationPatient)`. The subset is emitted only if it itself passes `isReconstructable` and represents <95% of the series (otherwise the split adds noise without benefit). The secondary displaySet's description is annotated with `[Xmm MPR]` so it's obvious in the thumbnail list which one to use for MPR.

Helper: `pickMprSubset(instances)` — groups by `(thickness, IOP)`, picks the largest group, requires ≥10 instances and ≥20 total instances in the series before considering a split. Returns `null` to fall through to legacy single-displaySet behavior.

**Why not force-reconstruct the full series?** The config already has `strictZSpacingForVolumeViewport: false`, which is the most aggressive cornerstone option. Beyond that, reconstructing a volume with truly mixed slice thicknesses produces visually wrong coronal/sagittal output (squashed slices, banding) — better to give the user two displaySets and let them choose: full stack for review, MPR-capable subset for measurements/reconstruction.

**Why thumbnails uniquely identifiable:** `ImageSet` constructor in `platform/core/src/classes/ImageSet.ts` calls `guid()` for each new instance, so the two displaySets get distinct `displaySetInstanceUID` values automatically — no manual UID handling needed.

### Modified Files (uncommitted as of 2026-04-10, updated 2026-04-12)

**Extensions:**
- `extensions/cornerstone/src/Viewport/Overlays/ViewportImageSliceLoadingIndicator.tsx`
- `extensions/cornerstone/src/Viewport/OHIFCornerstoneViewport.tsx` — mounts the per-viewport MPR overlay
- `extensions/cornerstone/src/commandsModule.ts`
- `extensions/cornerstone/src/getToolbarModule.tsx` — `MPRTextButton` reduced to icon-only, popover removed
- `extensions/cornerstone/src/hps/mpr.ts` — MPR hanging protocol
- `extensions/cornerstone/src/index.tsx`
- `extensions/default/src/Panels/StudyBrowser/PanelStudyBrowser.tsx`
- `extensions/default/src/Panels/StudyBrowser/PanelStudyBrowserHeader.tsx`
- `extensions/default/src/Panels/WrappedPanelStudyBrowser.tsx`
- `extensions/default/src/ViewerLayout/ViewerHeader.tsx` — INTECNUS branding
- `extensions/default/src/ViewerLayout/index.tsx` — header height fix + collapsed-panel side rails
- `extensions/default/src/getPanelModule.tsx`
- `extensions/default/src/getSopClassHandlerModule.js` — DisplaySet splitting for mixed-acquisition series
- `extensions/default/src/utils/validations/areAllImageSpacingEqual.ts` — tighter 5% warn threshold
- `extensions/cornerstone/src/customizations/viewportOverlayCustomization.tsx` — Loc/Esp/Sp items in bottomRight overlay

**Modes:**
- `modes/basic/src/index.tsx`
- `modes/basic/src/initToolGroups.ts` — custom tool groups
- `modes/basic/src/toolbarButtons.ts` — toolbar button definitions

**UI Components (ui-next):**
- `platform/ui-next/src/components/Header/Header.tsx`
- `platform/ui-next/src/components/SidePanel/SidePanel.tsx`
- `platform/ui-next/src/components/StudyBrowser/StudyBrowser.tsx`
- `platform/ui-next/src/components/StudyBrowserSort/StudyBrowserSort.tsx`
- `platform/ui-next/src/components/StudyItem/StudyItem.tsx`
- `platform/ui-next/src/components/Slider/Slider.tsx`
- `platform/ui-next/src/components/Numeric/Numeric.tsx`
- `platform/ui-next/src/components/Viewport/ViewportPane.tsx`
- `platform/ui-next/src/assets/fonts.css`

**Config/Build:**
- `platform/app/public/config/dicomweb-server.js`
- `platform/app/public/config/local-dev.js`
- `platform/app/public/html-templates/index.html`
- `platform/i18n/src/locales/en-US/SidePanel.json`
- `.webpack/rules/cssToJavaScript.js`
- `platform/app/.webpack/rules/extractStyleChunks.js`
- `platform/app/.webpack/rules/fontsToJavaScript.js`
- `dockerfile`
- `package.json` / `yarn.lock`
- `shellcomands.sh` — useful dev commands

**Assets:**
- `platform/app/public/assets/intecnus.png` — institutional logo

---

## Study Browser & Side Panel — Customizations (actualizado 2026-04-10)

Principios de diseño del sidebar: **ligero, discreto, veloz**. Tonos grises neutros sobre fondo `#1A1A1A`, verde institucional `#1FB250` solo como acento para el estado "abierto", tipografías pequeñas (`9–11px`) con peso variable para crear jerarquía sin gritar visualmente.

### Arquitectura del panel

```
SidePanel (ResizablePanel → w-full, sin header para tab única)
└── StudyBrowser
    ├── "Estudio abierto" (label con punto verde)
    │   └── StudyItem (accordion, borde-izq verde si activo)
    │       └── ThumbnailList (grid 2-col responsive)
    │
    ├── separador (border-t-2 #2A2A2A)
    │
    └── "Otros estudios" + badge de cantidad
        ├── <select> nativo (ordenado por fecha desc)
        └── StudyItem del prior seleccionado
            └── ThumbnailList (grid 2-col responsive)
```

### `Thumbnail.tsx` — miniaturas de serie

**Archivo:** `platform/ui-next/src/components/Thumbnail/Thumbnail.tsx`

**Preset `thumbnails` (imágenes):**
- Contenedor externo: `h-auto w-full` — ocupa todo el ancho de su celda en el grid
- Imagen: `w-full` + `aspectRatio: '1/1'` — siempre cuadrada, se estira para llenar la celda
- Padding interno: `p-[3px]`
- Área de texto: `h-[26px] w-full text-[9px]` — descripción con `text-ellipsis`, series number + numInstances con ícono

**Preset `list` (series sin imagen: SR, SEG, RT, etc.):**
- Altura `h-[40px]` con `w-full`
- Barra lateral `w-[4px]` como acento de color

**Preset `list` con `modality === 'DOC'` (informes médicos):**
- **Diseño dedicado**: reemplaza la barra lateral por un recuadro `32x32px` con fondo `bg-[#1F2C24]` y el ícono `Icons.Clipboard` (`h-[18px] w-[18px]`) en verde institucional `#1FB250`
- Descripción: `text-[12px] text-[#D0D0D8]` (fallback: "Informe médico")
- Subtítulo: etiqueta `DOC` verde + contador `"N archivo(s)"`
- **Crítico**: el renderizado genérico anterior (`Icons[countIcon]` en `h-3 w-3` sin altura explícita) resultaba en un ícono invisible dentro de un flex container con `h-[12px]`. Solución: detectar `modality === 'DOC'` en `renderListPreset` y usar `<Icons.Clipboard />` directamente con dimensiones fijas.

### `ThumbnailList.tsx` — grid/layout de miniaturas

**Archivo:** `platform/ui-next/src/components/ThumbnailList/ThumbnailList.tsx`

Tres bloques renderizados en orden:
1. **DOC** (`docItems`): `flex-col gap-[2px]` — cada documento como fila `list` con ícono clipboard grande
2. **Imágenes** (`thumbnailItems`): `grid grid-cols-2 gap-[3px]` — exactamente 2 columnas, llenan el ancho del panel sin huecos
3. **Otros sin imagen** (`listItems`): `flex-col gap-[2px]` — SR/SEG/RT como filas

### `StudyBrowser.tsx` — estructura general y ordenamiento

**Archivo:** `platform/ui-next/src/components/StudyBrowser/StudyBrowser.tsx`

**Secciones diferenciadas:**
- **"Estudio abierto"**: label en `text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A7A88]` con punto verde `7x7px`
- **Separador**: `border-t-2 border-[#2A2A2A]` sin margen lateral (línea completa) + `mt-3`
- **"Otros estudios"**: mismo estilo de label + badge con cantidad en `bg-[#2E2E2E]`
- `<select>` nativo: `text-[10px]` con `border-[#2A2A2A] bg-[#1A1A1A]`

**Ordenamiento por fecha (crítico):**
```ts
.sort((a, b) => (b.studyDate || '').localeCompare(a.studyDate || ''))
```
- **NO** usar `Date.parse(b.date)`: `date` ya viene formateada localmente (`"10-Abr-2024"` en español) y `Date.parse` la rechaza → orden roto
- `studyDate` es el `StudyDate` DICOM raw (`YYYYMMDD`), cadena lexicográficamente ordenable
- Se propaga desde `PanelStudyBrowser._mapDataSourceStudies` y se preserva a través de `createStudyBrowserTabs` (que hace `Object.assign({}, study, ...)`)

**Estado local:**
- `activeStudyUid`: cuál está "abierto" — controla el borde izquierdo verde
- `selectedPriorUID`: cuál prior está visible; al cambiar dispara `onClickStudy(uid)` si no estaba expandido aún
- Después de cambiar prior: `setTimeout(250ms)` → `cornerstoneViewportService.resize()` para evitar coordenadas de tools desalineadas

### `StudyItem.tsx` — tarjeta individual de estudio

**Archivo:** `platform/ui-next/src/components/StudyItem/StudyItem.tsx`

- Accordion trigger: `bg-[#202020] hover:bg-[#282828]`, padding `px-2.5 py-2`
- Flecha: `h-3 w-3 text-[#505050]` (discreta)
- Descripción: `text-[11px] text-[#D0D0D8] break-words` — wrappea múltiples líneas, no trunca
- Fecha: `text-[9px] text-[#606068]` a la izquierda
- Modalidad: `text-[9px] text-[#505058]` a la derecha
- Borde izquierdo de la tarjeta envolvente (en StudyBrowser): `3px`, verde `#1FB250` si activo, `#2E2E2E` si no

### `PanelStudyBrowser.tsx` — mapeo de datos

**Archivo:** `extensions/default/src/Panels/StudyBrowser/PanelStudyBrowser.tsx`

**`actuallyMappedStudies`** (línea ~142): agrega el campo `studyDate` con el `StudyDate` DICOM raw (sin formatear) para permitir ordenamiento correcto en `StudyBrowser.tsx`.

**`_mapDisplaySets`**: separa display sets en 3 arrays (`docDisplaySets`, `thumbnailDisplaySets`, `thumbnailNoImageDisplaySets`) y retorna `[...doc, ...thumbnail, ...noImage]` para que los informes queden arriba. Los DOC reciben `countIcon: 'Clipboard'` (aunque actualmente el renderizado los detecta por `modality === 'DOC'`).

### `SidePanel.tsx` — contenedor responsive

**Archivo:** `platform/ui-next/src/components/SidePanel/SidePanel.tsx`

- `createBaseStyle`: `width: '100%', maxWidth: '100%'` (antes era `${n}px` fijo, impedía el resize responsive)
- Header oculto para paneles de una sola tab: `{tabs.length > 1 && getOpenStateComponent()}`
- Anchos iniciales en `constants/panels.ts`: `210px` (izquierdo + derecho), mínimo derecho `145px`

---

## Loading Indicator (`ViewportImageSliceLoadingIndicator.tsx`)

File: `extensions/cornerstone/src/Viewport/Overlays/ViewportImageSliceLoadingIndicator.tsx`

**Behavior (as of 2026-04-10):** Non-blocking progressive loading.

- **Does NOT block the viewport** — images appear as they arrive from the network. The user can scroll through already-loaded slices while the rest are downloading.
- A **thin green bar (3px)** appears at the bottom edge of the viewport showing load progress.
- A small **`● XX%` badge** sits at the bottom-right corner with a pulsing green dot.
- Both disappear automatically when loading completes (or all images were already cached).
- Progress updates are **throttled on a 200ms floor** (time-based, not percentage-based) so that series with 1000+ slices still only re-render ~5×/second regardless of decode rate.

**Previous behavior (replaced):** A full opaque black overlay (`bg-[#141414] z-50`) blocked the entire viewport until 100% loaded. This caused perceived freezing on large series and a jarring "blink" when the overlay disappeared.

**Key implementation notes:**
- `cache.isLoaded(id)` seeds the initial count so revisiting a cached study skips the indicator entirely.
- `IMAGE_VOLUME_LOADING_COMPLETED` event acts as a backstop for volume viewports in case individual `IMAGE_LOADED` events are missed.
- `pointer-events-none` on the indicator container ensures it never blocks viewport interactions.
- **CRITICAL — stable effect deps:** the progress-tracking `useEffect` depends on a `viewportKey` derived via `useMemo` from `imageIds.length + first + last`, **not** on the raw `viewportData` object. Using `viewportData` directly re-runs the effect every time the viewport emits (hundreds of times per load) which resets the progress, re-scans the cache, and re-subscribes listeners — this is what caused the **MPR flicker** where images seemed to never appear. The memoized key only changes when the actual image list changes.

---

## Build Gotchas

### `fonts.css` — rutas `url()` relativas al CSS raíz, no al archivo

Archivo: `platform/ui-next/src/assets/fonts.css`

Las reglas `@font-face` usan:
```css
src: url('assets/woff2/latin.woff2') format('woff2');
```

**No** usar `url('./woff2/latin.woff2')` aunque parezca lo correcto visto desde `fonts.css`. Razón: `fonts.css` se inlinea en `platform/ui-next/src/tailwind.css` vía `@import './assets/fonts.css'`, y `postcss-import` resuelve las `url()` relativas al **CSS raíz** (`tailwind.css`, en `src/`), no a la ubicación original de `fonts.css` (`src/assets/`).

**Síntoma del error (incidente 2026-04-11):**
```
ERROR in ../../ui-next/src/tailwind.css
Module not found: Error: Can't resolve 'woff2/latin.woff2' in '.../platform/ui-next/src'
HookWebpackError: Cannot find module 'woff2/latin.woff2'
```

El `yarn build` aborta con 2 errores en `tailwind.css:5:36-81`. Fix: mantener las 5 reglas con `assets/woff2/latin.woff2`.

### Recreación del contenedor tras `docker compose build`

El contenedor `ohif-prod-new` puede quedar asociado a un proyecto de compose distinto al actual (por corridas previas con otro directorio/nombre de proyecto). En ese caso `docker compose up -d ohif-main` falla con `Conflict. The container name "/ohif-prod-new" is already in use`, incluso con `--force-recreate`, porque compose no reconoce al contenedor como propio.

Secuencia correcta en ese caso:
```bash
docker stop ohif-prod-new && docker rm ohif-prod-new
cd /home/cneapacs/frontend && docker compose up -d ohif-main
```

Hay ~5–10 s de downtime del viewer entre el `stop` y el `Started`.

### `ViewerLayout` — altura y typo de `calc()` (incidente 2026-04-12)

`extensions/default/src/ViewerLayout/index.tsx` calcula la altura del contenedor de viewports como `100vh - <header>`. Tenía dos bugs encadenados que cortaban la parte inferior:

1. **Paréntesis faltante**: `style={{ height: 'calc(100vh - 52px' }}` — sin el `)` el valor CSS es inválido y el navegador lo ignora silenciosamente, dejando el div con `height: auto`.
2. **Altura desactualizada**: `Header.tsx` ahora es `h-[72px]` (rediseñado), no 52px. Aunque el `calc` estuviera bien escrito, el viewport quedaba 20px más alto que el espacio disponible y se desbordaba.

Fix: `style={{ height: 'calc(100vh - 72px)' }}`. **Si en el futuro se cambia la altura del Header, hay que actualizar este número** — no hay una variable compartida (sería bueno tenerla, pendiente).

### `refreshToolbarState` evalúa TODOS los botones registrados (gotcha)

`platform/core/src/services/ToolBarService/ToolbarService.ts:303` itera `Object.values(this.state.buttons)` — es decir, **todo lo que pasaste a `toolbarService.register()`**, no solo los botones visibles en alguna `toolbarSection`. Cada botón corre su `evaluate.*` en cada refresh.

Implicancia: si un modo registra una lista de botones que referencia evaluate functions de extensiones que el modo no carga (ej. `evaluate.cornerstone.hasSegmentation` desde `extension-cornerstone-dicom-seg`), el viewer tira `Evaluate function not found for name: ...` aunque el botón nunca llegue a renderizarse.

Pasó al crear el modo `patient` reusando `basicToolbarButtons` entero. Fix: filtrar la lista al subset que el modo realmente usa antes de exportarla — ver `modes/patient/src/toolbarButtons.ts` con su `KEEP_IDS`.

### `pluginImports.js` solo se regenera al arrancar webpack

`platform/app/src/pluginImports.js` lo genera `platform/app/.webpack/writePluginImportsFile.js`, llamado desde `webpack.pwa.js` al inicio del bundling. Después de agregar/remover una entrada en `pluginConfig.json` **hay que reiniciar `yarn dev`** — el hot-reload no lo regenera, el modo nuevo no aparece y la URL devuelve 404.

---

## Modo `patient` — visualizador minimal para pacientes (2026-04-12)

Modo paralelo a `basic`, pensado para el link que reciben los pacientes desde HEROS. Solo lectura, navegación con mouse, sin tools de procesamiento ni anotación.

### Estructura del paquete

```
modes/patient/
├── package.json         # @ohif/mode-patient, peer dep en @ohif/mode-basic
├── babel.config.js      # idéntico a basic
└── src/
    ├── id.js
    ├── initToolGroups.ts    # un solo toolGroup 'default'
    ├── toolbarButtons.ts    # filter() sobre el array de basic
    └── index.tsx            # routeName 'patient', layout sin panel derecho
```

`modes/*` ya estaba en `workspaces.packages` del root `package.json`, así que `yarn install` lo descubre automáticamente. Solo hay que registrarlo en `platform/app/pluginConfig.json` y reiniciar `yarn dev`.

### Decisiones de diseño

- **`routeName: 'patient'`** → URL final `https://dicomviewer.intranet.intecnus.org.ar/viewer/patient?StudyInstanceUIDs=...`. HEROS arma este prefijo cuando el link es para paciente; el de médico sigue siendo `/viewer/basic` (o el alias actual). Nginx ya rutea todo `/viewer/*` al contenedor, no hay que tocar el gateway.
- **Un solo `toolGroup` 'default'**, no `mpr` ni `volume3d` ni `SRToolGroup`. Active: `StackScroll` (Primary + Wheel + 3 dedos), `Pan` (Auxiliary), `Zoom` (Secondary + 2 dedos). Passive: `WindowLevel`. Enabled: `ImageOverlayViewer`. **Nada** de measurement / segmentation / freehand / probe / advanced magnify.
- **Toolbar reusa `basicToolbarButtons` filtrado** por un `KEEP_IDS` set: `StackScroll`, `WindowLevel`, `Zoom`, `Pan`, `Reset`, `orientationMenu`, `modalityLoadBadge`, `windowLevelMenu`. Filtrar es **obligatorio** por el gotcha de `refreshToolbarState` (ver sección de Build Gotchas).
- **`toolbarSections`**: solo `primary` (4 herramientas de mouse) + `primaryRight` (`Reset`) + 3 viewport-action overlays (`orientationMenu` arriba-izq, `modalityLoadBadge` arriba-der, `windowLevelMenu` abajo-izq). Sin `secondary` (no MPR, no Layout, no Crosshairs), sin `MeasurementTools`, sin `MoreTools`, sin `AdvancedRenderingControls`.
- **Layout**: `leftPanels: [thumbnailList]` con `leftPanelClosed: false` (el paciente puede tener varias series y necesita cambiarlas). `rightPanels: []`. Sin segmentation panel ni measurements panel.
- **`extensionDependencies`** mínimas: `extension-default`, `extension-cornerstone`, `extension-dicom-pdf`, `extension-dicom-video`. **No** se incluyen `dicom-sr`, `dicom-seg`, `dicom-pmap`, `dicom-rt`, `measurement-tracking`. Esto es lo que disparó el error de `evaluate.cornerstone.hasSegmentation` antes de filtrar los botones.
- **`sopClassHandlers`**: imágenes (stack), video, microscopy WSI, PDF. Cuando llega un estudio con SR/SEG/RT, el handler no está registrado y simplemente no se renderiza ese display set — el paciente ve la serie de imágenes base sin la capa de anotaciones del médico.
- **`enableSegmentationEdit: false`** defensivo (los paneles de seg ni siquiera están en el layout, pero por las dudas).
- **`onModeEnter`** simplificado: solo `clearMeasurements()`, `initToolGroups()`, registro de toolbar y la customization de seg disable. No registra `panelService.addActivatePanelTriggers` (no hay paneles que activar).
- **`onModeExit`** mínimo: destruye toolGroup / syncGroup / cornerstoneViewportService como basic, sin el cleanup de subscriptions de paneles.

### Cuándo querrías tocar este modo

- Si HEROS empieza a generar links con un parámetro extra (ej. `?showInfo=full`), el modo necesita leerlo en `onModeEnter` y propagarlo.
- Si los pacientes piden poder hacer una medición simple (regla en mm), agregar `Length` al toolGroup default + a `MeasurementTools` section + al `KEEP_IDS` set. Pero entonces ya no es "minimo minimo".
- Si llegás a registrar evaluates de extensiones nuevas en `basicToolbarButtons` que el filtro no excluya correctamente, va a volver a tirar el error de "Evaluate function not found". El test rápido es: cargar `/viewer/patient?...` y mirar la consola.

---

## Visual Theme

- **Dark theme** with INTECNUS green accent
- Tailwind customized in `ui-next/tailwind.config.js` and `ui/tailwind.config.js`

---

## Authentication (Keycloak)

- Keycloak hosted at `dicomsecurity.intranet.intecnus.org.ar` (IP `10.73.173.205`, port `8843`)
- `oidcConfig` (App.jsx), `KEYCLOAK_ISSUER`/`AUDIENCE` (.env), and `oidc` block (app-config.js) **must stay in sync**
- `JWKS_URL` must include port `:8843` and `verify=False` for internal certificates
- All axios/fetch requests must include `Authorization: Bearer ${token}`

---

## DICOM Rules (dcm4chee — Critical)

- **Never partial PUT**: always GET → modify locally → PUT the full object. A partial JSON payload silently deletes all absent metadata.
- **PatientID is immutable**: do not attempt to change it via PUT. Use POST transactional flows.
- **Clean JSON before PUT**: use `clean_dicom_json` to remove tags without `Value` or with `null`. The dcm4chee Jackson parser is strict.
- **DICOM hierarchy**: Patient → `/api/v1/patients/`, Study → `/api/v1/studies/`. Do not mix attributes from different levels in the same payload.

---

## Tech Stack

- **React 18** + TypeScript, **React Router v6**
- **Webpack 5** + Babel (experimental rsbuild also available via `yarn dev:fast`)
- **Tailwind CSS** + Radix UI (ui-next), custom components (ui)
- **Cornerstone3D** for medical image rendering
- **Zustand** for local state, **PubSub** for cross-service events
- **Keycloak** for authentication (via OpenID Connect)
- **Cypress** for E2E tests, **Jest** for unit tests
