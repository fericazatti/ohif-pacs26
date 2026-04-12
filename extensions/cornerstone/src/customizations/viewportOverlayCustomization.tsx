export default {
  'viewportOverlay.topLeft': [
    {
      id: 'StudyDate',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Study date',
      condition: ({ referenceInstance }) => referenceInstance?.StudyDate,
      contentF: ({ referenceInstance, formatters: { formatDate } }) =>
        formatDate(referenceInstance.StudyDate),
    },
    {
      id: 'SeriesDescription',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Series description',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.SeriesDescription;
      },
      contentF: ({ referenceInstance }) => referenceInstance.SeriesDescription,
    },
  ],
  'viewportOverlay.topRight': [],
  'viewportOverlay.bottomLeft': [
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
    },
    {
      id: 'ZoomLevel',
      inheritsFrom: 'ohif.overlayItem.zoomLevel',
      condition: props => {
        const activeToolName = props.toolGroupService.getActiveToolForViewport(props.viewportId);
        return activeToolName === 'Zoom';
      },
    },
  ],
  'viewportOverlay.bottomRight': [
    {
      id: 'InstanceNumber',
      inheritsFrom: 'ohif.overlayItem.instanceNumber',
    },
    {
      id: 'SliceLocation',
      inheritsFrom: 'ohif.overlayItem',
      label: 'Loc:',
      title: 'Slice location (mm)',
      condition: ({ instance }) =>
        instance?.SliceLocation != null ||
        (Array.isArray(instance?.ImagePositionPatient) && instance.ImagePositionPatient.length === 3),
      contentF: ({ instance }) => {
        const loc =
          instance?.SliceLocation != null
            ? Number(instance.SliceLocation)
            : Number(instance?.ImagePositionPatient?.[2]);
        if (!Number.isFinite(loc)) {
          return null;
        }
        return `${loc.toFixed(1)} mm`;
      },
    },
    {
      id: 'SliceThickness',
      inheritsFrom: 'ohif.overlayItem',
      label: 'Esp:',
      title: 'Slice thickness',
      condition: ({ instance, displaySet }) =>
        instance?.SliceThickness != null || displaySet?.instances?.[0]?.SliceThickness != null,
      contentF: ({ instance, displaySet }) => {
        const raw = instance?.SliceThickness ?? displaySet?.instances?.[0]?.SliceThickness;
        const t = Number(raw);
        if (!Number.isFinite(t)) {
          return null;
        }
        return `${t.toFixed(2)} mm`;
      },
    },
    {
      id: 'Spacing',
      inheritsFrom: 'ohif.overlayItem',
      label: 'Sp:',
      title: 'Average spacing between frames',
      condition: ({ displaySet }) => displaySet?.averageSpacingBetweenFrames != null,
      contentF: ({ displaySet }) => {
        const s = Number(displaySet.averageSpacingBetweenFrames);
        if (!Number.isFinite(s)) {
          return null;
        }
        return `${s.toFixed(2)} mm`;
      },
    },
  ],
};
