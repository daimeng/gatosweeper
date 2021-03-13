import { render } from 'inferno'
import { Game, createGame } from './game'

if (module.hot) {
  module.hot.dispose(() => { })
  module.hot.accept()
}


function App() {
  const width = 9
  const height = 9
  const mines = 10

  return (
    <Game initData={createGame(width, height, mines)}></Game>
  )
}


render(<App></App>, document.getElementById('app'))
