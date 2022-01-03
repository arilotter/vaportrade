import { createContext } from "react";
import { PropertiesProps } from "../components/tradeui/Properties";

export interface Menu {
  x: number;
  y: number;
  menuOptions: Array<"divider" | ContextMenuOptions>;
}

export const RightClickMenuContext = createContext<{
  contextMenu: Menu | null;
  setContextMenu: (contextMenu: Menu) => void;
}>({
  setContextMenu: () => {},
  contextMenu: null,
});

export const PropertiesContext = createContext<{
  properties: PropertiesProps[];
  openPropertiesWindow: (props: PropertiesProps) => void;
  closePropertiesWindow: (props: PropertiesProps) => void;
}>({
  properties: [],
  openPropertiesWindow: () => {},
  closePropertiesWindow: () => {},
});
