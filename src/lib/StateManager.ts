interface State {
  best: number,
  game: number[] | null,
  score: number,
}

export default class StateManager {
  protected _timer: number | null;

  constructor() {
    this._timer = null;
  }

  getState(): State {
    if (localStorage != null) {
      const raw = localStorage.getItem('gameJntm/state');
      if (raw != null) {
        return JSON.parse(raw);
      }
    }
    return {
      best: 0,
      game: null,
      score: 0,
    };
  }

  setState(state: State): void {
    if (this._timer != null) {
      clearTimeout(this._timer);
    }
    this._timer = window.setTimeout(() => this._realSetState(state), 300);
  }

  protected _realSetState(state: State): void {
    this._timer = null;
    if (localStorage != null) {
      localStorage.setItem('gameJntm/state', JSON.stringify(state));
    }
  }
}
