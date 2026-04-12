import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { ThumbnailList } from '../ThumbnailList';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../Accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';

const StudyItem = ({
  date,
  description,
  numInstances,
  modalities,
  isActive,
  onClick,
  isExpanded,
  displaySets,
  activeDisplaySetInstanceUIDs,
  onClickThumbnail,
  onDoubleClickThumbnail,
  onClickUntrack,
  viewPreset = 'thumbnails',
  ThumbnailMenuItems,
  StudyMenuItems,
  StudyInstanceUID,
}: withAppTypes) => {
  return (
    <Accordion
      type="single"
      collapsible
      onClick={onClick}
      onKeyDown={() => {}}
      role="button"
      tabIndex={0}
      defaultValue={isActive ? 'study-item' : undefined}
    >
      <AccordionItem value="study-item">
        <AccordionTrigger
          className={classnames(
            'group w-full !p-0 transition-colors duration-150',
            'bg-[#202020] hover:bg-[#282828]',
            '[&>svg]:mr-2 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-[#505050]'
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 px-2.5 py-2">
            {/* Fila superior: descripción + menú */}
            <div className="flex w-full items-start gap-1">
              <div className="min-w-0 flex-1 break-words text-[11px] font-normal leading-tight text-[#D0D0D8]">
                {description || 'Sin descripción'}
              </div>
              {StudyMenuItems && (
                <StudyMenuItems StudyInstanceUID={StudyInstanceUID} />
              )}
            </div>
            {/* Fila inferior: fecha | modalidad */}
            <div className="flex w-full items-center gap-2">
              <span className="text-[9px] text-[#606068]">{date}</span>
              <span className="text-[9px] font-medium text-[#505058]">
                {modalities}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {isExpanded && displaySets && (
            <ThumbnailList
              thumbnails={displaySets}
              activeDisplaySetInstanceUIDs={activeDisplaySetInstanceUIDs}
              onThumbnailClick={onClickThumbnail}
              onThumbnailDoubleClick={onDoubleClickThumbnail}
              onClickUntrack={onClickUntrack}
              viewPreset={viewPreset}
              ThumbnailMenuItems={ThumbnailMenuItems}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

StudyItem.propTypes = {
  date: PropTypes.string.isRequired,
  description: PropTypes.string,
  modalities: PropTypes.string.isRequired,
  numInstances: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool,
  displaySets: PropTypes.array,
  activeDisplaySetInstanceUIDs: PropTypes.array,
  onClickThumbnail: PropTypes.func,
  onDoubleClickThumbnail: PropTypes.func,
  onClickUntrack: PropTypes.func,
  viewPreset: PropTypes.string,
  StudyMenuItems: PropTypes.func,
  StudyInstanceUID: PropTypes.string,
};

export { StudyItem };
