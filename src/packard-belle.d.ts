declare module "packard-belle" {
  import type { RefObject } from "react";
  type ClickEvent = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  export function Theme(props: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }): JSX.Element;

  export function ButtonForm(props: {
    children: React.ReactNode | string;

    className?: string;
    isActive?: boolean;
    isDisabled?: boolean;

    onClick?: ClickEvent;
  }): JSX.Element;

  export function ButtonNav(props: {
    className?: string;
    isActive?: boolean;
    isDisabled?: boolean;

    onClick?: ClickEvent;
  }): JSX.Element;

  export function ButtonProgram(props: {
    className?: string;
    isActive?: boolean;

    style?: React.CSSProperties;

    onClick?: ClickEvent;
  }): JSX.Element;
  export function StartButton(props: any): JSX.Element;
  export function ButtonIconLarge(props: any & { icon: string }): JSX.Element;
  export function ButtonIconSmall(
    props: any & { icon: string; hasBorder: boolean }
  ): JSX.Element;
  export function StandardMenu(props: any): JSX.Element;
  export function ExplorerIcon(props: any): JSX.Element;
  export function ListIcon(props: any): JSX.Element;
  export function ExplorerView(props: any): JSX.Element;
  export function Checkbox(props: any): JSX.Element;
  export function Radio(props: any): JSX.Element;
  export function InputText(props: any): JSX.Element;
  export function FakeSelect(props: any): JSX.Element;
  export function SelectBox(props: any): JSX.Element;
  export function SelectBoxSimple(props: any): JSX.Element;
  export function StartMenu(props: any): JSX.Element;
  export function TaskBar(props: any): JSX.Element;
  export function MenuBar(props: any): JSX.Element;
  export function Window(props: {
    children: React.ReactNode;
    title: string;
    maximizeOnOpen?: boolean;
    className?: string;
    resizable?: boolean;
    changingState?: boolean;
    innerRef?: RefObject;
    icon?: string;

    onClose?: ClickEvent;
    onMaximize?: ClickEvent;
    onRestore?: ClickEvent;
    onMinimize?: ClickEvent;
    onHelp?: ClickEvent;
  }): JSX.Element;
  export function WindowAlert(props: any): JSX.Element;
  export function WindowAction(props: any): JSX.Element;
  export function WindowExplorer(props: any): JSX.Element;
  export function WindowProgram(props: any): JSX.Element;
  export function DetailsSection(props: any): JSX.Element;
}
