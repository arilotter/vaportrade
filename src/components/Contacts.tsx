import {
  SelectBox,
  SelectBoxOption,
  Window,
  ListIcon,
  ButtonForm,
  FakeSelect,
} from "packard-belle";
import { useState } from "react";
import { useOnEscapePressed } from "../utils/utils";
import "./Contacts.css";
import searchIcon from "./search.png";
interface ContactsProps<T> {
  onClose?: () => void;
  onHelp?: () => void;
  onSubmit: (peer: T) => void;
  options: Array<SelectBoxOption<T>>;
}
export function Contacts<T>({
  onClose,
  onHelp,
  onSubmit,
  options,
}: ContactsProps<T>) {
  const [selectedPeer, setSelectedPeer] = useState<T | null>(null);
  useOnEscapePressed(() => onClose?.());
  return (
    <div className="modal">
      <Window
        className="WindowAction"
        title="Pick a trading partner"
        onClose={onClose}
        onHelp={onHelp}
        resizable={false}
      >
        <div className="WindowAction__location">
          <div>Load partners from:</div>
          <FakeSelect title="The Internet" />
        </div>
        {options.length ? (
          <SelectBox
            options={options}
            selected={selectedPeer}
            component={ListIcon}
            onClick={setSelectedPeer}
          />
        ) : (
          <SelectBox
            isDisabled
            options={[
              {
                title: "Waiting for peers...",
                value: "Waiting for peers...",
                alt: "Waiting for peers...",
                icon: searchIcon,
              },
            ]}
            selected={[]}
            component={ListIcon}
            onClick={() => {}}
          />
        )}
        <div className="WindowAction__footer">
          <div className="WindowAction__action-buttons contactSaveButtons">
            <ButtonForm
              onClick={() => onSubmit(selectedPeer!)}
              className="pre"
              isDisabled={selectedPeer === null}
            >
              {"   "}Send Trade Request{"   "}
            </ButtonForm>
            <ButtonForm onClick={onClose} className="pre">
              Cancel
            </ButtonForm>
          </div>
        </div>
      </Window>
    </div>
  );
}
