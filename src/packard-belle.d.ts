declare module "packard-belle" {
  import type { RefObject } from "react";
  type ClickEvent = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;

  export interface SelectBoxOption<T> {
    value: T;
    title: string;
    icon: string;
    alt: string;
    className?: string;
  }

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
    children?: React.ReactNode;
    icon: string;

    onClick?: ClickEvent;
  }): JSX.Element;
  export function StartButton(props: any): JSX.Element;
  export function ButtonIconLarge(props: any & { icon: string }): JSX.Element;
  export function ButtonIconSmall(
    props: any & { icon: string; hasBorder: boolean }
  ): JSX.Element;
  export function StandardMenu(props: any): JSX.Element;
  export function StandardMenuHOC(props: any): JSX.Element;
  export function ExplorerIcon(props: any): JSX.Element;
  export function ListIcon(props: any): JSX.Element;
  export function ExplorerView(props: any): JSX.Element;
  export function Checkbox(props: {
    readOnly?: boolean;
    label: string;
    id: string;
    name?: string;
    checked?: boolean;
    isDisabled?: boolean;
    onChange?: () => void;
  }): JSX.Element;
  export function Radio(props: any): JSX.Element;
  export function InputText(props: {
    id?: string;
    value: string;
    onChange: (val: string) => void;
  }): JSX.Element;
  export function FakeSelect(props: any): JSX.Element;
  export function SelectBox(props: {
    component?: React.ComponentType;
    isDisabled?: boolean;
    options: Array<SelectBoxOption>;
    selected?: SelectBoxOption["value"] | Array<SelectBoxOption["value"]>;
    onClick?: (option: SelectBoxOption["value"]) => void;
  }): JSX.Element;
  export function SelectBoxSimple(props: any): JSX.Element;
  export function StartMenu(props: any): JSX.Element;
  export function TaskBar(props: {
    options: NestedArray<{ title: string; icon: string; onClick: () => void }>;
    quickLaunch?: Array<{ icon: string; title: string; onClick?: () => void }>;
    openWindows?: Array<{
      isActive: boolean;
      onClick: () => void;
      icon: string;
      title: string;
    }>;
    notifiers: Array<{ alt: string; icon: string; onClick: () => void }>;
  }): JSX.Element;
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
  export function WindowAction(props: {
    className?: string;
    action: string;
    onAction?: ClickEvent;
    onCancel?: ClickEvent;
    onHelp?: ClickEvent;
    location?: string;
    content?: Array<SelectBoxOption>;
    onChangeName?: (text: string) => void;
    name?: string;
  }): JSX.Element;
  export function WindowExplorer(props: any): JSX.Element;
  export function WindowProgram(props: any): JSX.Element;
  export function DetailsSection(props: {
    title: React.ReactNode;
    children: React.ReactNode;
  }): JSX.Element;
}
interface NestedArray<T> extends Array<T | NestedArray<T>> {}
