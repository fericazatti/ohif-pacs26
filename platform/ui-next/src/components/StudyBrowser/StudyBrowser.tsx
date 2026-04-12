import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { StudyItem } from '../StudyItem';
import { StudyBrowserSort } from '../StudyBrowserSort';
import { StudyBrowserViewOptions } from '../StudyBrowserViewOptions';
import { ScrollArea } from '../ScrollArea';

const noop = () => {};

const FILTER_EVENT = 'ohif:study-browser-filter-toggle';

const StudyBrowser = ({
  tabs,
  activeTabName,
  expandedStudyInstanceUIDs,
  onClickTab = noop,
  onClickStudy = noop,
  onClickThumbnail = noop,
  onDoubleClickThumbnail = noop,
  onClickUntrack = noop,
  activeDisplaySetInstanceUIDs,
  servicesManager,
  showSettings,
  viewPresets,
  ThumbnailMenuItems,
  StudyMenuItems,
  primaryStudyInstanceUIDs = [],
}: withAppTypes) => {
  const [filterOpen, setFilterOpen] = useState(!!showSettings);
  const [selectedPriorUID, setSelectedPriorUID] = useState<string | null>(null);
  const [activeStudyUid, setActiveStudyUid] = useState<string | null>(
    () => primaryStudyInstanceUIDs[0] ?? null
  );

  useEffect(() => {
    if (!activeStudyUid && primaryStudyInstanceUIDs.length > 0) {
      setActiveStudyUid(primaryStudyInstanceUIDs[0]);
    }
  }, [primaryStudyInstanceUIDs]);

  // Sync filterOpen with showSettings prop (fallback if prop chain works)
  useEffect(() => {
    setFilterOpen(!!showSettings);
  }, [showSettings]);

  // Also listen for direct DOM events from SidePanel filter button (reliable fallback)
  useEffect(() => {
    const handler = (e: Event) => {
      setFilterOpen((e as CustomEvent).detail.active);
    };
    window.addEventListener(FILTER_EVENT, handler);
    return () => window.removeEventListener(FILTER_EVENT, handler);
  }, []);

  // After prior-study selection changes, give Cornerstone time to recalibrate canvas positions.
  useEffect(() => {
    const timer = setTimeout(() => {
      (servicesManager as any)?.services?.cornerstoneViewportService?.resize();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedPriorUID]);

  const viewPreset = viewPresets
    ? viewPresets.filter(preset => preset.selected)[0]?.id
    : 'thumbnails';

  const renderStudyItem = ({ studyInstanceUid, date, description, numInstances, modalities, displaySets }) => {
    const isExpanded = expandedStudyInstanceUIDs.includes(studyInstanceUid);
    const isActive = activeStudyUid === studyInstanceUid;
    return (
      <div
        key={studyInstanceUid}
        className="mx-2 overflow-hidden rounded border-l-[3px] transition-colors duration-200"
        style={{ borderColor: isActive ? '#1FB250' : '#2E2E2E' }}
      >
        <StudyItem
          date={date}
          description={description}
          numInstances={numInstances}
          isExpanded={isExpanded}
          displaySets={displaySets}
          modalities={modalities}
          isActive={isExpanded}
          onClick={() => {
            setActiveStudyUid(studyInstanceUid);
            onClickStudy(studyInstanceUid);
          }}
          onClickThumbnail={onClickThumbnail}
          onDoubleClickThumbnail={onDoubleClickThumbnail}
          onClickUntrack={onClickUntrack}
          activeDisplaySetInstanceUIDs={activeDisplaySetInstanceUIDs}
          data-cy="thumbnail-list"
          viewPreset={viewPreset}
          ThumbnailMenuItems={ThumbnailMenuItems}
          StudyMenuItems={StudyMenuItems}
          StudyInstanceUID={studyInstanceUid}
        />
      </div>
    );
  };

  const getTabContent = () => {
    const tabData = tabs.find(tab => tab.name === activeTabName);
    if (!tabData?.studies?.length) {
      return null;
    }

    const primaryStudies = tabData.studies.filter(s =>
      primaryStudyInstanceUIDs.includes(s.studyInstanceUid)
    );
    // Ordena usando `studyDate` raw DICOM (YYYYMMDD) — cadena ordenable lexicográficamente.
    // `date` ya viene formateada localmente (ej. "10-Abr-2024") y Date.parse no la reconoce.
    const previousStudies = tabData.studies
      .filter(s => !primaryStudyInstanceUIDs.includes(s.studyInstanceUid))
      .sort((a, b) => (b.studyDate || '').localeCompare(a.studyDate || '')); // más reciente primero

    return (
      <>
        {/* Sección: Estudio Abierto */}
        {primaryStudies.map(study => (
          <div key={study.studyInstanceUid}>
            <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2.5">
              <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#1FB250]" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A7A88]">
                Estudio abierto
              </span>
            </div>
            {renderStudyItem(study)}
          </div>
        ))}

        {/* Sección: Otros estudios — selector desplegable */}
        {previousStudies.length > 0 && (() => {
          const effectivePriorUID =
            selectedPriorUID && previousStudies.find(s => s.studyInstanceUid === selectedPriorUID)
              ? selectedPriorUID
              : previousStudies[0]?.studyInstanceUid;

          const handleSelectPrior = (uid: string) => {
            setSelectedPriorUID(uid);
            if (!expandedStudyInstanceUIDs.includes(uid)) {
              onClickStudy(uid);
            }
          };

          const selectedPrior = previousStudies.find(s => s.studyInstanceUid === effectivePriorUID);

          return (
            <div className="flex flex-col">
              {/* Separador */}
              <div className="mt-3 border-t-2 border-[#2A2A2A]" />

              {/* Label + badge */}
              <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2.5">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A7A88]">
                  Otros estudios
                </span>
                <span className="flex h-[14px] min-w-[18px] items-center justify-center rounded-full bg-[#2E2E2E] px-1.5 text-[8px] font-bold text-[#6A6A78]">
                  {previousStudies.length}
                </span>
              </div>

              {/* Desplegable ancho completo */}
              <div className="px-2 pb-1.5">
                <select
                  className="w-full cursor-pointer rounded border border-[#2A2A2A] bg-[#1A1A1A] px-[7px] py-[4px] text-[10px] text-[#909098] outline-none focus:border-[#1FB250]"
                  value={effectivePriorUID ?? ''}
                  onChange={e => handleSelectPrior(e.target.value)}
                >
                  {previousStudies.map(study => (
                    <option
                      key={study.studyInstanceUid}
                      value={study.studyInstanceUid}
                    >
                      {study.date || study.studyInstanceUid.slice(-6)}
                      {study.modalities ? ` — ${study.modalities}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thumbnails del estudio previo seleccionado */}
              {selectedPrior && renderStudyItem(selectedPrior)}
            </div>
          );
        })()}
      </>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {filterOpen && (
        <div className="flex flex-shrink-0 items-center gap-[8px] border-b border-[#2a2a2a] bg-[#1A1A1A] px-[8px] py-[8px]">
          <StudyBrowserViewOptions
            tabs={tabs}
            onSelectTab={onClickTab}
            activeTabName={activeTabName}
          />
          <StudyBrowserSort servicesManager={servicesManager} />
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div
          className="bg-bkg-low flex flex-1 flex-col"
          data-cy={'studyBrowser-panel'}
        >
          <div className="flex flex-col pb-2">
            {getTabContent()}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

StudyBrowser.propTypes = {
  onClickTab: PropTypes.func.isRequired,
  onClickStudy: PropTypes.func,
  onClickThumbnail: PropTypes.func,
  onDoubleClickThumbnail: PropTypes.func,
  onClickUntrack: PropTypes.func,
  activeTabName: PropTypes.string.isRequired,
  expandedStudyInstanceUIDs: PropTypes.arrayOf(PropTypes.string).isRequired,
  activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  primaryStudyInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      studies: PropTypes.arrayOf(
        PropTypes.shape({
          studyInstanceUid: PropTypes.string.isRequired,
          date: PropTypes.string,
          numInstances: PropTypes.number,
          modalities: PropTypes.string,
          description: PropTypes.string,
          displaySets: PropTypes.arrayOf(
            PropTypes.shape({
              displaySetInstanceUID: PropTypes.string.isRequired,
              imageSrc: PropTypes.string,
              imageAltText: PropTypes.string,
              seriesDate: PropTypes.string,
              seriesNumber: PropTypes.any,
              numInstances: PropTypes.number,
              description: PropTypes.string,
              componentType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage'])
                .isRequired,
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
        })
      ).isRequired,
    })
  ),
  StudyMenuItems: PropTypes.func,
};

export { StudyBrowser };
