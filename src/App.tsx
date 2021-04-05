import Hammer from 'hammerjs';
import React from 'react';
import GitHubButton from 'react-github-btn';
import './App.scss';
import Game2048, { Direction, Game2048Tile } from './lib/Game2048';
import SoundManager from './lib/SoundManager';
import StateManager from './lib/StateManager';
import VibratorManager from './lib/VibratorManager';


const getText = (value: number) => {
  const words = [
    '大家好', '我是', '练习时长', '两年半的', // 2, 4, 8, 16
    '个人练习生', 'CXK', '喜欢', '唱', // 32, 64, 128, 256
    '跳', 'RAP', '篮球', 'MUSIC', // 512, 1024, 2048, 4096
    '鸡', '你', '太', '美', // 8192, 16384, 32768, 65536
    'BABY', 'OH~', // 131072, undefined
  ];
  return words[Math.min(Math.log2(value), words.length) - 1];
};

const getNumber: (value: number) => string = (value: number) => {
  if (value >= 100000000) {
    return value.toPrecision(2);
  } else if (value >= 1000000) {
    return `${(value / 1000000).toPrecision(3)}M`;
  } else if (value >= 100000) {
    return `${(value / 1000).toPrecision(3)}K`;
  } else {
    return value.toString();
  }
};

interface TileProps {
  i: number,
  j: number,
  value: number,
  overlaid: boolean
}

class Tile extends React.Component<TileProps> {
  state = {
    pulse: false as boolean,
    value: this.props.value as number,
  };
  protected _unmounted = false;

  componentDidUpdate(prevProps: Readonly<TileProps>, prevState: Readonly<{ pulse: boolean, value: number }>) {
    if (prevProps.value !== this.props.value) {
      this.setState({
        pulse: false,
      }, () => setTimeout(() => !this._unmounted && this.setState({
        pulse: true,
        value: this.props.value,
      }), 50));
    }
  }

  componentWillUnmount() {
    this._unmounted = true;
  }

  render() {
    const { i, j, overlaid } = this.props;
    const { value } = this.state;
    let className = `game-tile pos-i-${i} pos-j-${j} tile-${value}`;
    overlaid && (className += ' tile-overlaid');
    this.state.pulse && (className += ' tile-pulse');
    return (
      <span className={className}><sup className="value">{value}</sup>{getText(value)}</span>
    );
  }
}

class App extends React.Component {
  state = {
    tiles: [] as Game2048Tile[],
    score: 0 as number,
    best: 0 as number,
    scoreAdded: 0 as number,
    logoPulse: false,
    messageVisible: true as boolean,
    message: 'start' as 'start' | 'win' | 'win-game-over' | 'game-over',
  };

  protected containerRef: React.RefObject<HTMLDivElement>;
  protected game: Game2048 | null;
  protected hammer: HammerManager | null;
  protected soundManager: SoundManager | null;
  protected vibratorManager: VibratorManager;
  protected stateManager: StateManager;

  constructor(props: Readonly<{}>) {
    super(props);
    this.containerRef = React.createRef();
    this.game = null;
    this.hammer = null;
    this.soundManager = null;
    this.vibratorManager = new VibratorManager();
    this.stateManager = new StateManager();
  }

  componentDidMount(): void {
    window.addEventListener('keydown', this._moveK);
    this.hammer = new Hammer.Manager(this.containerRef.current as EventTarget, {
      recognizers: [[Hammer.Pan]],
    });
    this.hammer.on('panstart', (event) => this._moveG(event.direction));
    this.soundManager = new SoundManager({
      onPlay: () => {
        this.setState({
          logoPulse: true,
        });
      },
      onEnded: () => {
        this.setState({
          logoPulse: false,
        });
      },
    });
    this._tryResumeGame();
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this._moveK);
    if (this.hammer) {
      this.hammer.off('panstart');
    }
  }

  render() {
    return (
      <React.Fragment>
        <div className="app">
          <header className="header">
            <div className="scoreboard">
              <div className="title">最高分</div>
              <div>{getNumber(this.state.best)}</div>
            </div>
            <div className="scoreboard">
              <div className="title">得分</div>
              <div>{getNumber(this.state.score)}</div>
              {this.state.scoreAdded > 0 &&
              <div className="added">
                +{this.state.scoreAdded}
              </div>
              }
            </div>
            <h1 className={this.state.logoPulse ? 'logo-pulse' : undefined} aria-label="鸡你太美">
              你太美
            </h1>
          </header>
          <section className="actions">
            <div className="new-game-wrapper">
              <button className="new-game" onClick={this._newGame}>新游戏</button>
            </div>
            <div className="hint">移动、合并相同方块。目标是: <strong>篮球</strong> !</div>
          </section>
          <section className={`game${this.state.messageVisible ? ' has-message' : ''}`}>
            <div className="game-container" ref={this.containerRef}>{
              [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j =>
                <span className={`game-cell pos-i-${i} pos-j-${j}`} key={`${i}-${j}`} />,
              ))
            }{
              this.state.tiles.map(({ i, j, value, key, overlaid }) =>
                <Tile i={i} j={j} value={value} key={key} overlaid={overlaid} />,
              )
            }</div>
            {
              this.state.message === 'start' &&
              <div className="game-message" role="button" aria-label="隐藏消息" onClick={this._newGame}>
                <div className="start" role="img" aria-label="耳机" />
                <h2>开始游戏!</h2>
                <p>点按以开始<br /><small>[请勿在公共场合外放]</small></p>
              </div>
            }{
            this.state.message === 'win' &&
            <div className="game-message" role="button" aria-label="隐藏消息" onClick={() => this.setState({
              messageVisible: false,
            })}>
              <div className="win" role="img" aria-label="篮球" />
              <h2>恭喜你成功了!</h2>
              <p>点按以继续</p>
            </div>
          }{
            this.state.message === 'win-game-over' &&
            <div className="game-message" role="button" aria-label="隐藏消息" onClick={() => this.setState({
              messageVisible: false,
            })}>
              <div className="win" role="img" aria-label="篮球" />
              <h2>你成功了!</h2>
              <p>点按以隐藏提示<br /><small>[游戏结束]</small></p>
            </div>
          }{
            this.state.message === 'game-over' &&
            <div className="game-message" role="button" aria-label="隐藏消息" onClick={() => this.setState({
              messageVisible: false,
            })}>
              <div className="game-over" role="img" aria-label="菜" />
              <h2>游戏结束!</h2>
              <p>点按以隐藏提示</p>
            </div>
          }</section>
          <section className="introduction">
            <div className="how-to">
              玩法：<strong>{'ontouchstart' in window ? '用手指滑动' : '按 方向键 或 WASD 键'}</strong> 来移动方块，<br />两个相同的方块可以合成新方块。<br />
              <span className="about-arrow">关于</span>
            </div>
          </section>
        </div>
        <div className="about">
          <section className="introduction">
            <p>
              游戏中加入了特别的文字和音效，出自年轻人喜闻乐见的个人练习生。
              <a href="https://play2048.co/" target="_blank" rel="noopener noreferrer">原始版本的 2048</a> 游戏作者 <a
              href="https://gabrielecirulli.com/" target="_blank" rel="noopener noreferrer">Gabriele
              Cirulli</a> ，此项目的游戏方式和样式均来自此处。
            </p>
            <p>
              如果觉得好玩，不妨点一下 Follow 和 Star ～
            </p>
            <p className="small">
              此项目为 Qt 项目 <a href="https://github.com/ZKLlab/cxk-2048-cpp" target="_blank"
                            rel="noopener noreferrer">2018-2019 学年夏季学期《计算机编程实训》第 17 组作业</a> 的原型，最初用 Vue.js 编写，当前为
              React + TypeScript 重写版本，加入了移动端支持、最高分、游戏状态保存以及一些特效。
            </p>
            <p className="social-buttons">
              <GitHubButton href="https://github.com/ZKLlab" data-size="large" data-show-count={true}
                            aria-label="Follow @ZKLlab on GitHub">Follow @ZKLlab</GitHubButton>
              <GitHubButton href="https://github.com/ZKLlab/cxk-2048-react" data-icon="octicon-star" data-size="large"
                            data-show-count={true} aria-label="Star ZKLlab/cxk-2048-react on GitHub">Star</GitHubButton>
            </p>
            <p className="view-on-github">
              <a href="https://github.com/ZKLlab/cxk-2048-react" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 16 16" className="github-icon" aria-hidden="true">
                  <path
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View on Github</a>
            </p>
            <div className="copyright">
              Copyright &copy; {new Date().getFullYear()} <a href="https://github.com/ZKLlab" target="_blank"
                                                             rel="noopener noreferrer">ZKLlab</a>
            </div>
          </section>
        </div>
      </React.Fragment>
    );
  }

  protected _newGame = (event?: React.MouseEvent<HTMLElement>) => {
    if (event != null) {
      event.currentTarget.blur();
    }
    setTimeout(() => {
      if (this.soundManager != null) {
        this.soundManager.play(2);
        this._createGame();
      }
    }, this.state.messageVisible ? 250 : 50);
    this.setState({
      score: 0,
      messageVisible: false,
    });
    // @ts-ignore
    window.gtag('event', 'new_game');
  };

  protected _tryResumeGame = () => {
    const { best, score, game } = this.stateManager.getState();
    this.setState(Object.assign({
      best,
      score,
    }, game != null ? {
      messageVisible: false,
    } : {}));
    if (game != null) {
      // @ts-ignore
      window.gtag('event', 'resume_game', {
        score: score,
        best: best,
      });
      this._createGame(game);
    }
  };

  protected _createGame = (state: number[] | null = null) => {
    let firstUpdate = true;
    this.game = new Game2048({
      onUpdate: tiles => {
        this.setState({ tiles });
        if (!firstUpdate || state == null) {
          this.vibratorManager.vibrateShort(1);
        }
        firstUpdate = false;
      },
      onScoreAdd: value => {
        this.setState({
          score: this.state.score + value,
          scoreAdded: 0,
          best: Math.max(this.state.score + value, this.state.best),
        }, () => setTimeout(() => this.setState({
          scoreAdded: value,
        }), 50));
      },
      onMaxMerge: value => {
        if (this.soundManager != null) {
          this.soundManager.play(value);
          this.vibratorManager.vibrateShort(2);
        }
      },
      on2048: gameOver => {
        this.vibratorManager.vibrateLong();
        this.setState({
          messageVisible: true,
          message: gameOver ? 'win-game-over' : 'win',
        });
        // @ts-ignore
        window.gtag('event', 'win');
        if (gameOver) {
          // @ts-ignore
          window.gtag('event', 'game_over', {
            score: this.state.score,
            best: this.state.best,
          });
        }
      },
      onGameOver: () => {
        this.vibratorManager.vibrateLong();
        this.setState({
          messageVisible: true,
          message: 'game-over',
        });
        // @ts-ignore
        window.gtag('event', 'game_over', {
          score: this.state.score,
          best: this.state.best,
        });
      },
      onStateChanged: newState => {
        this.stateManager.setState({
          best: this.state.best,
          score: newState != null ? this.state.score : 0,
          game: newState,
        });
      },
      state,
    });
  };

  protected _moveK = (event: KeyboardEvent) => {
    if (this.game != null && !this.state.messageVisible && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const game: Game2048 = this.game;
      const key = event.key.toLowerCase();
      let flag = true;
      if (key === 'arrowup' || key === 'w') {
        game.move(Direction.Up);
      } else if (key === 'arrowright' || key === 'd') {
        game.move(Direction.Right);
      } else if (key === 'arrowdown' || key === 's') {
        game.move(Direction.Down);
      } else if (key === 'arrowleft' || key === 'a') {
        game.move(Direction.Left);
      } else {
        flag = false;
      }
      if (flag) {
        event.preventDefault();
      }
    } else if (this.state.messageVisible) {
      const key = event.key.toLowerCase();
      if (key === ' ' || key === 'enter') {
        const gameMessage: HTMLDivElement | null = document.querySelector('div.game-message');
        if (gameMessage != null) {
          gameMessage.click();
          event.preventDefault();
        }
      }
    }
  };

  protected _moveG = (direction: number) => {
    if (this.game != null && !this.state.messageVisible) {
      if (direction === Hammer.DIRECTION_UP) {
        this.game.move(Direction.Up);
      } else if (direction === Hammer.DIRECTION_RIGHT) {
        this.game.move(Direction.Right);
      } else if (direction === Hammer.DIRECTION_DOWN) {
        this.game.move(Direction.Down);
      } else if (direction === Hammer.DIRECTION_LEFT) {
        this.game.move(Direction.Left);
      }
    }
  };
}

export default App;
