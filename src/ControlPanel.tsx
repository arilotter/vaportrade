import { ButtonForm, Window } from "packard-belle";
import { useImmer } from "use-immer";
import { config, defaultSettings, setSetting } from "./settings";
import { useOnKeyDown, Writeable } from "./utils/utils";
import GitInfo from "react-git-info/macro";

import controlPanelIcon from "./icons/controlPanel.png";
import { useCallback } from "react";

const gitInfo = GitInfo();

interface ControlPanelProps {
  onClose: () => void;
  onMinimize?: () => void;
}

export function ControlPanel({ onClose, onMinimize }: ControlPanelProps) {
  const [modifiedConfig, updateModifiedConfig] = useImmer<
    Writeable<typeof config>
  >({ ...config });
  const realKeys = Object.keys(modifiedConfig) as Array<
    keyof typeof modifiedConfig
  >;

  const hasChanges = realKeys.some(
    (key) => modifiedConfig[key] !== config[key]
  );
  const tryClose = useCallback(() => {
    if (
      hasChanges &&
      !window.confirm("You have unsaved changes. Close without saving them?")
    ) {
      return;
    }
    onClose();
  }, [hasChanges, onClose]);
  useOnKeyDown("Escape", tryClose);
  return (
    <div className="modal">
      <Window
        title="Control Panel"
        icon={controlPanelIcon}
        onMinimize={onMinimize}
        onClose={tryClose}
      >
        <div style={{ padding: "4px" }}>Version: {gitInfo.commit.hash}</div>
        <div style={{ padding: "4px" }}>Build date: {gitInfo.commit.date}</div>
        {realKeys.map((configKey) => (
          <div key={configKey} style={{ padding: "4px" }}>
            <label htmlFor={configKey}>{sentanceCaseify(configKey)}</label>
            <input
              style={{
                minWidth: "256px",
                background:
                  modifiedConfig[configKey] !== config[configKey]
                    ? "goldenrod"
                    : modifiedConfig[configKey] !== defaultSettings[configKey]
                    ? "lightgreen"
                    : "white",
              }}
              type="text"
              className="InputText text"
              value={modifiedConfig[configKey]}
              onChange={(ev) => {
                updateModifiedConfig((cfg) => {
                  cfg[configKey] = ev.target.value;
                });
              }}
            />
            {modifiedConfig[configKey] !== config[configKey] ? (
              <ButtonForm
                onClick={() => {
                  updateModifiedConfig((cfg) => {
                    cfg[configKey] = config[configKey];
                  });
                }}
              >
                Undo Changes
              </ButtonForm>
            ) : null}
            {modifiedConfig[configKey] !== defaultSettings[configKey] ? (
              <ButtonForm
                onClick={() => {
                  updateModifiedConfig((cfg) => {
                    cfg[configKey] = defaultSettings[configKey];
                  });
                }}
              >
                Reset to Default
              </ButtonForm>
            ) : null}
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
