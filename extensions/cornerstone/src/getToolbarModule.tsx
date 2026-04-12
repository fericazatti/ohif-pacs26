import React, { useEffect, useState } from 'react';
import { Enums } from '@cornerstonejs/tools';
import { useSystem } from '@ohif/core';
import i18n from '@ohif/i18n';
import { utils, Icons } from '@ohif/ui-next';
import { ViewportDataOverlayMenuWrapper } from './components/ViewportDataOverlaySettingMenu/ViewportDataOverlayMenuWrapper';
import { ViewportOrientationMenuWrapper } from './components/ViewportOrientationMenu/ViewportOrientationMenuWrapper';
import { WindowLevelActionMenuWrapper } from './components/WindowLevelActionMenu/WindowLevelActionMenuWrapper';
import { VOIManualControlMenuWrapper } from './components/VOIManualControlMenu';
import { ThresholdMenuWrapper } from './components/ThresholdMenu/ThresholdMenuWrapper';
import { OpacityMenuWrapper } from './components/OpacityMenu/OpacityMenuWrapper';
import { BlendModeMenuWrapper } from './components/BlendModeMenu/BlendModeMenuWrapper';
import { MPRProjectionControls } from './components/MPRProjectionControls';
import ModalityLoadBadge from './components/ModalityLoadBadge/ModalityLoadBadge';
import NavigationComponent from './components/NavigationComponent/NavigationComponent';
import TrackingStatus from './components/TrackingStatus/TrackingStatus';
import ViewportColorbarsContainer from './components/ViewportColorbar';
import AdvancedRenderingControls from './components/AdvancedRenderingControls';

// Toggle de MPR como botón con ícono. Los controles de proyección
// (MIP/MinIP/AVG + slab) se renderizan ahora como overlay por viewport
// dentro de OHIFCornerstoneViewport, así son independientes en cada vista.
const MPRTextButton = ({ commands, disabled, onInteraction, tooltip }: any) => {
  const { servicesManager } = useSystem();
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;
  const [isOrtho, setIsOrtho] = useState(false);

  useEffect(() => {
    let raf = 0;
    const checkOrtho = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const id = viewportGridService.getActiveViewportId();
        const vp = id ? cornerstoneViewportService.getCornerstoneViewport(id) : null;
        setIsOrtho(vp?.type === 'orthographic');
      });
    };
    checkOrtho();
    const subs = [
      viewportGridService.subscribe(
        viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
        checkOrtho
      ),
      viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, checkOrtho),
      viewportGridService.subscribe(viewportGridService.EVENTS.LAYOUT_CHANGED, checkOrtho),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, checkOrtho),
      cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        checkOrtho
      ),
    ];
    return () => {
      cancelAnimationFrame(raf);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [viewportGridService, cornerstoneViewportService]);

  return (
    <button
      title={isOrtho ? 'Salir de MPR' : tooltip}
      disabled={disabled}
      onClick={() => !disabled && onInteraction?.({ commands })}
      className={`flex select-none items-center justify-center rounded border outline-none transition-colors duration-150 focus:outline-none disabled:opacity-30 ${
        isOrtho
          ? 'border-[#1FB250]/60 bg-[#1F2C24] text-[#1FB250]'
          : 'border-[#3A3A3A] bg-[#1F1F1F] text-white/75 hover:border-[#1FB250]/60 hover:text-[#1FB250]'
      }`}
      style={{ height: 26, width: 28 }}
    >
      <Icons.ByName
        name="layout-advanced-mpr"
        className="h-[22px] w-[22px]"
      />
    </button>
  );
};

const getDisabledState = (disabledText?: string) => ({
  disabled: true,
  disabledText: disabledText ?? i18n.t('Buttons:Not available on the current viewport'),
});

export default function getToolbarModule({ servicesManager, extensionManager }: withAppTypes) {
  const {
    toolGroupService,
    toolbarService,
    syncGroupService,
    cornerstoneViewportService,
    colorbarService,
    displaySetService,
    viewportGridService,
    segmentationService,
  } = servicesManager.services;

  return [
    {
      name: 'ohif.advancedRenderingControls',
      defaultComponent: AdvancedRenderingControls,
    },
    {
      name: 'evaluate.advancedRenderingControls',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        const hasColorbar = colorbarService?.hasColorbar(viewportId) || false;
        return {
          disabled: !hasColorbar,
        };
      },
    },
    {
      name: 'ohif.colorbar',
      defaultComponent: ViewportColorbarsContainer,
    },
    {
      name: 'ohif.trackingStatus',
      defaultComponent: TrackingStatus,
    },
    {
      name: 'evaluate.trackingStatus',
      evaluate: ({ viewportId }) => {
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        if (!displaySetUIDs?.length) {
          return {
            disabled: true,
          };
        }

        return {
          disabled: false,
        };
      },
    },
    // ModalityLoadBadge
    {
      name: 'ohif.modalityLoadBadge',
      defaultComponent: ModalityLoadBadge,
    },
    {
      name: 'evaluate.modalityLoadBadge',
      evaluate: ({ viewportId }) => {
        // We can't use useViewportDisplaySets hook here since we're in a non-React context,
        // but we'll follow the same pattern by getting only the display sets for this viewport
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        if (!displaySetUIDs?.length) {
          return {
            disabled: true,
          };
        }

        // Get the display sets that are specifically in this viewport
        const viewportDisplaySets = displaySetUIDs.map(uid =>
          displaySetService.getDisplaySetByUID(uid)
        );

        // Only show status for supported types like SR, SEG, RTSTRUCT
        const isSupportedType = viewportDisplaySets.some(
          displaySet =>
            displaySet?.Modality === 'SR' ||
            displaySet?.Modality === 'SEG' ||
            displaySet?.Modality === 'RTSTRUCT'
        );

        return {
          disabled: !isSupportedType,
        };
      },
    },
    // NavigationComponent
    {
      name: 'ohif.navigationComponent',
      defaultComponent: NavigationComponent,
    },
    {
      name: 'evaluate.navigationComponent',
      evaluate: ({ viewportId }) => {
        const { trackedMeasurementsService } = servicesManager.services;
        // Same logic as statusComponent - only show for SR, SEG, RTSTRUCT
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        if (!displaySetUIDs?.length) {
          return {
            disabled: true,
          };
        }

        // Get the display sets that are specifically in this viewport
        const viewportDisplaySets = displaySetUIDs.map(uid =>
          displaySetService.getDisplaySetByUID(uid)
        );

        // Check if there's a need for navigation:
        // 1. Segmentations are present (for SEG/RTSTRUCT navigation)
        // 2. There are tracked measurements in the viewport (for SR navigation)

        // Check for SEG/RTSTRUCT navigation
        const hasSegmentation =
          segmentationService.getSegmentationRepresentations(viewportId).length > 0;

        if (!trackedMeasurementsService) {
          return {
            disabled: !hasSegmentation,
          };
        }

        // Check if any of the viewport's series are being tracked
        const hasTrackedInViewport = viewportDisplaySets.some(
          displaySet =>
            displaySet?.SeriesInstanceUID &&
            trackedMeasurementsService.isSeriesTracked(displaySet.SeriesInstanceUID)
        );

        const isSRDisplaySet = viewportDisplaySets.some(
          displaySet => displaySet?.Modality === 'SR'
        );

        // Enable navigation if:
        // - There's a segmentation to navigate (SEG/RTSTRUCT)
        // - OR there are tracked measurements in the viewport (SR/etc.)
        const needsNavigation = hasSegmentation || hasTrackedInViewport || isSRDisplaySet;

        return {
          disabled: !needsNavigation,
        };
      },
    },
    {
      name: 'ohif.dataOverlayMenu',
      defaultComponent: ViewportDataOverlayMenuWrapper,
    },
    {
      name: 'evaluate.dataOverlayMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        // Example: Show data overlay menu only for certain modalities
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        if (!displaySetUIDs?.length) {
          return {
            disabled: true,
          };
        }

        return {
          disabled: false,
        };
      },
    },
    {
      name: 'ohif.orientationMenu',
      defaultComponent: ViewportOrientationMenuWrapper,
    },
    {
      name: 'evaluate.orientationMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        // Only show orientation menu for 3D capable viewports
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);
        const isNotReconstructable = displaySets.some(displaySet => !displaySet?.isReconstructable);

        const disabled = isNotReconstructable;

        return {
          disabled,
        };
      },
    },
    {
      name: 'ohif.windowLevelMenu',
      defaultComponent: WindowLevelActionMenuWrapper,
    },
    {
      name: 'ohif.voiManualControlMenu',
      defaultComponent: VOIManualControlMenuWrapper,
    },
    {
      name: 'ohif.windowLevelMenuEmbedded',
      defaultComponent: WindowLevelActionMenuWrapper,
    },
    {
      name: 'evaluate.windowLevelMenuEmbedded',
      evaluate: () => {
        return {
          isEmbedded: true,
        };
      },
    },
    {
      name: 'ohif.thresholdMenu',
      defaultComponent: ThresholdMenuWrapper,
    },
    {
      name: 'ohif.opacityMenu',
      defaultComponent: OpacityMenuWrapper,
    },
    {
      name: 'evaluate.windowLevelMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);

        const supportWindowLevel = displaySets.some(displaySet => displaySet?.supportsWindowLevel);

        const isInAnySection = toolbarService.isInAnySection('windowLevelMenuEmbedded');

        return {
          disabled: !supportWindowLevel,
          hasEmbeddedVariantToUse: !!isInAnySection,
        };
      },
    },
    {
      name: 'evaluate.voiManualControlMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);

        const supportWindowLevel = displaySets.some(displaySet => displaySet?.supportsWindowLevel);

        return {
          disabled: !supportWindowLevel,
        };
      },
    },
    {
      name: 'evaluate.thresholdMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        if (viewport.type !== 'orthographic') {
          return {
            disabled: true,
          };
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        if (!displaySetUIDs.length) {
          return {
            disabled: true,
          };
        }

        return {
          disabled: false,
        };
      },
    },
    {
      name: 'evaluate.opacityMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport || viewport.type !== 'orthographic') {
          return {
            disabled: true,
          };
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        if (displaySetUIDs.length <= 1) {
          return {
            disabled: true,
          };
        }

        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);
        const hasOverlayable = displaySets.some(displaySet => displaySet?.isOverlayDisplaySet);

        return {
          disabled: hasOverlayable,
        };
      },
    },
    // functions/helpers to be used by the toolbar buttons to decide if they should
    // enabled or not
    {
      name: 'evaluate.viewport.supported',
      evaluate: ({ viewportId, unsupportedViewportTypes, disabledText }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (viewport && unsupportedViewportTypes?.includes(viewport.type)) {
          return getDisabledState(disabledText);
        }

        return undefined;
      },
    },
    {
      name: 'evaluate.modality.supported',
      evaluate: ({ viewportId, unsupportedModalities, supportedModalities, disabledText }) => {
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        if (!displaySetUIDs?.length) {
          return;
        }

        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);

        // Check for unsupported modalities (exclusion)
        if (unsupportedModalities?.length) {
          const hasUnsupportedModality = displaySets.some(displaySet =>
            unsupportedModalities.includes(displaySet?.Modality)
          );

          if (hasUnsupportedModality) {
            return getDisabledState(disabledText);
          }
        }

        // Check for supported modalities (inclusion)
        if (supportedModalities?.length) {
          const hasAnySupportedModality = displaySets.some(displaySet =>
            supportedModalities.includes(displaySet?.Modality)
          );

          if (!hasAnySupportedModality) {
            return getDisabledState(
              disabledText || i18n.t('Buttons:Tool not available for this modality')
            );
          }
        }
      },
    },
    {
      name: 'evaluate.cornerstoneTool',
      evaluate: ({ viewportId, button, toolNames, disabledText }) => {
        const toolGroup = toolGroupService.getToolGroupForViewport(viewportId);

        if (!toolGroup) {
          return;
        }

        const toolName = toolbarService.getToolNameForButton(button);

        if (!toolGroup || (!toolGroup.hasTool(toolName) && !toolNames)) {
          return getDisabledState(disabledText);
        }

        const isPrimaryActive = toolNames
          ? toolNames.includes(toolGroup.getActivePrimaryMouseButtonTool())
          : toolGroup.getActivePrimaryMouseButtonTool() === toolName;

        return {
          disabled: false,
          isActive: isPrimaryActive,
        };
      },
    },
    {
      name: 'evaluate.action',
      evaluate: () => {
        return {
          disabled: false,
        };
      },
    },
    {
      name: 'evaluate.cornerstoneTool.toggle.ifStrictlyDisabled',
      evaluate: ({ viewportId, button, disabledText }) =>
        _evaluateToggle({
          viewportId,
          button,
          toolbarService,
          disabledText,
          offModes: [Enums.ToolModes.Disabled],
          toolGroupService,
        }),
    },
    {
      name: 'evaluate.cornerstoneTool.toggle',
      evaluate: ({ viewportId, button, disabledText }) =>
        _evaluateToggle({
          viewportId,
          button,
          toolbarService,
          disabledText,
          offModes: [Enums.ToolModes.Disabled, Enums.ToolModes.Passive],
          toolGroupService,
        }),
    },
    {
      name: 'evaluate.cornerstone.synchronizer',
      evaluate: ({ viewportId, button }) => {
        let synchronizers = syncGroupService.getSynchronizersForViewport(viewportId);

        if (!synchronizers?.length || synchronizers.length <= 1) {
          return {
            className: utils.getToggledClassName(false),
          };
        }

        const isArray = Array.isArray(button.props?.commands);

        const synchronizerType = isArray
          ? button.props?.commands?.[0].commandOptions.type
          : button.props?.commands?.commandOptions.type;

        synchronizers = syncGroupService.getSynchronizersOfType(synchronizerType);

        if (!synchronizers?.length) {
          return {
            className: utils.getToggledClassName(false),
          };
        }

        // Todo: we need a better way to find the synchronizers based on their
        // type, but for now we just check the first one and see if it is
        // enabled
        const synchronizer = synchronizers[0];

        const isEnabled = synchronizer?._enabled;

        return {
          className: utils.getToggledClassName(isEnabled),
        };
      },
    },
    {
      name: 'evaluate.viewportProperties.toggle',
      evaluate: ({ viewportId, button }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport || viewport.isDisabled) {
          return;
        }

        const propId = button.id;

        const properties = viewport.getProperties();
        const camera = viewport.getCamera();

        const prop = camera?.[propId] || properties?.[propId];

        if (!prop) {
          return {
            disabled: false,
          };
        }

        const isToggled = prop;

        return {
          className: utils.getToggledClassName(isToggled),
        };
      },
    },
    {
      name: 'evaluate.displaySetIsReconstructable',
      evaluate: ({ viewportId, disabledText = 'Selected viewport is not reconstructable' }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return;
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

        const displaySets = displaySetUIDs.map(displaySetService.getDisplaySetByUID);

        const areReconstructable = displaySets.every(displaySet => {
          return displaySet?.isReconstructable;
        });

        if (!areReconstructable) {
          return getDisabledState(disabledText);
        }

        return {
          disabled: false,
        };
      },
    },
    {
      name: 'ohif.mprTextButton',
      defaultComponent: MPRTextButton,
    },
    {
      name: 'ohif.blendModeMenu',
      defaultComponent: BlendModeMenuWrapper,
    },
    {
      name: 'ohif.mprProjectionControls',
      defaultComponent: MPRProjectionControls,
    },
    {
      name: 'evaluate.mprProjectionControls',
      evaluate: ({ viewportId }) => {
        const effectiveId = viewportId || viewportGridService.getActiveViewportId();
        const viewport = cornerstoneViewportService.getCornerstoneViewport(effectiveId);
        const isOrtho = viewport?.type === 'orthographic';
        return {
          disabled: !isOrtho,
        };
      },
    },
    {
      name: 'evaluate.blendModeMenu',
      evaluate: ({ viewportId }) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return {
            disabled: true,
          };
        }

        if (viewport.type !== 'orthographic') {
          return {
            disabled: true,
          };
        }

        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
        if (!displaySetUIDs?.length) {
          return {
            disabled: true,
          };
        }

        return {
          disabled: false,
        };
      },
    },
  ];
}

function _evaluateToggle({
  viewportId,
  toolbarService,
  button,
  disabledText,
  offModes,
  toolGroupService,
}) {
  const toolGroup = toolGroupService.getToolGroupForViewport(viewportId);

  if (!toolGroup) {
    return;
  }
  const toolName = toolbarService.getToolNameForButton(button);

  if (!toolGroup?.hasTool(toolName)) {
    return getDisabledState(disabledText);
  }

  const isOff = offModes.includes(toolGroup.getToolOptions(toolName).mode);

  return {
    className: utils.getToggledClassName(!isOff),
  };
}
