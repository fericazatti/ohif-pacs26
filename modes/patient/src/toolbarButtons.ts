import type { Button } from '@ohif/core/types';
import { toolbarButtons as basicToolbarButtons } from '@ohif/mode-basic';

/**
 * Solo registramos los botones que el modo paciente realmente usa.
 * refreshToolbarState evalua TODOS los botones registrados (no solo los
 * visibles), asi que dejar la lista entera de basic dispara errores cuando
 * referencian evaluate functions de extensiones que no instalamos
 * (segmentation, measurement-tracking, SR, etc.).
 */
const KEEP_IDS = new Set([
  'StackScroll',
  'WindowLevel',
  'Zoom',
  'Pan',
  'Reset',
  'orientationMenu',
  'modalityLoadBadge',
  'windowLevelMenu',
]);

const toolbarButtons: Button[] = basicToolbarButtons.filter(b => KEEP_IDS.has(b.id));

export default toolbarButtons;
