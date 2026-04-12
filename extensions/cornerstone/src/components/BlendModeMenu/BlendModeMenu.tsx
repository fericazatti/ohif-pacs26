import React, { useState, useEffect, useCallback } from 'react';
import { Numeric } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { BaseVolumeViewport, Enums as CoreEnums } from '@cornerstonejs/core';

const BLEND_MODES = [
  { value: 'MIP', label: 'MIP', enumValue: CoreEnums.BlendModes.MAXIMUM_INTENSITY_BLEND },
  { value: 'MinIP', label: 'MinIP', enumValue: CoreEnums.BlendModes.MINIMUM_INTENSITY_BLEND },
  { value: 'Average', label: 'AVG', enumValue: CoreEnums.BlendModes.AVERAGE_INTENSITY_BLEND },
];

const DEFAULT_SLAB_THICKNESS = 10;

interface BlendModeMenuProps {
  viewportId?: string;
  className?: string;
}

function BlendModeMenu({ viewportId, className }: BlendModeMenuProps) {
  const { servicesManager } = useSystem();
  const { cornerstoneViewportService, viewportGridService, toolGroupService } =
    servicesManager.services;

  const [blendMode, setBlendMode] = useState<string>('MIP');
  const [slabThickness, setSlabThickness] = useState<number>(DEFAULT_SLAB_THICKNESS);

  /**
   * Resolve the effective viewport: use the prop if valid, otherwise fall back
   * to the active viewport. This is needed because the primary toolbar renders
   * components without a viewport-specific context (viewportId = undefined).
   */
  const getViewport = useCallback(() => {
    const id = viewportId || viewportGridService.getActiveViewportId();
    if (!id) {
      return null;
    }
    const vp = cornerstoneViewportService.getCornerstoneViewport(id);
    return vp instanceof BaseVolumeViewport ? vp : null;
  }, [viewportId, cornerstoneViewportService, viewportGridService]);

  const getEffectiveViewportId = useCallback(() => {
    return viewportId || viewportGridService.getActiveViewportId();
  }, [viewportId, viewportGridService]);

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) {
      return;
    }

    const currentSlab = viewport.getSlabThickness();
    if (currentSlab && currentSlab >= 0.5) {
      setSlabThickness(currentSlab);
    }

    const actors = viewport.getActors();
    if (actors?.length > 0) {
      const actorBlendMode = actors[0]?.actor?.getMapper?.()?.getBlendMode?.();
      const found = BLEND_MODES.find(m => m.enumValue === actorBlendMode);
      if (found) {
        setBlendMode(found.value);
      }
    }
  }, [viewportId, getViewport]);

  /**
   * Update the CrosshairsTool configuration so that when the user drags the
   * slab-thickness handles, the tool uses the chosen blend mode instead of
   * always defaulting to MIP.
   *
   * Note: toolGroupService.getToolGroupForViewport() returns the tool group
   * OBJECT (IToolGroup), not a string ID. We then use group.id to call
   * the OHIF-level setToolConfiguration(toolGroupId, toolName, config).
   */
  const updateCrosshairsConfig = useCallback(
    (blendModeEnum: number) => {
      const vpId = getEffectiveViewportId();
      if (!vpId) {
        return;
      }

      const toolGroup = toolGroupService?.getToolGroupForViewport(vpId);
      if (!toolGroup?.id) {
        return;
      }

      const currentConfig = toolGroupService.getToolConfiguration(toolGroup.id, 'Crosshairs') ?? {};
      toolGroupService.setToolConfiguration(toolGroup.id, 'Crosshairs', {
        ...currentConfig,
        slabThicknessBlendMode: blendModeEnum,
      });
    },
    [getEffectiveViewportId, toolGroupService]
  );

  const handleBlendModeChange = useCallback(
    (value: string) => {
      setBlendMode(value);
      const found = BLEND_MODES.find(m => m.value === value);
      if (!found) {
        return;
      }

      // 1. Update CrosshairsTool config FIRST so that future slab-thickness
      //    drag interactions use the correct blend mode.
      updateCrosshairsConfig(found.enumValue);

      // 2. Apply the blend mode directly to the viewport.
      const viewport = getViewport();
      if (!viewport) {
        return;
      }

      viewport.setBlendMode(found.enumValue);

      // 3. Ensure there is a non-trivial slab so the projection is visible.
      //    We read viewportProperties.slabThickness; if it is 0 / undefined we
      //    set a sensible default WITHOUT going through CrosshairsTool (which
      //    would re-override the blend mode).
      const currentSlab = viewport.getSlabThickness();
      if (!currentSlab || currentSlab < 0.5) {
        viewport.setSlabThickness(DEFAULT_SLAB_THICKNESS);
        setSlabThickness(DEFAULT_SLAB_THICKNESS);
      }

      viewport.render();
    },
    [getViewport, updateCrosshairsConfig]
  );

  const handleSlabThicknessChange = useCallback(
    (val: number | [number, number]) => {
      if (typeof val !== 'number') {
        return;
      }

      setSlabThickness(val);

      const viewport = getViewport();
      if (!viewport) {
        return;
      }

      // viewport.setSlabThickness only updates clipping planes; it does NOT
      // touch blend mode, so the chosen projection type is preserved.
      viewport.setSlabThickness(val);
      viewport.render();
    },
    [getViewport]
  );

  return (
    <div className={className}>
      <div className="bg-popover w-64 rounded-lg p-4 shadow-md">
        <div className="mb-3">
          <span className="text-muted-foreground text-sm font-medium">Projection Type</span>
          <div className="mt-2 flex gap-1">
            {BLEND_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => handleBlendModeChange(mode.value)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  blendMode === mode.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Slab (mm)</span>
            <span className="text-foreground text-sm font-medium">{slabThickness.toFixed(1)}</span>
          </div>
          <Numeric.Container
            mode="singleRange"
            value={slabThickness}
            onChange={handleSlabThicknessChange}
            min={0.5}
            max={100}
            step={0.5}
          >
            <Numeric.SingleRange
            showNumberInput={false}
            thumbClassName="border-0 shadow-none"
          />
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground text-xs">0.5</span>
              <span className="text-muted-foreground text-xs">100</span>
            </div>
          </Numeric.Container>
        </div>
      </div>
    </div>
  );
}

export default BlendModeMenu;
