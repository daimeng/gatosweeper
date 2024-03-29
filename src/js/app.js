import { render, Component, createRef } from 'inferno'
import throttle from 'lodash.throttle'
import { Game, createGame } from './game'

if (module.hot) {
  module.hot.dispose(() => { })
  module.hot.accept()
}

class App extends Component {
  constructor(props) {
    super(props)
    this.paw = createRef()
    this.game = createRef()

    this.pawFollow = this.pawFollow.bind(this)
    this.createGame = this.createGame.bind(this)
    this.setDifficulty = this.setDifficulty.bind(this)
  }

  createGame() {
    let w = document.getElementById('width')
    let h = document.getElementById('height')
    let m = document.getElementById('monsters')

    if (w && h && m) {
      w = +w.value
      h = +h.value
      m = +m.value

      if (m > w * h) {
        console.log('Invalid dimension and monster count.')
        return false;
      }
    } else {
      w = 9
      h = 9
      m = 10
    }

    return createGame(w, h, m)
  }

  pawFollow(evt) {
    this.paw.current.style.transform = `translate(${evt.clientX}px, ${evt.clientY}px)`
  }

  setDifficulty(evt) {
    const w = document.getElementById('width')
    const h = document.getElementById('height')
    const m = document.getElementById('monsters')
    switch (evt.target.value) {
      case '0':
        w.value = 9
        h.value = 9
        m.value = 10
        break
      case '1':
        w.value = 16
        h.value = 16
        m.value = 40
        break
      case '2':
        w.value = 30
        h.value = 16
        m.value = 99
        break
    }
  }
  render() {
    return (
      <>
        <div id="game-container" onMouseMove={throttle(this.pawFollow, 50)}>
          <div id="navbar">
            <select onChange={this.setDifficulty}>
              <option value="0">9x9:10</option>
              <option value="1">16x16:40</option>
              <option value="2">30x16:99</option>
            </select>
            <label for="width" style={{ display: "none" }}>
              {'W: '}
              <input type="number" id="width" name="width" min="9" max="100" defaultValue="9" />
            </label>
            <label for="height" style={{ display: "none" }}>
              {'H: '}
              <input type="number" id="height" name="height" min="9" max="100" defaultValue="9" />
            </label>
            <label for="monsters" style={{ display: "none" }}>
              {'M: '}
              <input type="number" id="monsters" name="monsters" min="1" max="" defaultValue="10" />
            </label>
            <a id="controls" href="javascript:void(0)" onClick={() => document.getElementById('modal').style.display = 'flex'}>Controls</a>
          </div>
          <Game ref={this.game} initData={this.createGame}></Game>
          <div id="paw-cursor" ref={this.paw} />
        </div>
        <div id="modal" onClick={evt => evt.target.style.display = 'none'}>
          <div id="modal-content">
            <ul>
              <li><b>Left-click</b> an unopened tile to reveal it. Be careful of monsters.</li>
              <li><b>Right-click</b> an unopened tile to mark it and warn yourself about monsters.</li>
              <li><b>Middle-click</b> a numbered tile to reveal its adjacent tile.</li>
              <li>Press <b>F2</b> or click Gato to start a new game.</li>
            </ul>
          </div>
        </div>
      </>
    )
  }
}


render(<App></App>, document.getElementById('app'))
