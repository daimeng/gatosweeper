import React from 'react'
import ReactDOM from 'react-dom'
import { Game, createGame } from './game'

if (module.hot) {
  module.hot.dispose(() => { })
  module.hot.accept()
}


function App() {
  const width = 30
  const height = 16
  const mines = 99

  return (
    <Game initData={createGame(width, height, mines)}></Game>
  )
}


ReactDOM.render(<App></App>, document.getElementById('app'))
