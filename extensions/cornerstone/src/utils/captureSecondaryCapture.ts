import dcmjs from 'dcmjs';
import html2canvas from 'html2canvas';

const SC_SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.7';
const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';
const SCREENSHOTS_SERIES_NUMBER = 9999;
const SCREENSHOTS_SERIES_DESCRIPTION = 'Capturas de pantalla';
const SCREENSHOTS_SERIES_SUFFIX = '.9999';
const IMPLEMENTATION_VERSION = 'INTECNUS-OHIF-SC-1.0';

type StudyLike = {
  PatientName?: unknown;
  PatientID?: string;
  PatientBirthDate?: string;
  PatientSex?: string;
  StudyInstanceUID: string;
  StudyDate?: string;
  StudyTime?: string;
  StudyID?: string;
  AccessionNumber?: string;
  ReferringPhysicianName?: string;
};

function formatDicomDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}${mo}${da}`;
}

function formatDicomTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}${mi}${s}`;
}

// Deterministic series UID so every capture for the same study goes into one "Screenshots" series.
// DICOM UIDs are capped at 64 chars; fall back to a fresh UID if the derivation overflows.
function deriveScreenshotsSeriesUID(studyInstanceUID: string): string {
  const derived = `${studyInstanceUID}${SCREENSHOTS_SERIES_SUFFIX}`;
  if (derived.length <= 64) {
    return derived;
  }
  return dcmjs.data.DicomMetaDictionary.uid();
}

function extractPatientName(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as { Alphabetic?: string; Value?: unknown };
    if (obj.Alphabetic) return obj.Alphabetic;
    if (Array.isArray(obj.Value) && obj.Value[0]) {
      return extractPatientName(obj.Value[0]);
    }
  }
  return '';
}

function canvasToRgbBuffer(canvas: HTMLCanvasElement): {
  buffer: ArrayBuffer;
  width: number;
  height: number;
} {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No se pudo obtener contexto 2D del canvas.');
  }
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data; // RGBA
  const rgbLen = width * height * 3;
  // DICOM PixelData with VR OB must be even-length.
  const padded = rgbLen % 2 === 0 ? rgbLen : rgbLen + 1;
  const buffer = new ArrayBuffer(padded);
  const dst = new Uint8Array(buffer);
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    // Composite over black — the capture contains a black viewport background anyway,
    // but we defend against any residual alpha from overlays.
    const a = src[i + 3] / 255;
    dst[j] = Math.round(src[i] * a);
    dst[j + 1] = Math.round(src[i + 1] * a);
    dst[j + 2] = Math.round(src[i + 2] * a);
  }
  return { buffer, width, height };
}

async function compositeViewportToCanvas(
  viewportElement: HTMLElement
): Promise<HTMLCanvasElement> {
  // html2canvas walks the DOM and flattens the cornerstone <canvas> (image layer)
  // together with the SVG annotation overlay into a single bitmap — this is exactly
  // what the radiologist sees on screen, including measurements, length labels, etc.
  //
  // The capture modal applies a CSS `transform: scale(...)` to fit the preview into
  // its frame. html2canvas reads the element's transformed bounding rect to size its
  // output, which would shrink the capture. Strip the transform around the call so
  // the bitmap matches the underlying canvas pixel dimensions.
  const previousTransform = viewportElement.style.transform;
  const previousTransformOrigin = viewportElement.style.transformOrigin;
  viewportElement.style.transform = 'none';
  viewportElement.style.transformOrigin = '';
  try {
    return await html2canvas(viewportElement, {
      backgroundColor: '#000000',
      useCORS: true,
      logging: false,
      scale: 1,
    });
  } finally {
    viewportElement.style.transform = previousTransform;
    viewportElement.style.transformOrigin = previousTransformOrigin;
  }
}

function buildDataset(
  pixelBuffer: ArrayBuffer,
  width: number,
  height: number,
  study: StudyLike,
  instanceNumber: number
): Record<string, unknown> {
  const now = new Date();
  const contentDate = formatDicomDate(now);
  const contentTime = formatDicomTime(now);
  const sopInstanceUID = dcmjs.data.DicomMetaDictionary.uid();
  const seriesInstanceUID = deriveScreenshotsSeriesUID(study.StudyInstanceUID);

  const dataset: Record<string, unknown> = {
    _meta: {
      TransferSyntaxUID: { Value: [EXPLICIT_VR_LITTLE_ENDIAN] },
    },
    // PixelData has VR "ox" (OB or OW) — must be specified per-dataset.
    _vrMap: { PixelData: 'OB' },

    SpecificCharacterSet: 'ISO_IR 192',

    // SOP Common
    SOPClassUID: SC_SOP_CLASS_UID,
    SOPInstanceUID: sopInstanceUID,

    // Patient
    PatientName: extractPatientName(study.PatientName),
    PatientID: study.PatientID || '',
    PatientBirthDate: study.PatientBirthDate || '',
    PatientSex: study.PatientSex || '',

    // Study (must match parent so it lands in the same study)
    StudyInstanceUID: study.StudyInstanceUID,
    StudyDate: study.StudyDate || contentDate,
    StudyTime: study.StudyTime || contentTime,
    ReferringPhysicianName: study.ReferringPhysicianName || '',
    StudyID: study.StudyID || '',
    AccessionNumber: study.AccessionNumber || '',

    // Series (deterministic so captures accumulate in one "Screenshots" series)
    SeriesInstanceUID: seriesInstanceUID,
    SeriesNumber: SCREENSHOTS_SERIES_NUMBER,
    Modality: 'OT',
    SeriesDate: contentDate,
    SeriesTime: contentTime,
    SeriesDescription: SCREENSHOTS_SERIES_DESCRIPTION,

    // General Equipment
    Manufacturer: 'INTECNUS',
    ManufacturerModelName: 'OHIF Viewer',
    SoftwareVersions: IMPLEMENTATION_VERSION,

    // SC Image module
    ConversionType: 'WSD', // Workstation
    InstanceNumber: instanceNumber,
    ContentDate: contentDate,
    ContentTime: contentTime,

    // Image Pixel
    SamplesPerPixel: 3,
    PhotometricInterpretation: 'RGB',
    PlanarConfiguration: 0,
    Rows: height,
    Columns: width,
    BitsAllocated: 8,
    BitsStored: 8,
    HighBit: 7,
    PixelRepresentation: 0,
    PixelData: pixelBuffer,
  };

  return dataset;
}

export type CaptureResult = {
  sopInstanceUID: string;
  seriesInstanceUID: string;
  width: number;
  height: number;
};

/**
 * Capture the active viewport (image + annotations) and POST it as a DICOM
 * Secondary Capture instance back to dcm4chee via STOW-RS.
 *
 * `dataSourceStore` must expose `store.dicom(arrayBuffer)` — the OHIF default
 * DICOMweb data source satisfies this contract and handles Keycloak auth.
 */
export async function captureViewportAsSecondaryCapture({
  viewportElement,
  study,
  instanceNumber,
  dataSource,
}: {
  viewportElement: HTMLElement;
  study: StudyLike;
  instanceNumber: number;
  dataSource: { store: { dicom: (buf: ArrayBuffer) => Promise<unknown> } };
}): Promise<CaptureResult> {
  if (!study?.StudyInstanceUID) {
    throw new Error('El estudio activo no tiene StudyInstanceUID.');
  }

  const canvas = await compositeViewportToCanvas(viewportElement);
  const { buffer: pixelBuffer, width, height } = canvasToRgbBuffer(canvas);
  const dataset = buildDataset(pixelBuffer, width, height, study, instanceNumber);

  const dicomDict = dcmjs.data.datasetToDict(dataset);
  const part10Buffer: ArrayBuffer = dicomDict.write();

  await dataSource.store.dicom(part10Buffer);

  return {
    sopInstanceUID: dataset.SOPInstanceUID as string,
    seriesInstanceUID: dataset.SeriesInstanceUID as string,
    width,
    height,
  };
}
