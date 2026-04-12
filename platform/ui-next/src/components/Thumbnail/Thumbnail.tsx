import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag } from 'react-dnd';
import { Icons } from '../Icons';
import { DisplaySetMessageListTooltip } from '../DisplaySetMessageListTooltip';
import { TooltipTrigger, TooltipContent, Tooltip } from '../Tooltip';

/**
 * Display a thumbnail for a display set.
 */
const Thumbnail = ({
  displaySetInstanceUID,
  className,
  imageSrc,
  imageAltText,
  description,
  seriesNumber,
  numInstances,
  loadingProgress,
  countIcon,
  messages,
  isActive,
  onClick,
  onDoubleClick,
  thumbnailType,
  modality,
  viewPreset = 'thumbnails',
  isHydratedForDerivedDisplaySet = false,
  isTracked = false,
  canReject = false,
  dragData = {},
  onReject = () => {},
  onClickUntrack = () => {},
  ThumbnailMenuItems = () => {},
}: withAppTypes): React.ReactNode => {
  // TODO: We should wrap our thumbnail to create a "DraggableThumbnail", as
  // this will still allow for "drag", even if there is no drop target for the
  // specified item.
  const [collectedProps, drag, dragPreview] = useDrag({
    type: 'displayset',
    item: { ...dragData },
    canDrag: function (monitor) {
      return Object.keys(dragData).length !== 0;
    },
  });

  const [lastTap, setLastTap] = useState(0);

  const handleTouchEnd = e => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      onDoubleClick(e);
    } else {
      onClick(e);
    }
    setLastTap(currentTime);
  };

  const renderThumbnailPreset = () => {
    return (
      <div
        className={classnames(
          'flex h-full w-full flex-col items-start justify-start gap-[2px] p-[3px]',
          isActive && 'bg-popover rounded'
        )}
      >
        {/* Contenedor de imagen cuadrado responsive */}
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          <div className="relative bg-black h-full w-full">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAltText}
                className="h-full w-full rounded object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="bg-background h-full w-full rounded"></div>
            )}

            {/* bottom left */}
            <div className="absolute bottom-0 left-0 flex h-[14px] items-center gap-[4px] rounded-tr pt-[10px] pb-[10px] pr-[6px] pl-[5px]">
              <div
                className={classnames(
                  'h-[10px] w-[10px] rounded-[2px]',
                  isActive || isHydratedForDerivedDisplaySet ? 'bg-highlight' : 'bg-primary/65',
                  loadingProgress && loadingProgress < 1 && 'bg-primary/25'
                )}
              ></div>
              <div
                className="text-[11px] font-semibold text-white"
                data-cy="series-modality-label"
              >
                {modality}
              </div>
            </div>

            {/* top right */}
            <div className="absolute top-0 right-0 flex items-center gap-[4px]">
              <DisplaySetMessageListTooltip
                messages={messages}
                id={`display-set-tooltip-${displaySetInstanceUID}`}
              />
              {isTracked && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="group">
                      <Icons.StatusTracking className="text-primary-light h-[15px] w-[15px] group-hover:hidden" />
                      <Icons.Cancel
                        className="text-primary-light hidden h-[15px] w-[15px] group-hover:block"
                        onClick={onClickUntrack}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-1 flex-row">
                      <div className="flex-2 flex items-center justify-center pr-4">
                        <Icons.InfoLink className="text-primary" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span>
                          <span className="text-white">
                            {isTracked ? 'Series is tracked' : 'Series is untracked'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* bottom right */}
            <div className="absolute bottom-0 right-0 flex items-center gap-[4px] p-[4px]">
              <ThumbnailMenuItems
                displaySetInstanceUID={displaySetInstanceUID}
                canReject={canReject}
                onReject={onReject}
              />
            </div>
          </div>
        </div>
        
        {/* Contenedor de texto (Description) */}
        <div className="flex h-[26px] w-full flex-col justify-start pt-px">
          <Tooltip>
            <TooltipContent>{description}</TooltipContent>
            <TooltipTrigger className="w-full">
              <div
                className="min-h-[10px] w-full overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 pl-1 text-left text-[9px] font-normal leading-3 text-white"
                data-cy="series-description-label"
              >
                {description}
              </div>
            </TooltipTrigger>
          </Tooltip>
          <div className="flex h-[10px] items-center gap-[5px] overflow-hidden">
            <div className="text-muted-foreground pl-1 text-[8px]">S:{seriesNumber}</div>
            <div className="text-muted-foreground text-[8px]">
              <div className="flex items-center gap-[3px]">
                {countIcon ? (
                  React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'h-2 w-2 flex-shrink-0' })
                ) : (
                  <Icons.InfoSeries className="h-2 w-2 flex-shrink-0" />
                )}
                <div>{numInstances}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListPreset = () => {
    const isDoc = modality === 'DOC';
    return (
      <div
        className={classnames(
          'flex h-full w-full items-center justify-between pr-[8px] pl-[8px] pt-[4px] pb-[4px]',
          isActive && 'bg-popover rounded'
        )}
      >
        <div
          className={classnames(
            'relative flex w-full items-center gap-[10px] overflow-hidden',
            isDoc ? 'h-[64px]' : 'h-[36px]'
          )}
        >
          {isDoc ? (
            /* DOC: ícono clipboard grande en gris claro */
            <div className="flex h-[60px] w-[60px] min-w-[60px] items-center justify-center rounded bg-[#252525] text-[#C8C8D0]">
              <Icons.Clipboard className="h-[40px] w-[40px]" />
            </div>
          ) : (
            <div
              className={classnames(
                'h-[32px] w-[4px] min-w-[4px] rounded',
                isActive || isHydratedForDerivedDisplaySet ? 'bg-highlight' : 'bg-primary/65',
                loadingProgress && loadingProgress < 1 && 'bg-primary/25'
              )}
            ></div>
          )}
          <div className="flex h-full w-[calc(100%-12px)] flex-col justify-center">
            <div className="flex items-center gap-[7px]">
              {!isDoc && (
                <div
                  className="text-[13px] font-semibold text-white"
                  data-cy="series-modality-label"
                >
                  {modality}
                </div>
              )}
              <Tooltip>
                <TooltipContent>{description}</TooltipContent>
                <TooltipTrigger className="w-full overflow-hidden">
                  <div
                    className={classnames(
                      'max-w-[200px] overflow-hidden overflow-ellipsis whitespace-nowrap text-left font-normal',
                      isDoc ? 'text-[12px] text-[#D0D0D8]' : 'text-[13px] text-white'
                    )}
                    data-cy="series-description-label"
                  >
                    {description || (isDoc ? 'Informe médico' : '')}
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </div>

            {!isDoc && (
              <div className="flex h-[12px] items-center gap-[7px] overflow-hidden">
                <div className="text-muted-foreground text-[12px]"> S:{seriesNumber}</div>
                <div className="text-muted-foreground text-[12px]">
                  <div className="flex items-center gap-[4px]">
                    {' '}
                    {countIcon ? (
                      React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'h-3 w-3 flex-shrink-0' })
                    ) : (
                      <Icons.InfoSeries className="h-3 w-3 flex-shrink-0" />
                    )}
                    <div>{numInstances}</div>
                  </div>
                </div>
              </div>
            )}
            {isDoc && (
              <div className="flex h-[12px] items-center gap-[6px] overflow-hidden">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1FB250]">
                  DOC
                </span>
                <span className="text-[10px] text-[#707078]">
                  {numInstances} {numInstances === 1 ? 'archivo' : 'archivos'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex h-full items-center gap-[4px]">
          <DisplaySetMessageListTooltip
            messages={messages}
            id={`display-set-tooltip-${displaySetInstanceUID}`}
          />
          {isTracked && (
            <Tooltip>
              <TooltipTrigger>
                <div className="group">
                  <Icons.StatusTracking className="text-primary-light h-[20px] w-[15px] group-hover:hidden" />
                  <Icons.Cancel
                    className="text-primary-light hidden h-[15px] w-[15px] group-hover:block"
                    onClick={onClickUntrack}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-1 flex-row">
                  <div className="flex-2 flex items-center justify-center pr-4">
                    <Icons.InfoLink className="text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span>
                      <span className="text-white">
                        {isTracked ? 'Series is tracked' : 'Series is untracked'}
                      </span>
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <ThumbnailMenuItems
            displaySetInstanceUID={displaySetInstanceUID}
            canReject={canReject}
            onReject={onReject}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={classnames(
        className,
        'bg-muted hover:bg-primary/30 group flex cursor-pointer select-none flex-col rounded outline-none',
        viewPreset === 'thumbnails' && 'h-auto w-full',
        viewPreset === 'list' && 'h-[40px] w-full'
      )}
      id={`thumbnail-${displaySetInstanceUID}`}
      data-cy={
        thumbnailType === 'thumbnailNoImage'
          ? 'study-browser-thumbnail-no-image'
          : 'study-browser-thumbnail'
      }
      data-series={seriesNumber}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      role="button"
    >
      <div
        ref={drag}
        className="h-full w-full"
      >
        {viewPreset === 'thumbnails' && renderThumbnailPreset()}
        {viewPreset === 'list' && renderListPreset()}
      </div>
    </div>
  );
};

Thumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string.isRequired,
  className: PropTypes.string,
  imageSrc: PropTypes.string,
  dragData: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }),
  imageAltText: PropTypes.string,
  description: PropTypes.string.isRequired,
  seriesNumber: PropTypes.any,
  numInstances: PropTypes.number.isRequired,
  loadingProgress: PropTypes.number,
  messages: PropTypes.object,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
  modality: PropTypes.string,
  isHydratedForDerivedDisplaySet: PropTypes.bool,
  isTracked: PropTypes.bool,
  onClickUntrack: PropTypes.func,
  countIcon: PropTypes.string,
  thumbnailType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage']),
};

export { Thumbnail };