import { ButtonForm, Window } from "packard-belle";
import { useImmer } from "use-immer";
import { config, setSetting } from "./settings";
import { Writeable } from "./utils/utils";

interface ControlPanelProps {
  onClose: () => void;
}

export function ControlPanel({ onClose }: ControlPanelProps) {
  const [modifiedConfig, updateModifiedConfig] = useImmer<
    Writeable<typeof config>
  >({ ...config });
  const realKeys = Object.keys(modifiedConfig) as Array<
    keyof typeof modifiedConfig
  >;

  const hasChanges = realKeys.some(
    (key) => modifiedConfig[key] !== config[key]
  );
  return (
    <div className="modal">
      <Window title="Control Panel">
        {realKeys.map((configKey) => (
          <div key={configKey} style={{ padding: "4px" }}>
            <label htmlFor={configKey}>{sentanceCaseify(configKey)}</label>
            <input
              style={{
                minWidth: "256px",
              }}
              type="text"
              className="InputText text"
              value={modifiedConfig[configKey]}
              placeholder="chungus"
              onChange={(ev) => {
                updateModifiedConfig((cfg) => {
                  cfg[configKey] = ev.target.value;
                });
              }}
            />
          </div>
        ))}

        <ButtonForm
          isDisabled={!hasChanges}
          onClick={() => {
            for (const key of Object.keys(modifiedConfig) as Array<
              keyof typeof modifiedConfig
            >) {
              setSetting(key, modifiedConfig[key]);
            }
            setTimeout(() => {
              window.location.reload();
            }, 500);
            onClose();
          }}
        >
          Save and Reboot
        </ButtonForm>
        <ButtonForm
          onClick={() => {
            if (
              hasChanges &&
              !window.confirm("You have unsaved changes. Reset them?")
            ) {
              return;
            }
            onClose();
          }}
        >
          Cancel
        </ButtonForm>
      </Window>
    </div>
  );
}

function sentanceCaseify(camel: string): string {
  const result = camel.replace(/([A-Z])/g, " $1");
  const finalResult =
    result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  return finalResult;
}
