import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Icons } from '@ohif/ui-next';
import { actionIcon, viewPreset } from './types';

function PanelStudyBrowserHeader({
  viewPresets,
  updateViewPresetValue,
  actionIcons,
  updateActionIconValue,
}: {
  viewPresets: viewPreset[];
  updateViewPresetValue: (viewPreset: viewPreset) => void;
  actionIcons: actionIcon[];
  updateActionIconValue: (actionIcon: actionIcon) => void;
}) {
  return (
    <div className="flex h-[40px] select-none items-center bg-black px-3">
      {/* Left: title */}
      <div className="flex flex-1 items-center">
        <span className="text-sm font-semibold tracking-wide text-white">Estudios</span>
      </div>

      {/* Right: filter icon + collapse arrow */}
      <div className="flex items-center gap-2">
        {actionIcons.map((icon: actionIcon, index) =>
          React.createElement(Icons[icon.iconName] || Icons.MissingIcon, {
            key: index,
            onClick: () => updateActionIconValue(icon),
            className: 'cursor-pointer text-[#909090] hover:text-white h-[16px] w-[16px] transition-colors duration-150',
          })
        )}
        <ChevronLeft className="h-[18px] w-[18px] cursor-pointer text-[#909090] transition-colors duration-150 hover:text-white" />
      </div>

      {/* View presets toggle — hidden to free up header space
      <ToggleGroup
        type="single"
        value={viewPresets.filter(preset => preset.selected)[0].id}
        onValueChange={value => {
          const selectedViewPreset = viewPresets.find(preset => preset.id === value);
          updateViewPresetValue(selectedViewPreset);
        }}
      >
        {viewPresets.map((viewPreset: viewPreset, index) => (
          <ToggleGroupItem key={index} aria-label={viewPreset.id} value={viewPreset.id}>
            {React.createElement(Icons[viewPreset.iconName] || Icons.MissingIcon)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      */}
    </div>
  );
}

export { PanelStudyBrowserHeader };
