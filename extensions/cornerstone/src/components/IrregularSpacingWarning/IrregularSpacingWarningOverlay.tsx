import React, { useEffect, useState } from 'react';
import { useSystem, DisplaySetMessage } from '@ohif/core';
import { AlertTriangle } from 'lucide-react';

interface Props {
  viewportId: string;
}

function IrregularSpacingWarningOverlay({ viewportId }: Props) {
  const { servicesManager } = useSystem();
  const {
    cornerstoneViewportService,
    viewportGridService,
    displaySetService,
  } = servicesManager.services;

  const [warning, setWarning] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Only show on volume (orthographic) viewports — squashing is an MPR-only concern
        const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (!vp || vp.type !== 'orthographic') {
          setWarning(null);
          return;
        }

        const viewports = viewportGridService.getState().viewports;
        const uid = viewports.get(viewportId)?.displaySetInstanceUIDs?.[0];
        if (!uid) {
          setWarning(null);
          return;
        }

        const ds = displaySetService.getDisplaySetByUID(uid);
        const messageList = ds?.messages;
        if (!messageList?.messages?.length) {
          setWarning(null);
          return;
        }

        if (messageList.includesMessage(DisplaySetMessage.CODES.IRREGULAR_SPACING)) {
          setWarning(
            'Esta serie tiene espesores de corte variables. La reconstrucción coronal/sagital puede verse distorsionada (cortes "aplastados") porque cornerstone usa el espaciado promedio para todo el volumen.'
          );
        } else if (messageList.includesMessage(DisplaySetMessage.CODES.MISSING_FRAMES)) {
          setWarning(
            'Esta serie tiene cortes faltantes. La reconstrucción MPR puede mostrar bandas vacías o discontinuidades en coronal/sagital.'
          );
        } else {
          setWarning(null);
        }
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
  }, [viewportId, cornerstoneViewportService, viewportGridService, displaySetService]);

  if (!warning) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute top-1.5 left-1/2 z-20 -translate-x-1/2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-amber-500/60 bg-amber-950/85 px-2 py-1 text-[10px] font-semibold text-amber-200 shadow-lg backdrop-blur-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={warning}
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span>Espesor irregular</span>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute top-full left-1/2 mt-1 w-64 -translate-x-1/2 rounded-md border border-amber-500/40 bg-[#1A1A1A]/95 px-2.5 py-2 text-[10px] leading-snug text-amber-100 shadow-xl backdrop-blur-sm">
          {warning}
        </div>
      )}
    </div>
  );
}

export default IrregularSpacingWarningOverlay;
