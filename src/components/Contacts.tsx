import { sequence } from "0xsequence";
import {
  SelectBox,
  SelectBoxOption,
  Window,
  ListIcon,
  ButtonForm,
} from "packard-belle";
import "./Contacts.css";
interface ContactsProps<T> {
  wallet: sequence.Wallet;
  onClose?: () => void;
  onHelp?: () => void;
  onSubmit?: () => void;
  onChangeSelected?: (value: T) => void;
}
export function Contacts<T>({
  wallet,
  onClose,
  onHelp,
  onSubmit,
  onChangeSelected,
}: ContactsProps<T>) {
  const contacts: Array<SelectBoxOption> = [
    {
      title: "ari",
      value: "0x000123",
      icon: "",
      alt: "bing chilling",
    },
    {
      title: "matthew",
      value: "0x000123",
      icon: "",
      alt: "bing chilling",
    },
    {
      title: "coulter",
      value: "0x000123",
      icon: "",
      alt: "bing chilling",
    },
  ];
  return (
    <div className="contactsModal">
      <Window
        className="WindowAction"
        title="Pick a trading partner:"
        onClose={onClose}
        onHelp={onHelp}
        resizable={false}
      >
        {/* <div className="WindowAction__location">
          <div>Pick Trading  in</div>
          <FakeSelect title={props.location} />
          <ButtonIconSmall isDisabled hasBorder icon={img5} />
          <ButtonIconSmall isDisabled hasBorder icon={img4} />
          <ButtonIconSmall isDisabled hasBorder icon={img3} />
          <ButtonIconSmall isDisabled hasBorder icon={img2} />
          <ButtonIconSmall isDisabled hasBorder icon={img1} />
        </div> */}
        <SelectBox
          options={contacts}
          className="WindowAction__files"
          selected={[]}
          component={ListIcon}
          onClick={onChangeSelected ?? (() => {})}
        />
        <div className="WindowAction__footer">
          <div className="WindowAction__action-buttons contactSaveButtons">
            <ButtonForm onClick={onSubmit}>Pick</ButtonForm>
            <ButtonForm onClick={onClose}>Cancel</ButtonForm>
          </div>
        </div>
      </Window>
    </div>
  );
}
