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

    this.width = 9
    this.height = 9
    this.mines = 10
    this.paw = createRef()

    this.pawFollow = this.pawFollow.bind(this)
    this.createGame = this.createGame.bind(this)
  }

  createGame() {
    return createGame(this.width, this.height, this.mines)
  }

  pawFollow(evt) {
    this.paw.current.style.transform = `translate(${evt.clientX}px, ${evt.clientY}px)`
  }

  render() {
    return (
      <div id="game-container" onMouseMove={throttle(this.pawFollow, 50)}>
        <div id="paw-cursor" ref={this.paw} />
        <Game initData={this.createGame}></Game>
      </div>
    )
  }
}


render(<App></App>, document.getElementById('app'))
