import React, { useState, useEffect, useCallback } from 'react';
import { useSystem } from '@ohif/core';
import { BaseVolumeViewport, Enums as CoreEnums } from '@cornerstonejs/core';

const BLEND_MODES = [
  { value: 'MIP', label: 'MIP', enumValue: CoreEnums.BlendModes.MAXIMUM_INTENSITY_BLEND },
  { value: 'MinIP', label: 'MinIP', enumValue: CoreEnums.BlendModes.MINIMUM_INTENSITY_BLEND },
  { value: 'Average', label: 'Avg', enumValue: CoreEnums.BlendModes.AVERAGE_INTENSITY_BLEND },
];

const DEFAULT_SLAB_THICKNESS = 10;

// Non-linear slider mapping (cubic curve)
// Gives high precision in the low-mm range:
//   - first 50% of slider covers 0.5–13 mm
//   - second 50% covers 13–100 mm
const SLAB_MIN = 0.5;
const SLAB_MAX = 100;
const CURVE_POWER = 3;

function sliderToSlab(pos: number): number {
  return SLAB_MIN + (SLAB_MAX - SLAB_MIN) * Math.pow(pos, CURVE_POWER);
}

function slabToSlider(slab: number): number {
  return Math.pow(Math.max(0, (slab - SLAB_MIN) / (SLAB_MAX - SLAB_MIN)), 1 / CURVE_POWER);
}

interface MPRProjectionControlsProps {
  viewportId?: string;
  disabled?: boolean;
  location?: string;
}

function MPRProjectionControls({
  viewportId,
  disabled = false,
}: MPRProjectionControlsProps) {
  const { servicesManager } = useSystem();
  const { cornerstoneViewportService, viewportGridService, toolGroupService } =
    servicesManager.services;

  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [slabThickness, setSlabThickness] = useState<number>(DEFAULT_SLAB_THICKNESS);

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
      const currentConfig =
        toolGroupService.getToolConfiguration(toolGroup.id, 'Crosshairs') ?? {};
      toolGroupService.setToolConfiguration(toolGroup.id, 'Crosshairs', {
        ...currentConfig,
        slabThicknessBlendMode: blendModeEnum,
      });
    },
    [getEffectiveViewportId, toolGroupService]
  );

  const deactivateProjection = useCallback(() => {
    setSelectedMode(null);
    const viewport = getViewport();
    if (!viewport) {
      return;
    }
    viewport.setBlendMode(CoreEnums.BlendModes.COMPOSITE);
    viewport.setSlabThickness(0.5);
    viewport.render();
  }, [getViewport]);

  const handleModeSelect = useCallback(
    (value: string) => {
      if (disabled) {
        return;
      }

      // Toggle off if already active
      if (selectedMode === value) {
        deactivateProjection();
        return;
      }

      const found = BLEND_MODES.find(m => m.value === value);
      if (!found) {
        return;
      }

      setSelectedMode(value);
      updateCrosshairsConfig(found.enumValue);

      const viewport = getViewport();
      if (!viewport) {
        return;
      }

      viewport.setBlendMode(found.enumValue);

      // Sync React state with actual viewport slab, then ensure a visible thickness
      const currentSlab = viewport.getSlabThickness();
      const effectiveSlab = currentSlab && currentSlab >= 1 ? currentSlab : DEFAULT_SLAB_THICKNESS;
      viewport.setSlabThickness(effectiveSlab);
      setSlabThickness(effectiveSlab);

      viewport.render();
    },
    [disabled, selectedMode, getViewport, updateCrosshairsConfig, deactivateProjection]
  );

  const handleSlabChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = parseFloat(e.target.value);
      const slab = sliderToSlab(pos);
      setSlabThickness(slab);

      const viewport = getViewport();
      if (!viewport) {
        return;
      }
      viewport.setSlabThickness(slab);
      viewport.render();
    },
    [getViewport]
  );

  const [sliderEl, setSliderEl] = useState<HTMLDivElement | null>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const WHEEL_STEP = 0.02;
      const delta = e.deltaY > 0 ? WHEEL_STEP : -WHEEL_STEP;
      setSlabThickness(prev => {
        const currentPos = slabToSlider(prev);
        const newPos = Math.min(1, Math.max(0, currentPos + delta));
        const newSlab = sliderToSlab(newPos);
        const viewport = getViewport();
        if (viewport) {
          viewport.setSlabThickness(newSlab);
          viewport.render();
        }
        return newSlab;
      });
    },
    [getViewport]
  );

  useEffect(() => {
    if (!sliderEl) {
      return;
    }
    sliderEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => sliderEl.removeEventListener('wheel', handleWheel);
  }, [sliderEl, handleWheel]);

  // Solo resetea el estado React al desactivarse — no toca el viewport al activarse
  // para evitar interferir con la carga del volumen MPR
  useEffect(() => {
    if (disabled) {
      setSelectedMode(null);
    }
  }, [disabled]);

  if (disabled) {
    return null;
  }

  const sliderPosition = slabToSlider(slabThickness);
  const slabPct = Math.round(sliderPosition * 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <style>{`
        .mpr-slab-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 5px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .mpr-slab-slider::-webkit-slider-runnable-track {
          height: 5px;
          border-radius: 3px;
        }
        .mpr-slab-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #1FB250;
          cursor: pointer;
          margin-top: -2.5px;
          box-shadow: none;
          border: none;
        }
        .mpr-slab-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #1FB250;
          border: none;
          cursor: pointer;
          box-shadow: none;
        }
        .mpr-slab-slider::-moz-range-track {
          height: 5px;
          border-radius: 3px;
        }
      `}</style>

      {/* Botones MIP / MinIP / AVG siempre visibles */}
      <div className="flex items-center gap-0.5 rounded-md bg-[#2A2A2A] p-0.5">
        {BLEND_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => handleModeSelect(mode.value)}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
              selectedMode === mode.value
                ? 'bg-[#1FB250] text-white'
                : 'text-[#A0A0A0] hover:bg-[#3A3A3A] hover:text-white cursor-pointer'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Slab slider — solo visible cuando hay un modo activo */}
      {selectedMode !== null && (
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-[#A0A0A0]">Slab</span>
          <div
            ref={setSliderEl}
            className="flex items-center gap-1"
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={sliderPosition}
              onChange={handleSlabChange}
              className="mpr-slab-slider w-[72px]"
              style={{
                background: `linear-gradient(to right, #1FB250 ${slabPct}%, #374151 ${slabPct}%)`,
              }}
            />
            <span className="text-xs font-medium tabular-nums text-white">
              {slabThickness.toFixed(1)}&nbsp;mm
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MPRProjectionControls;
