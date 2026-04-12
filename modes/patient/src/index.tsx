import { ToolbarService, utils } from '@ohif/core';

import initToolGroups from './initToolGroups';
import toolbarButtons from './toolbarButtons';
import { id } from './id';

const { TOOLBAR_SECTIONS } = ToolbarService;
const { structuredCloneWithFunctions } = utils;

const NON_IMAGE_MODALITIES = ['ECG', 'SEG', 'RTSTRUCT', 'RTPLAN', 'PR', 'SR'];

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  thumbnailList: '@ohif/extension-default.panelModule.seriesList',
  hangingProtocol: '@ohif/extension-default.hangingProtocolModule.default',
  wsiSopClassHandler:
    '@ohif/extension-cornerstone.sopClassHandlerModule.DicomMicroscopySopClassHandler',
};

const cornerstone = {
  viewport: '@ohif/extension-cornerstone.viewportModule.cornerstone',
};

const dicomvideo = {
  sopClassHandler: '@ohif/extension-dicom-video.sopClassHandlerModule.dicom-video',
  viewport: '@ohif/extension-dicom-video.viewportModule.dicom-video',
};

const dicompdf = {
  sopClassHandler: '@ohif/extension-dicom-pdf.sopClassHandlerModule.dicom-pdf',
  viewport: '@ohif/extension-dicom-pdf.viewportModule.dicom-pdf',
};

const extensionDependencies = {
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-dicom-pdf': '^3.0.1',
  '@ohif/extension-dicom-video': '^3.0.1',
};

const sopClassHandlers = [
  dicomvideo.sopClassHandler,
  ohif.sopClassHandler,
  ohif.wsiSopClassHandler,
  dicompdf.sopClassHandler,
];

function isValidMode({ modalities }) {
  const modalities_list = modalities.split('\\');
  return {
    valid: !!modalities_list.find(modality => NON_IMAGE_MODALITIES.indexOf(modality) === -1),
    description: `Modo paciente: solo modalidades de imagen.`,
  };
}

function onModeEnter({ servicesManager, extensionManager, commandsManager }: withAppTypes) {
  const { measurementService, toolbarService, toolGroupService, customizationService } =
    servicesManager.services;

  measurementService.clearMeasurements();
  initToolGroups(extensionManager, toolGroupService, commandsManager);

  toolbarService.register(this.toolbarButtons);
  for (const [key, section] of Object.entries(this.toolbarSections)) {
    toolbarService.updateSection(key, section);
  }

  // Bloquear la edicion de cualquier panel de segmentacion (defensivo: no
  // deberia estar visible en este modo de todos modos)
  customizationService.setCustomizations({
    'panelSegmentation.disableEditing': { $set: true },
  });
}

function onModeExit({ servicesManager }: withAppTypes) {
  const { toolGroupService, syncGroupService, cornerstoneViewportService, uiDialogService, uiModalService } =
    servicesManager.services;

  uiDialogService.hideAll();
  uiModalService.hide();
  toolGroupService.destroy();
  syncGroupService.destroy();
  cornerstoneViewportService.destroy();
}

const toolbarSections = {
  // Solo herramientas de mouse: navegacion y brillo. Sin tools de medicion,
  // sin MPR, sin captura, sin "more tools".
  [TOOLBAR_SECTIONS.primary]: ['StackScroll', 'WindowLevel', 'Zoom', 'Pan'],

  // Single boton util en la derecha
  primaryRight: ['Reset'],

  // Overlays minimos sobre cada viewport (solo info de carga, no edicion)
  [TOOLBAR_SECTIONS.viewportActionMenu.topLeft]: ['orientationMenu'],
  [TOOLBAR_SECTIONS.viewportActionMenu.topRight]: ['modalityLoadBadge'],
  [TOOLBAR_SECTIONS.viewportActionMenu.bottomLeft]: ['windowLevelMenu'],
};

const patientLayout = {
  id: ohif.layout,
  props: {
    leftPanels: [ohif.thumbnailList],
    leftPanelClosed: false,
    leftPanelResizable: false,
    rightPanels: [],
    rightPanelClosed: true,
    rightPanelResizable: false,
    viewports: [
      {
        namespace: cornerstone.viewport,
        displaySetsToDisplay: [
          ohif.sopClassHandler,
          dicomvideo.sopClassHandler,
          ohif.wsiSopClassHandler,
        ],
      },
      {
        namespace: dicompdf.viewport,
        displaySetsToDisplay: [dicompdf.sopClassHandler],
      },
    ],
  },
};

function layoutTemplate() {
  return structuredCloneWithFunctions(this.layoutInstance);
}

const patientRoute = {
  path: 'patient',
  layoutTemplate,
  layoutInstance: patientLayout,
};

const modeInstance = {
  id,
  routeName: 'patient',
  hide: false,
  displayName: 'Paciente',
  toolbarSections,
  onModeEnter,
  onModeExit,
  validationTags: {
    study: [],
    series: [],
  },
  isValidMode,
  routes: [patientRoute],
  extensions: extensionDependencies,
  hangingProtocol: 'default',
  sopClassHandlers,
  toolbarButtons,
  // Defensivo: el modo no incluye paneles de segmentacion, pero por las dudas
  enableSegmentationEdit: false,
  nonModeModalities: NON_IMAGE_MODALITIES,
};

function modeFactory() {
  return modeInstance;
}

const mode = {
  id,
  modeFactory,
  modeInstance,
  extensionDependencies,
};

export default mode;
