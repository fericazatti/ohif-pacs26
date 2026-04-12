import React from 'react';
import PropTypes from 'prop-types';

import { Thumbnail } from '../Thumbnail';
import { useDynamicMaxHeight } from '../../hooks/useDynamicMaxHeight';

const ThumbnailList = ({
  thumbnails,
  onThumbnailClick,
  onThumbnailDoubleClick,
  onClickUntrack,
  activeDisplaySetInstanceUIDs = [],
  viewPreset,
  ThumbnailMenuItems,
}) => {
  // Use the dynamic height hook on the parent container
  const { ref, maxHeight } = useDynamicMaxHeight(thumbnails);

  // Capturas de pantalla primero, después DOC (informes), después imágenes
  // y por último las series sin imagen.
  // Detección de capturas: serie OT con SeriesNumber 9999 (lo que escribe
  // captureSecondaryCapture.ts) o el flag isScreenshot pasado por el panel.
  const isScreenshotThumb = (t: { isScreenshot?: boolean; modality?: string; seriesNumber?: unknown }) =>
    t?.isScreenshot === true || (Number(t?.seriesNumber) === 9999 && t?.modality === 'OT');

  const screenshotItems = thumbnails?.filter(isScreenshotThumb);

  const docItems = thumbnails?.filter(
    t => t.modality === 'DOC' && !isScreenshotThumb(t)
  );

  const thumbnailItems = thumbnails?.filter(
    t =>
      !isScreenshotThumb(t) &&
      t.componentType !== 'thumbnailNoImage' &&
      viewPreset === 'thumbnails' &&
      t.modality !== 'DOC'
  );

  const listItems = thumbnails?.filter(
    t =>
      !isScreenshotThumb(t) &&
      t.modality !== 'DOC' &&
      (t.componentType === 'thumbnailNoImage' || viewPreset === 'list')
  );

  return (
    <div className="flex flex-col">
      <div
        ref={ref}
        className="flex flex-col gap-[2px] px-[4px] py-[4px]"
      >
        {/* Capturas de pantalla — antes incluso que el informe DOC */}
        {screenshotItems.length > 0 && (
          <div
            id="ohif-screenshot-list"
            className="grid grid-cols-2 gap-[3px]"
          >
            {screenshotItems.map(item => {
              const { displaySetInstanceUID, componentType, numInstances, ...rest } = item;
              const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  {...rest}
                  displaySetInstanceUID={displaySetInstanceUID}
                  numInstances={numInstances || 1}
                  isActive={isActive}
                  thumbnailType={componentType}
                  viewPreset="thumbnails"
                  onClick={onThumbnailClick.bind(null, displaySetInstanceUID)}
                  onDoubleClick={onThumbnailDoubleClick.bind(null, displaySetInstanceUID)}
                  onClickUntrack={onClickUntrack.bind(null, displaySetInstanceUID)}
                  ThumbnailMenuItems={ThumbnailMenuItems}
                />
              );
            })}
          </div>
        )}
        {/* DOC (Informes médicos) */}
        {docItems.length > 0 && (
          <div
            id="ohif-doc-list"
            className="flex flex-col gap-[2px]"
          >
            {docItems.map(item => {
              const { displaySetInstanceUID, componentType, numInstances, ...rest } = item;
              const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  {...rest}
                  displaySetInstanceUID={displaySetInstanceUID}
                  numInstances={numInstances || 1}
                  isActive={isActive}
                  thumbnailType={componentType}
                  viewPreset="list"
                  onClick={onThumbnailClick.bind(null, displaySetInstanceUID)}
                  onDoubleClick={onThumbnailDoubleClick.bind(null, displaySetInstanceUID)}
                  onClickUntrack={onClickUntrack.bind(null, displaySetInstanceUID)}
                  ThumbnailMenuItems={ThumbnailMenuItems}
                />
              );
            })}
          </div>
        )}
        {thumbnailItems.length > 0 && (
          <div
            id="ohif-thumbnail-list"
            className="grid grid-cols-2 gap-[3px]"
          >
            {thumbnailItems.map(item => {
              const { displaySetInstanceUID, componentType, numInstances, ...rest } = item;
              const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  {...rest}
                  displaySetInstanceUID={displaySetInstanceUID}
                  numInstances={numInstances || 1}
                  isActive={isActive}
                  thumbnailType={componentType}
                  viewPreset="thumbnails"
                  onClick={onThumbnailClick.bind(null, displaySetInstanceUID)}
                  onDoubleClick={onThumbnailDoubleClick.bind(null, displaySetInstanceUID)}
                  onClickUntrack={onClickUntrack.bind(null, displaySetInstanceUID)}
                  ThumbnailMenuItems={ThumbnailMenuItems}
                />
              );
            })}
          </div>
        )}
        {/* List Items */}
        {listItems.length > 0 && (
          <div
            id="ohif-thumbnail-list-no-image"
            className="flex flex-col gap-[2px]"
          >
            {listItems.map(item => {
              const { displaySetInstanceUID, componentType, numInstances, ...rest } = item;
              const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  {...rest}
                  displaySetInstanceUID={displaySetInstanceUID}
                  numInstances={numInstances || 1}
                  isActive={isActive}
                  thumbnailType={componentType}
                  viewPreset="list"
                  onClick={onThumbnailClick.bind(null, displaySetInstanceUID)}
                  onDoubleClick={onThumbnailDoubleClick.bind(null, displaySetInstanceUID)}
                  onClickUntrack={onClickUntrack.bind(null, displaySetInstanceUID)}
                  ThumbnailMenuItems={ThumbnailMenuItems}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

ThumbnailList.propTypes = {
  thumbnails: PropTypes.arrayOf(
    PropTypes.shape({
      displaySetInstanceUID: PropTypes.string.isRequired,
      imageSrc: PropTypes.string,
      imageAltText: PropTypes.string,
      seriesDate: PropTypes.string,
      seriesNumber: PropTypes.any,
      numInstances: PropTypes.number,
      description: PropTypes.string,
      componentType: PropTypes.any,
      isTracked: PropTypes.bool,
      /**
       * Data the thumbnail should expose to a receiving drop target. Use a matching
       * `dragData.type` to identify which targets can receive this draggable item.
       * If this is not set, drag-n-drop will be disabled for this thumbnail.
       *
       * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
       */
      dragData: PropTypes.shape({
        /** Must match the "type" a dropTarget expects */
        type: PropTypes.string.isRequired,
      }),
    })
  ),
  activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  onThumbnailClick: PropTypes.func.isRequired,
  onThumbnailDoubleClick: PropTypes.func.isRequired,
  onClickUntrack: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
  ThumbnailMenuItems: PropTypes.any,
};

export { ThumbnailList };
