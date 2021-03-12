// import React from 'react'
// import ReactDOM from 'react-dom'
// import { Game, createGame } from './game'
import { select } from 'd3'
import throttle from 'lodash.throttle'
import { randrng, DIRS } from './utils'

if (module.hot) {
  module.hot.dispose(() => { })
  module.hot.accept()
}


// function App() {
//   const width = 16
//   const height = 16
//   const mines = 40

//   return (
//     <Game initData={{ record: createGame(width, height, mines) }}></Game>
//   )
// }


// ReactDOM.render(<App></App>, document.getElementById('app'))


const CELL_HEIGHT = 24
const MONSTER = 0b0010000
const OPENED = 0b0100000
const FLAGGED = 0b1000000
const COUNT = 0b00001111

class Game {
  constructor() {
    /* State */
    this.width = 16
    this.height = 16
    this.first = true

    /* Bit data */
    // 0 - 4: counts
    // 5: monsters
    // 6: opened
    // 7: flagged
    this.board = new Array(this.height).fill(null).map(
      () => new Uint8Array(this.width)
    )
    this.history = new Uint8Array(this.width * this.height)
    this.monsterCount = 40
    this.monstersLeft = this.monsterCount
    this.time = 0
    this.lose = false
    this.initData()
  }

  valid(y, x) {
    return y > -1 && y < this.height && x > -1 && x < this.width
  }

  incrementArea(y, x, dv) {
    for (let i = 1; i < DIRS.length; i++) {
      let [dx, dy] = DIRS[i]
      const y1 = y + dy
      const x1 = x + dx
      if (this.valid(y1, x1)) {
        this.board[y1][x1] += dv
      }
    }
  }

  initData() {
    for (let i = 0; i < this.monsterCount; i++) {
      let x = randrng(0, this.width)
      let y = randrng(0, this.height)
      if (this.board[y][x] & MONSTER) {
        i--
        continue
      }
      this.board[y][x] |= MONSTER
      this.incrementArea(y, x, 1)
    }
  }

  handleClick(evt) {
    // if (evt.target.classList.contains('board-cell')) {
    //   const data = evt.target.dataset
    //   const x = +data.x
    //   const y = +data.y

    //   const d = this.board[y][x]
    //   if (!(d & OPENED)) return

    //   // if first action of game, move all mines in vicinity to the corners
    //   if (this.first) {
    //     for (let dir of DIRS) {
    //       const xx = dir[1] + x
    //       const yy = dir[0] + y
    //       const oldKey = makeKey(xx, yy)
    //       if (!r.monsters.has(oldKey))
    //         continue

    //       let nx, ny, newKey;
    //       do {
    //         nx = randrng(0, r.width)
    //         ny = randrng(0, r.height)
    //         newKey = makeKey(nx, ny)
    //       } while (Math.abs(nx - x) == 1 || Math.abs(ny - y) == 1 || r.monsters.get(newKey))

    //       r.deleteIn(['monsters', oldKey])
    //       incrementArea(r, xx, yy, -1)
    //       r.setIn(['monsters', newKey], 1)
    //       incrementArea(r, nx, ny, 1)
    //     }
    //     r.set('first', false);
    //   }

    //   // if (r.monsters.getIn([y, x]))
    //   // open the square
    //   openCascade(r, x, y)
    // }
  }

  handleRightClick(evt) {
    evt.preventDefault()

    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const y = +data.y
      const x = +data.x
      const el = select(evt.target)

      const flagged = this.board[y][x] & FLAGGED
      this.monstersLeft += flagged ? 1 : -1
      this.monstersQ.text(this.monstersLeft)
      this.board[y][x] ^= FLAGGED
      el.classed('flagged', !flagged)
    }
    return false
  }

  render() {
    /* Containers */
    const app = select('#app')

    const gameContainer = app
      .append('div')
      .attr('id', 'game-container')

    const pawCursor = gameContainer
      .append('div')
      .attr('id', 'paw-cursor')

    const gameInner = gameContainer
      .append('div')
      .attr('id', 'game-inner')

    /* HUD Stuff */
    const hud = gameInner
      .append('div')
      .attr('id', 'hud')

    this.monstersQ = hud.append('div').attr('id', 'monsters-left')
    this.monstersQ.text(this.monstersLeft)
    this.gatoQ = hud.append('div').attr('id', 'gato')
    this.timerQ = hud.append('div').attr('id', 'timer')
    this.timerQ.text('000')

    /* Game Board */
    const game = gameInner
      .append('table')
      .attr('id', 'game')
      .on('contextmenu', evt => this.handleRightClick(evt))
      .on('click', evt => this.handleClick(evt))
      .append('tbody')

    this.cells = game.selectAll('.board-row')
      .data(this.board)
      .enter()
      .append('tr')
      .classed('board-row', true)
      .selectAll('.board-cell')
      .data(d => d)
      .enter()
      .append('td')
      .classed('board-cell', true)
      .classed('opened', d => {
        return d & OPENED
      })
      .classed('monster', d => {
        return this.lose && (d & MONSTER)
      })
      .classed('flagged', d => {
        return d & FLAGGED
      })
      .attr('data-i', (d, i) => i)

    const cellsInner = this.cells
      .append('div')
      .classed('inner', true)
      .text(d => {
        const count = d & COUNT
        if (d & OPENED & !(d & MONSTER))
          return count || ''
        return ''
      })

    /* Bind Events */
    // gameContainer.on('mousemove', throttle(function (evt) {
    //   evt.preventDefault()

    //   pawCursor.style('transform', `translate(${evt.clientX}px, ${evt.clientY}px)`)
    // }, 100))

    this.lastTimed = performance.now()
    this.timer = setInterval(() => {
      const now = performance.now()
      this.time = this.time + now - this.lastTimed
      this.lastTimed = now
      const displayTime = `${Math.min(999, Math.floor(this.time / 1000))}`.padStart(3, '0')
      this.timerQ.text(displayTime)
    }, 50)
  }

  dispose() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}


const game = new Game()
game.render()
