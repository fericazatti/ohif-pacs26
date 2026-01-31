import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../DropdownMenu/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';

export function StudyBrowserViewOptions({
  tabs,
  onSelectTab,
  activeTabName,
  compact = false,
}: withAppTypes & { compact?: boolean }) {
  const handleTabChange = (tabName: string) => {
    onSelectTab(tabName);
  };

  const activeTab = tabs.find(tab => tab.name === activeTabName);
  const triggerWrapperClass = compact
    ? 'min-w-[120px] max-w-[160px] overflow-hidden'
    : 'w-full w-[50%] overflow-hidden';
  const triggerClassName = compact
    ? 'border-inputfield-main focus:border-inputfield-main flex h-[26px] w-full min-w-0 items-center justify-start rounded border bg-black p-2 text-base text-white truncate'
    : 'border-inputfield-main focus:border-inputfield-main flex h-[26px] w-full items-center justify-start rounded border bg-black p-2 text-base text-white';

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger className={triggerWrapperClass}>
          <DropdownMenuTrigger className={triggerClassName}>
            {activeTab?.label}
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{activeTab?.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="bg-black">
        {tabs.map(tab => {
          const { name, label, studies } = tab;
          const isActive = activeTabName === name;
          const isDisabled = !studies.length;

          if (isDisabled) {
            return null;
          }

          return (
            <DropdownMenuItem
              key={name}
              className={`text-white ${isActive ? 'font-bold' : ''}`}
              onClick={() => handleTabChange(name)}
            >
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
