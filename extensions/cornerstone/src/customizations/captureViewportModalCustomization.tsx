import React, { useState, useEffect, useRef } from 'react';
import { ImageModal, FooterAction } from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
const MAX_TEXTURE_SIZE = 10000;
const DEFAULT_FILENAME = 'image';

interface ViewportDownloadFormNewProps {
  onClose: () => void;
  defaultSize: number;
  viewportId: string;
  showAnnotations: boolean;
  onAnnotationsChange: (show: boolean) => void;
  dimensions: { width: number; height: number };
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  onEnableViewport: (element: HTMLElement) => void;
  onDisableViewport: () => void;
  onDownload: (filename: string, fileType: string) => void;
  onSaveDicom?: () => void;
}

function ViewportDownloadFormNew({
  onClose,
  defaultSize,
  viewportId,
  showAnnotations,
  onAnnotationsChange,
  dimensions,
  onDimensionsChange,
  onEnableViewport,
  onDisableViewport,
  onDownload,
  onSaveDicom,
}: ViewportDownloadFormNewProps) {
  const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
  const [filename, setFilename] = useState(DEFAULT_FILENAME);
  const [fileType, setFileType] = useState(onSaveDicom ? 'dicom' : 'jpg');
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const { t } = useTranslation('CaptureViewportModal');

  const exportOptions = [
    ...(onSaveDicom ? [{ value: 'dicom', label: 'DICOM PACS' }] : []),
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
  ];

  useEffect(() => {
    if (!viewportElement) {
      return;
    }

    onEnableViewport(viewportElement);

    return () => {
      onDisableViewport();
    };
  }, [onDisableViewport, onEnableViewport, viewportElement]);

  useEffect(() => {
    const node = previewContainerRef.current;
    if (!node || !dimensions.width || !dimensions.height) {
      return;
    }
    const updateScale = () => {
      const { width: cw, height: ch } = node.getBoundingClientRect();
      if (!cw || !ch) {
        return;
      }
      setPreviewScale(Math.min(cw / dimensions.width, ch / dimensions.height));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(node);
    return () => ro.disconnect();
  }, [dimensions.width, dimensions.height]);

  return (
    <ImageModal>
      <ImageModal.Body>
        <ImageModal.ImageVisual>
          <div
            ref={previewContainerRef}
            className="flex h-full w-full items-center justify-center overflow-hidden"
          >
            <div
              style={{
                width: dimensions.width,
                height: dimensions.height,
                transform: `scale(${previewScale})`,
                transformOrigin: 'center center',
                flexShrink: 0,
                position: 'relative',
              }}
              data-viewport-uid={viewportId}
              ref={setViewportElement}
            />
          </div>
        </ImageModal.ImageVisual>

        <ImageModal.ImageOptions>
          <div className="flex items-end space-x-2">
            {fileType !== 'dicom' && (
              <ImageModal.Filename
                value={filename}
                onChange={e => setFilename(e.target.value)}
              >
                {t('File name')}
              </ImageModal.Filename>
            )}
            <ImageModal.Filetype
              selected={fileType}
              onSelect={setFileType}
              options={exportOptions}
            />
          </div>

          <ImageModal.ImageSize
            width={dimensions.width.toString()}
            height={dimensions.height.toString()}
            widthLabel={t('Width')}
            heightLabel={t('Height')}
            widthPlaceholder={t('Width')}
            heightPlaceholder={t('Height')}
            onWidthChange={e => {
              onDimensionsChange({
                ...dimensions,
                width: parseInt(e.target.value) || defaultSize,
              });
            }}
            onHeightChange={e => {
              onDimensionsChange({
                ...dimensions,
                height: parseInt(e.target.value) || defaultSize,
              });
            }}
            maxWidth={MAX_TEXTURE_SIZE.toString()}
            maxHeight={MAX_TEXTURE_SIZE.toString()}
          >
            {t('Image size in pixels')}
          </ImageModal.ImageSize>

          <ImageModal.SwitchOption
            defaultChecked={showAnnotations}
            checked={showAnnotations}
            onCheckedChange={onAnnotationsChange}
          >
            {t('Include annotations')}
          </ImageModal.SwitchOption>
          <FooterAction className="mt-2">
            <FooterAction.Right>
              <FooterAction.Secondary onClick={onClose}>
                {t('Common:Cancel')}
              </FooterAction.Secondary>
              <FooterAction.Primary
                onClick={() => {
                  if (fileType === 'dicom') {
                    onSaveDicom?.();
                  } else {
                    onDownload(filename || DEFAULT_FILENAME, fileType);
                  }
                  onClose();
                }}
              >
                {t('Guardar')}
              </FooterAction.Primary>
            </FooterAction.Right>
          </FooterAction>
        </ImageModal.ImageOptions>
      </ImageModal.Body>
    </ImageModal>
  );
}

export default {
  'ohif.captureViewportModal': ViewportDownloadFormNew,
};
