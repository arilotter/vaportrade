import {
  SelectBox,
  SelectBoxOption,
  Window,
  ListIcon,
  ButtonForm,
  FakeSelect,
  InputText,
} from "packard-belle";
import { useState } from "react";
import { useOnKeyDown } from "../utils/utils";
import "./Contacts.css";
import searchIcon from "./search.png";
import findPeers from "../findPeers.png";
interface ContactsProps<T> {
  onClose?: () => void;
  onHelp?: () => void;
  onSubmit: (peer: T) => void;
  options: Array<SelectBoxOption<T>>;
  requestMorePeers: () => void;
}
export function Contacts<T>({
  onClose,
  onHelp,
  onSubmit,
  options,
  requestMorePeers,
}: ContactsProps<T>) {
  const [selectedPeer, setSelectedPeer] = useState<T | null>(null);
  useOnKeyDown("Escape", () => onClose?.());
  const [filter, setFilter] = useState("");

  const filteredOptions = options.filter((option) =>
    option.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="modal darkenbg">
      <Window
        className="WindowAction contactsWindow"
        title="Pick a trading partner"
        onClose={onClose}
        onHelp={onHelp}
        resizable={false}
        icon={findPeers}
      >
        <div className="contactsContents">
          <div className="contactsSearch">
            <div className="contactsFilters">
              <div className="WindowAction__location">
                <label>Load partners from:</label>
                <FakeSelect title="The Internet" isDisabled />
              </div>
              <div className="WindowAction__location">
                <label htmlFor="contactsFilter">Filter addresses:</label>
                <InputText
                  id="contactsFilter"
                  value={filter}
                  onChange={setFilter}
                />
              </div>
            </div>

            {filteredOptions.length ? (
              <SelectBox
                options={filteredOptions}
                selected={selectedPeer}
                component={ListIcon}
                onClick={setSelectedPeer}
              />
            ) : (
              <SelectBox
                isDisabled
                options={[
                  options.length
                    ? {
                        title: "No peers match filter.",
                        value: "No peers match filter.",
                        alt: "No peers match filter.",
                        icon: searchIcon,
                      }
                    : {
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
          </div>
          <div className="WindowAction__action-buttons contactSaveButtons">
            <ButtonForm
              onClick={() => onSubmit(selectedPeer!)}
              className="pre"
              isDisabled={selectedPeer === null}
            >
              Send Trade Request
            </ButtonForm>
            <ButtonForm onClick={requestMorePeers} className="pre">
              Request more peers
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
