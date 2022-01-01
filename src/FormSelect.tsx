import ReactSelect, { GroupBase } from "react-select";
import { StateManagerProps } from "react-select/dist/declarations/src/useStateManager";

export function FormSelect<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(props: StateManagerProps<Option, IsMulti, Group>) {
  return (
    <ReactSelect
      {...props}
      styles={{
        control: () => ({
          height: "22px",
          backgroundColor: "white",
          boxShadow:
            "inset -1px -1px 0px #ffffff, inset 1px 1px 0px 0px #808088, inset -2px -2px 0px #bbc3c4, inset 2px 2px 0px 0px #0c0c0c",
          paddingRight: "16px",
        }),
        singleValue: (provided, state) => ({
          ...provided,
          backgroundImage:
            typeof state.data === "object" && "icon" in state.data
              ? `url(${(state.data as any).icon})`
              : "",
          backgroundSize: "auto 12px",
          backgroundRepeat: "no-repeat",
          paddingLeft:
            typeof state.data === "object" && "icon" in state.data
              ? "18px"
              : "",
        }),
        indicatorsContainer: () => ({
          position: "absolute",
          boxShadow:
            "inset -1px -1px 0px #0c0c0c, inset 1px 1px 0px #bbc3c4, inset -2px -2px 0px #808088, inset 2px 2px 0px #ffffff",
          height: "18px",
          width: "18px",
          right: "2px",
          top: "2px",
          backgroundColor: "#bbc3c4",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundImage:
            'url("data:image/gif;base64,R0lGODlhBwAEAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAHAAQAAAIIhA+CKWoNmSgAOw==")',
        }),
        dropdownIndicator: () => ({
          display: "none",
        }),
        menu: () => ({
          background: "white",
          position: "absolute",
          top: "100%",
          width: "100%",
          zIndex: 1,
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundImage:
            typeof state.data === "object" && "icon" in state.data
              ? `url(${(state.data as any).icon})`
              : "",
          backgroundSize: "auto 12px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "2px 2px",
          paddingLeft:
            typeof state.data === "object" && "icon" in state.data
              ? "18px"
              : "",
          backgroundColor: state.isFocused ? "#0000a2" : "white",
          color: state.isFocused ? "white" : "black",
          padding: "2px 8px",
        }),
      }}
    />
  );
}
