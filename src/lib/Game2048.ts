export class Game2048Tile {
  i: number;
  j: number;
  value: number;
  key: string;
  overlaid: boolean;

  constructor(i: number, j: number, value: number | null = null) {
    this.i = i;
    this.j = j;
    this.value = value != null ? value : (Math.random() < 0.9 ? 2 : 4);
    this.key = new Date().getTime().toString(36) +
      Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
    this.overlaid = false;
  }
}

export enum Direction {Up, Right, Down, Left}

interface Game2048Options {
  onUpdate?: (tiles: Game2048Tile[]) => void;
  onScoreAdd?: (value: number) => void;
  onMaxMerge?: (value: number) => void;
  onGameOver?: () => void;
  onStateChanged?: (state: number[] | null) => void;
  on2048?: (gameOver?: boolean) => void;
  state?: number[] | null,
}

export default class Game2048 {
  protected _tiles = new Map<string, Game2048Tile>();
  protected _gameOver = false;
  protected _options: Game2048Options;
  protected _won = false;

  constructor(options: Game2048Options) {
    this._options = options;
    if (this._options.state) {
      this._options.state.forEach((value, index) => {
        if (value > 0) {
          const newTile = new Game2048Tile(Math.floor(index / 4), index % 4, Math.pow(2, value));
          this._tiles.set(newTile.key, newTile);
          if (newTile.value >= 2048) {
            this._won = true;
          }
        }
      });
    } else {
      this.generateTile();
      this.generateTile();
      if (this._options.onStateChanged != null) {
        this._options.onStateChanged(this._getState());
      }
    }
    if (this._options.onUpdate != null) {
      this._options.onUpdate(Array.from(this._tiles.values()));
    }
  }

  generateTile(): boolean {
    const validPos = new Set<number>();
    for (let i = 0; i < 16; i++) {
      validPos.add(i);
    }
    this._tiles.forEach(({ i, j }) => {
      validPos.delete(i * 4 + j);
    });
    const validPosArray = Array.from(validPos);
    const pos = validPosArray[Math.floor(Math.random() * validPosArray.length)];
    const i = Math.floor(pos / 4), j = pos % 4;
    const newTile = new Game2048Tile(i, j);
    this._tiles.set(newTile.key, newTile);
    if (validPosArray.length === 1) {
      return this.judge();
    }
    return false;
  }

  judge(): boolean {
    let flag = true;
    const { tilesArray } = this._getTopTiles();
    for (let i = 0; flag && i < 4; i++) {
      for (let j = 0; flag && j < 4; j++) {
        if (tilesArray[i * 4 + j] == null ||
          ((i % 4 < 3) && (tilesArray[(i + 1) * 4 + j] == null ||
            // @ts-ignore
            tilesArray[i * 4 + j].value === tilesArray[(i + 1) * 4 + j].value)) ||
          ((j % 4 < 3) && (tilesArray[i * 4 + j + 1] == null ||
            // @ts-ignore
            tilesArray[i * 4 + j].value === tilesArray[i * 4 + j + 1].value))) {
          flag = false;
        }
      }
    }
    return this._gameOver = flag;
  }

  move(direction: Direction): void {
    if (this._gameOver) {
      return;
    }
    let base: number[], diff: number[];
    switch (direction) {
      case Direction.Up:
        base = [0, 4, 8, 12];
        diff = [0, 1, 2, 3];
        break;
      case Direction.Right:
        base = [12, 13, 14, 15];
        diff = [0, -4, -8, -12];
        break;
      case Direction.Down:
        base = [3, 7, 11, 15];
        diff = [0, -1, -2, -3];
        break;
      case Direction.Left:
        base = [0, 1, 2, 3];
        diff = [0, 4, 8, 12];
        break;
    }
    const { tilesArray, toDelete } = this._getTopTiles();
    toDelete.forEach((key) => {
      this._tiles.delete(key);
    });
    let movedFlag = false;
    let winFlag = false;
    let scoreAdded = 0;
    let maxTileMerged = 0;
    base.forEach((b) => {
      let currentTile: Game2048Tile | null = null;
      let targetPosIndex = 0;
      diff.forEach((d) => {
        const tile = tilesArray[b + d];
        if (tile != null) {
          if (currentTile != null && tile.value === currentTile.value) {
            tile.overlaid = true;
            currentTile.value = tile.value * 2;
            if (currentTile.value === 2048) {
              if (!this._won) {
                this._won = true;
                winFlag = true;
              }
            }
            tile.i = currentTile.i;
            tile.j = currentTile.j;
            scoreAdded += currentTile.value;
            movedFlag = true;
            maxTileMerged = Math.max(maxTileMerged, currentTile.value);
            currentTile = null;
          } else {
            const targetPos = b + diff[targetPosIndex];
            if (tile.i * 4 + tile.j !== targetPos) {
              tile.i = Math.floor(targetPos / 4);
              tile.j = targetPos % 4;
              movedFlag = true;
            }
            currentTile = tile;
            targetPosIndex++;
          }
        }
      });
    });
    let gameOverFlag = false;
    if (movedFlag) {
      gameOverFlag = this.generateTile();
      if (this._options.onUpdate != null) {
        this._options.onUpdate(Array.from(this._tiles.values()));
      }
    }
    if (scoreAdded && this._options.onScoreAdd != null) {
      this._options.onScoreAdd(scoreAdded);
    }
    if (maxTileMerged && this._options.onMaxMerge) {
      this._options.onMaxMerge(maxTileMerged);
    }
    if (gameOverFlag) {
      if (this._options.onGameOver && !winFlag) {
        this._options.onGameOver();
      }
    }
    if (winFlag) {
      if (this._options.on2048) {
        this._options.on2048(gameOverFlag);
      }
    }
    if (movedFlag && this._options.onStateChanged != null) {
      this._options.onStateChanged(this._getState());
    }
  }

  protected _getState(): number[] | null {
    if (!this._gameOver) {
      const result: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      this._tiles.forEach((tile) => {
        const { i, j, value, overlaid } = tile;
        if (!overlaid) {
          result[i * 4 + j] = Math.log2(value);
        }
      });
      return result;
    } else {
      return null;
    }
  }

  protected _getTopTiles(): { tilesArray: (Game2048Tile | null)[], toDelete: string[] } {
    const result: (Game2048Tile | null)[] =
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
    const toDeleteKey: string[] = [];
    this._tiles.forEach((tile) => {
      const { i, j, key, overlaid } = tile;
      if (!overlaid) {
        result[i * 4 + j] = tile;
      } else {
        toDeleteKey.push(key);
      }
    });
    return {
      tilesArray: result,
      toDelete: toDeleteKey,
    };
  }
};
