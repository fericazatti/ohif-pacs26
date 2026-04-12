import React from 'react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuItem,
  Icons,
} from '@ohif/ui-next';

export default {
  'ohif.menuContent': function (props) {
    const { item: topLevelItem, commandsManager, servicesManager, ...rest } = props;

    const content = function (subProps) {
      const { item: subItem } = subProps;

      // Regular menu item. A `selector` that returns false now HIDES the
      // item entirely (previously it was rendered disabled). Hiding matches
      // the menu UX in the rest of OHIF and lets callers use selectors as
      // visibility guards — e.g. a "Delete" action that only applies to
      // screenshot displaySets.
      if (subItem.selector && !subItem.selector({ servicesManager, ...rest })) {
        return null;
      }

      return (
        <DropdownMenuItem
          onSelect={() => {
            commandsManager.runAsync(subItem.commands, {
              ...subItem.commandOptions,
              ...rest,
            });
          }}
          className="gap-[6px]"
        >
          {subItem.iconName && (
            <Icons.ByName
              name={subItem.iconName}
              className="-ml-1"
            />
          )}
          {subItem.label}
        </DropdownMenuItem>
      );
    };

    // If item has sub-items, render a submenu
    if (topLevelItem.items) {
      return (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-[6px]">
            {topLevelItem.iconName && (
              <Icons.ByName
                name={topLevelItem.iconName}
                className="-ml-1"
              />
            )}
            {topLevelItem.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {topLevelItem.items.map(subItem => content({ ...props, item: subItem }))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      );
    }

    return content({ ...props, item: topLevelItem });
  },
};
