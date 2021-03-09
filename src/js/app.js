import React from 'react'
import ReactDOM from 'react-dom'
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
    <Game initData={{ record: createGame(width, height, mines) }}></Game>
  )
}


ReactDOM.render(<App></App>, document.getElementById('app'))
