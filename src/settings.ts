// Default settings!
const _defaultSettings = {
  background: "#008080",
  corsAnywhereUrl:
    process.env.NODE_ENV === "production" ? "" : "http://localhost:8080/",
  sequenceWalletWebappUrl: "https://sequence.app",
  debugModeSetMeToTheStringTrue:
    process.env.NODE_ENV === "development" ? "true" : "false",
  testnetModeSetMeToTheStringTrue:
    process.env.NODE_ENV === "development" ? "true" : "false",
};

export const defaultSettings: {
  readonly [K in keyof typeof _defaultSettings]: string;
} = _defaultSettings;

const settings = {
  ...defaultSettings,
};

const settingsVersions: { [K in keyof typeof settings]: number } = {
  background: 0,
  corsAnywhereUrl: 1,
  sequenceWalletWebappUrl: 0,
  debugModeSetMeToTheStringTrue: 0,
  testnetModeSetMeToTheStringTrue: 0,
};

// Load settings
for (const key of Object.keys(settings) as Array<keyof typeof settings>) {
  const storedVal = window.localStorage.getItem(storageKey(key));
  if (storedVal) {
    settings[key as keyof typeof settings] = storedVal as any;
  }
}

export function setSetting<K extends keyof typeof settings>(
  key: K,
  value: typeof settings[K]
) {
  window.localStorage.setItem(storageKey(key), value);
}

function storageKey(key: keyof typeof settings) {
  return `vaportrade_settings_${key}_v${settingsVersions[key]}`;
}

export const config: Readonly<typeof settings> = settings;
export const LS_SIGNED_ORDER_CACHE_KEY = "signedOrderCache";
