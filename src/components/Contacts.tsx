import {
  SelectBox,
  SelectBoxOption,
  Window,
  ListIcon,
  ButtonForm,
  FakeSelect,
} from "packard-belle";
import "./Contacts.css";
import searchIcon from "./search.png";
interface ContactsProps<T> {
  onClose?: () => void;
  onHelp?: () => void;
  onSubmit?: () => void;
  onChangeSelected?: (value: T) => void;
  options: Array<SelectBoxOption>;
}
export function Contacts<T>({
  onClose,
  onHelp,
  onSubmit,
  onChangeSelected,
  options,
}: ContactsProps<T>) {
  console.log(options);
  return (
    <div className="contactsModal">
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
            className="WindowAction__files"
            selected={[]}
            component={ListIcon}
            onClick={onChangeSelected ?? (() => {})}
          />
        ) : (
          <SelectBox
            isDisabled={true}
            options={[
              {
                title: "Waiting for peers...",
                value: "Waiting for peers...",
                alt: "Waiting for peers...",
                icon: searchIcon,
              },
            ]}
            className="WindowAction__files"
            selected={[]}
            component={ListIcon}
            onClick={() => {}}
          />
        )}
        <div className="WindowAction__footer">
          <div className="WindowAction__action-buttons contactSaveButtons">
            <ButtonForm onClick={onSubmit} className="pre">
              {"  "}Send Trade Request{"  "}
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
