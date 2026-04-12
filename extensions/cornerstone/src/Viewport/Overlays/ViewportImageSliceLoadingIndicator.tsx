import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Enums, cache, eventTarget, getEnabledElement } from '@cornerstonejs/core';

const isVolumeViewport = viewportData =>
  viewportData?.viewportType === Enums.ViewportType.ORTHOGRAPHIC ||
  viewportData?.viewportType === Enums.ViewportType.VOLUME_3D;

// Non-blocking progress indicator for DICOM image loading.
// See CLAUDE.md → "Loading Indicator" for background.
function ViewportImageSliceLoadingIndicator({ viewportData, element }) {
  const [progress, setProgress] = useState<number | null>(null);

  // Stable key derived from imageIds. Without this, the effect below re-runs on
  // every viewportData reference change (hundreds of times during a CT load)
  // causing the progress to reset and the bar to flicker.
  const viewportKey = useMemo(() => {
    const ids: string[] = (viewportData?.data ?? []).flatMap(d => d.imageIds ?? []);
    if (ids.length === 0) return '';
    return `${ids.length}|${ids[0]}|${ids[ids.length - 1]}`;
  }, [viewportData]);

  const volumeType = isVolumeViewport(viewportData);

  useEffect(() => {
    if (!element) {
      setProgress(null);
      return;
    }

    let rawIds: string[] = (viewportData?.data ?? []).flatMap(d => d.imageIds ?? []);
    if (rawIds.length === 0) {
      // Volume viewports throw "No actor found for the given volumeId: undefined"
      // from getImageIds() before a volume has been set (the MPR transition window).
      // Swallow it: we'll pick up the ids from viewportData on the next render.
      try {
        const vp = getEnabledElement(element)?.viewport;
        const fromVp = (vp as any)?.getImageIds?.();
        if (fromVp?.length) rawIds = fromVp;
      } catch {
        /* no-op */
      }
    }

    if (rawIds.length === 0) {
      setProgress(null);
      return;
    }

    const imageIdSet = new Set<string>(rawIds);
    const total = imageIdSet.size;

    const loadedSet = new Set<string>();
    for (const id of imageIdSet) {
      if (cache.isLoaded(id)) loadedSet.add(id);
    }

    if (loadedSet.size >= total) {
      setProgress(null);
      return;
    }

    setProgress(Math.round((loadedSet.size / total) * 100));

    // Time-based throttle. Percentage-based throttling (e.g. every 2%) sounds
    // like fewer updates but on a 1000-slice CT still fires ~50 re-renders.
    // A 200ms floor decouples render cost from series size.
    const THROTTLE_MS = 200;
    let lastFlush = 0;
    let pendingFrame: number | null = null;

    const flush = () => {
      pendingFrame = null;
      lastFlush = performance.now();
      if (loadedSet.size >= total) {
        setProgress(null);
      } else {
        setProgress(Math.round((loadedSet.size / total) * 100));
      }
    };

    const schedule = () => {
      const now = performance.now();
      const elapsed = now - lastFlush;
      if (elapsed >= THROTTLE_MS) {
        flush();
        return;
      }
      if (pendingFrame != null) return;
      pendingFrame = window.setTimeout(flush, THROTTLE_MS - elapsed) as unknown as number;
    };

    const advance = (imageId: string) => {
      if (!imageId || !imageIdSet.has(imageId) || loadedSet.has(imageId)) return;
      loadedSet.add(imageId);
      if (loadedSet.size >= total) {
        if (pendingFrame != null) {
          clearTimeout(pendingFrame);
          pendingFrame = null;
        }
        setProgress(null);
        return;
      }
      schedule();
    };

    const onLoaded = (evt: any) => advance(evt.detail?.image?.imageId);
    const onFailed = (evt: any) => advance(evt.detail?.imageId);

    eventTarget.addEventListener(Enums.Events.IMAGE_LOADED, onLoaded);
    eventTarget.addEventListener(Enums.Events.IMAGE_LOAD_FAILED, onFailed);

    let removeVolumeListener: (() => void) | null = null;
    if (volumeType) {
      const onVolumeComplete = () => {
        if (pendingFrame != null) {
          clearTimeout(pendingFrame);
          pendingFrame = null;
        }
        setProgress(null);
      };
      eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED, onVolumeComplete);
      removeVolumeListener = () =>
        eventTarget.removeEventListener(
          Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED,
          onVolumeComplete
        );
    }

    return () => {
      if (pendingFrame != null) clearTimeout(pendingFrame);
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOADED, onLoaded);
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOAD_FAILED, onFailed);
      removeVolumeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, viewportKey, volumeType]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  // Non-blocking: sits at the bottom of the viewport without covering the image.

  if (progress === null) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      {/* Thin progress bar */}
      <div className="h-[3px] w-full bg-[#1a1a1a]/60">
        <div
          className="h-full bg-[#1FB250] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Small percentage badge — bottom-right, unobtrusive */}
      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1FB250]" />
        <span className="font-mono text-[10px] font-medium text-[#1FB250]">{progress}%</span>
      </div>
    </div>
  );
}

ViewportImageSliceLoadingIndicator.propTypes = {
  error: PropTypes.object,
  element: PropTypes.object,
};

export default ViewportImageSliceLoadingIndicator;
