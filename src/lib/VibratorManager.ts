export default class VibratorManager {
  protected _available = false;

  constructor() {
    // @ts-ignore
    if (navigator.vibrate) {
      this._available = true;
    }
  }

  vibrateShort(n: number) {
    if (this._available) {
      const pat = [];
      for (let i = 0; i < n * 2 - 1; i++) {
        pat.push(i % 2 === 0 ? 5 : 5);
      }
      navigator.vibrate(pat);
    }
  }

  vibrateLong() {
    if (this._available) {
      navigator.vibrate(400);
    }
  }
}
