// Default settings!
const settings = {
  background: "#008080",
  corsAnywhereUrl:
    process.env.NODE_ENV === "production"
      ? "https://cors.vaportrade.net/"
      : "http://localhost:8080/",
  sequenceWalletWebappUrl: "https://sequence.app",
  debugModeSetMeToTheStringTrue:
    process.env.NODE_ENV === "development" ? "true" : "false",
  testnetModeSetMeToTheStringTrue:
    process.env.NODE_ENV === "development" ? "true" : "false",
};

// Load settings
for (const key of Object.keys(settings)) {
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

function storageKey(key: string) {
  return `vaportrade_settings_${key}`;
}

export const config: Readonly<typeof settings> = settings;
export const LS_SIGNED_ORDER_CACHE_KEY = "signedOrderCache";
