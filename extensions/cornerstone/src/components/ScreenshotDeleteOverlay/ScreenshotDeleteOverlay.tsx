import React, { useEffect, useState } from 'react';
import { useSystem } from '@ohif/core';
import { Trash2 } from 'lucide-react';

interface Props {
  viewportId: string;
}

// Floating "delete this capture" button rendered inside a cornerstone
// viewport. Only visible when the active displaySet is the "Capturas de
// pantalla" series (SeriesNumber 9999 + Modality OT, or the deterministic
// `${studyUID}.9999` series UID). Delegates the actual deletion to the
// `deleteScreenshotInstance` command.
function ScreenshotDeleteOverlay({ viewportId }: Props) {
  const { servicesManager, commandsManager } = useSystem();
  const {
    cornerstoneViewportService,
    viewportGridService,
    displaySetService,
  } = servicesManager.services;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (!vp) {
          setVisible(false);
          return;
        }
        // Only meaningful on a stack viewport (screenshots are single-frame
        // SC instances stacked into one series).
        if (vp.type !== 'stack') {
          setVisible(false);
          return;
        }

        const viewports = viewportGridService.getState().viewports;
        const uid = viewports.get(viewportId)?.displaySetInstanceUIDs?.[0];
        if (!uid) {
          setVisible(false);
          return;
        }
        const ds = displaySetService.getDisplaySetByUID(uid);
        if (!ds) {
          setVisible(false);
          return;
        }

        const isScreenshot =
          (ds.StudyInstanceUID && ds.SeriesInstanceUID === `${ds.StudyInstanceUID}.9999`) ||
          (Number(ds.SeriesNumber) === 9999 && ds.Modality === 'OT');

        setVisible(Boolean(isScreenshot));
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
      displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_REMOVED, check),
      displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_CHANGED, check),
    ];

    return () => {
      cancelAnimationFrame(raf);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [viewportId, cornerstoneViewportService, viewportGridService, displaySetService]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20">
      <button
        type="button"
        className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-red-500/60 bg-red-950/85 px-2 py-1 text-[10px] font-semibold text-red-100 shadow-lg backdrop-blur-sm transition hover:bg-red-900/90"
        title="Eliminar esta captura del PACS"
        onClick={e => {
          e.stopPropagation();
          commandsManager.run('deleteScreenshotInstance');
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-red-300" />
        <span>Eliminar captura</span>
      </button>
    </div>
  );
}

export default ScreenshotDeleteOverlay;
