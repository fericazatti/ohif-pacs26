import React, { useEffect, useState } from 'react';
import { useSystem } from '@ohif/core';
import MPRProjectionControls from './MPRProjectionControls';

interface Props {
  viewportId: string;
}

function MPRProjectionControlsViewportOverlay({ viewportId }: Props) {
  const { servicesManager } = useSystem();
  const { cornerstoneViewportService, viewportGridService } = servicesManager.services;
  const [isOrtho, setIsOrtho] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        setIsOrtho(vp?.type === 'orthographic');
      });
    };
    check();
    const subs = [
      viewportGridService.subscribe(viewportGridService.EVENTS.LAYOUT_CHANGED, check),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, check),
      viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, check),
      cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        check
      ),
    ];
    return () => {
      cancelAnimationFrame(raf);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [viewportId, cornerstoneViewportService, viewportGridService]);

  if (!isOrtho) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2">
      <div className="pointer-events-auto rounded-md border border-[#2A2A2A] bg-[#161616]/95 px-2 py-1 shadow-lg backdrop-blur-sm">
        <MPRProjectionControls viewportId={viewportId} />
      </div>
    </div>
  );
}

export default MPRProjectionControlsViewportOverlay;
