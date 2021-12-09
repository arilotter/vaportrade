export const sequenceWalletWebappURL:
  | string
  | null = window.localStorage.getItem("sequenceWalletWebappURL");
export function setSequenceWalletWebappURL(url: string) {
  window.localStorage.setItem("sequenceWalletWebappURL", url);
}
// temp until we add control panel
(window as any).setSequenceWalletWebappURL = setSequenceWalletWebappURL;

export const corsAnywhereURL: string | null = window.localStorage.getItem(
  "corsAnywhereURL"
);
