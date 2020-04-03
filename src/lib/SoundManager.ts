import {Howl} from 'howler';

interface SoundManagerOptions {
  onLoad?: () => void,
  onError?: () => void,
  onPlay?: () => void,
  onEnded?: () => void,
}

export default class SoundManager {
  protected _soundSources = new Map<number, Howl>();
  protected _options: SoundManagerOptions;
  protected _count = 0;

  constructor(options: SoundManagerOptions) {
    this._options = options;
    const tasks = [];
    for (let i = 2; i <= 4096; i *= 2) {
      const sound: Howl = new Howl({
        src: [require(`../assets/audio/effect-${i}.mp3`)],
      });
      tasks.push(new Promise((resolve, reject) => {
        sound.once('load', () => {
          this._soundSources.set(i, sound);
          resolve();
        });
        sound.once('loaderror', () => {
          this._soundSources.set(i, sound);
          reject();
        });
        sound.on('play', () => {
          this._count++;
          if (this._options.onPlay != null) {
            this._options.onPlay();
          }
        });
        sound.on('end', () => {
          this._count--;
          if (this._count === 0 && this._options.onEnded) {
            this._options.onEnded();
          }
        });
      }));
    }
    Promise.all(tasks).then(() => {
      if (this._options.onLoad != null) {
        this._options.onLoad();
      }
    }).catch(() => {
      if (this._options.onError != null) {
        this._options.onError();
      }
    });
  }

  play(value: number) {
    const source = this._soundSources.get(value);
    if (source != null && !source.playing()) {
      source.play();
    }
  }
}
