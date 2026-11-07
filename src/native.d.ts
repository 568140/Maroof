export interface MaaroufAndroidBridge {
  isAvailable?: () => boolean;
  readContacts: () => Promise<string | { name: string; phone: string }[]>;
  getDeviceId?: () => string;
  getDeviceModel?: () => string;
}

declare global {
  interface Window {
    MaaroufAndroid?: MaaroufAndroidBridge;
  }
}

export {};
