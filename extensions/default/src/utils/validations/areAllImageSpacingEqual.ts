import {
  _getPerpendicularDistance,
  reconstructionIssues,
} from '@ohif/core/src/utils/isDisplaySetReconstructable';
import { DisplaySetMessage } from '@ohif/core';
import toNumber from '@ohif/core/src/utils/toNumber';
import { DisplaySetMessageList } from '@ohif/core';

// Tolerance for spacing variation that triggers a warning to the radiologist.
// Intentionally TIGHTER than the reconstructable gate (20% in
// isDisplaySetReconstructable.js) so we can display a warning on volumes that
// still pass reconstruction but render distorted in MPR coronal/sagittal.
// 5% catches CTs with mixed-thickness acquisitions without flagging routine
// helical CTs whose spacing varies by sub-pixel amounts.
const WARN_SPACING_TOLERANCE = 0.05;

function _getSpacingIssueWarn(spacing: number, averageSpacing: number) {
  const equalWithinTolerance =
    Math.abs(spacing - averageSpacing) < averageSpacing * WARN_SPACING_TOLERANCE;
  if (equalWithinTolerance) {
    return;
  }
  const multipleOfAverageSpacing = spacing / averageSpacing;
  const numberOfSpacings = Math.round(multipleOfAverageSpacing);
  const errorForEachSpacing =
    Math.abs(spacing - numberOfSpacings * averageSpacing) / Math.max(numberOfSpacings, 1);
  if (errorForEachSpacing < WARN_SPACING_TOLERANCE * averageSpacing) {
    return {
      issue: reconstructionIssues.MISSING_FRAMES,
      missingFrames: numberOfSpacings - 1,
    };
  }
  return { issue: reconstructionIssues.IRREGULAR_SPACING };
}

/**
 * Checks if series has spacing issues
 * @param {*} instances
 * @param {*} warnings
 */
export default function areAllImageSpacingEqual(
  instances: Array<any>,
  messages: DisplaySetMessageList
): void {
  if (!instances?.length) {
    return;
  }
  const firstImagePositionPatient = toNumber(instances[0].ImagePositionPatient);
  if (!firstImagePositionPatient) {
    return;
  }
  const lastIpp = toNumber(instances[instances.length - 1].ImagePositionPatient);

  const averageSpacingBetweenFrames =
    _getPerpendicularDistance(firstImagePositionPatient, lastIpp) / (instances.length - 1);

  let previousImagePositionPatient = firstImagePositionPatient;

  const issuesFound = [];
  for (let i = 1; i < instances.length; i++) {
    const instance = instances[i];
    const imagePositionPatient = toNumber(instance.ImagePositionPatient);

    const spacingBetweenFrames = _getPerpendicularDistance(
      imagePositionPatient,
      previousImagePositionPatient
    );

    const spacingIssue = _getSpacingIssueWarn(spacingBetweenFrames, averageSpacingBetweenFrames);

    if (spacingIssue) {
      const issue = spacingIssue.issue;

      // avoid multiple warning of the same thing
      if (!issuesFound.includes(issue)) {
        issuesFound.push(issue);
        if (issue === reconstructionIssues.MISSING_FRAMES) {
          messages.addMessage(DisplaySetMessage.CODES.MISSING_FRAMES);
        } else if (issue === reconstructionIssues.IRREGULAR_SPACING) {
          messages.addMessage(DisplaySetMessage.CODES.IRREGULAR_SPACING);
        }
      }
      // we just want to find issues not how many
      if (issuesFound.length > 1) {
        break;
      }
    }
    previousImagePositionPatient = imagePositionPatient;
  }
}
