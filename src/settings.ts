// Default settings!
const settings = {
  zeroExContractAddress: "0x1119E3e8919d68366f56B74445eA2d10670Ac9eF",
  corsAnywhereUrl:
    process.env.NODE_ENV === "production"
      ? "https://cors.vaportrade.net/"
      : "http://localhost:8080/",
  sequenceWalletWebappUrl: "https://sequence.app",
};

// Load settings
for (const key of Object.keys(settings)) {
  const storedVal = window.localStorage.getItem(storageKey(key));
  if (storedVal) {
    settings[key as keyof typeof settings] = storedVal;
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
