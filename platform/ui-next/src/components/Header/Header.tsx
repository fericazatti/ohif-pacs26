import React, { ReactNode } from 'react';
import classNames from 'classnames';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  ToolButton,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

const ToolbarGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col items-center">
    <span className="mb-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-[#7A7A88]">
      {label}
    </span>
    <div className="flex items-center gap-[4px]">{children}</div>
  </div>
);

const GroupDivider = () => (
  <div className="mb-[6px] h-9 w-px self-end bg-[#2E2E2E]" />
);

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  PrimaryRight?: ReactNode;
  UndoRedo?: ReactNode;
}

function Header({
  children,
  menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  UndoRedo,
  Secondary,
  PrimaryRight,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        <div className="flex h-[72px] w-full items-center">
          {/* Zona izquierda: PatientInfo — ancho fijo igual al panel de estudios */}
          <div className="flex w-[285px] shrink-0 items-center pl-3">
            {PatientInfo}
          </div>

          {/* Zona central: los 3 grupos juntos, separados por divisores sutiles */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-end gap-3">
              {Secondary && (
                <ToolbarGroup label="VISUALIZACIÓN">{Secondary}</ToolbarGroup>
              )}
              {Secondary && children && <GroupDivider />}
              {children && <ToolbarGroup label="MOUSE">{children}</ToolbarGroup>}
              {children && PrimaryRight && <GroupDivider />}
              {PrimaryRight && (
                <ToolbarGroup label="OTRAS HERRAMIENTAS">{PrimaryRight}</ToolbarGroup>
              )}
            </div>
          </div>

          {/* Zona extrema derecha: logo + ajustes */}
          <div className="flex shrink-0 select-none items-center">
            <div className="ml-1 mr-1">
              {WhiteLabeling?.createLogoComponentFn?.(React, props) || <Icons.OHIFLogo />}
            </div>
            <div className="border-primary-dark mx-1.5 h-[25px] border-r"></div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:bg-primary-dark"
                  >
                    <Icons.GearSettings />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuOptions.map((option, index) => {
                    const IconComponent = option.icon
                      ? Icons[option.icon as keyof typeof Icons]
                      : null;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onSelect={option.onClick}
                        className="flex items-center gap-2 py-2"
                      >
                        {IconComponent && (
                          <span className="flex h-4 w-4 items-center justify-center">
                            <Icons.ByName name={option.icon} />
                          </span>
                        )}
                        <span className="flex-1">{option.title}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;