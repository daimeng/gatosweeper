import { Component, createRef } from 'inferno'
import { Map as ImMap, Record, Range } from 'immutable'
import { Timer } from './timer'
import { Gato } from './gato'
import { throttle } from 'lodash'

function makeKey(x, y) {
  return (x << 8) | y
}

function randrng(start, end) {
  let range = end - start
  return Math.floor(start + Math.random() * range)
}

function valid(r, y, x) {
  return y > -1 && y < r.height && x > -1 && x < r.width
}

const DIRS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
]

const DIRS_SELF = [
  ...DIRS,
  [0, 0],
]

const PLAY = 0
const LOSE = 1
const WIN = 2

const GameRecord = Record({
  width: 0,
  height: 0,
  first: true,
  counts: null,
  opened: null,
  monsters: null,
  cond: PLAY,
  monstersLeft: 0,
  // hints: null
})

function createLayer(width, height) {
  const row = Range(0, width).map(() => 0).toList()
  return Range(0, height).map(() => row).toList()
}

export function createGame(width, height, mines) {
  const record = GameRecord({
    width,
    height,
    counts: createLayer(width, height),
    opened: createLayer(width, height),
    monsters: new ImMap(),
    // hints: new ImMap()
  })

  return record.withMutations(r => {
    for (let i = 0; i < mines; i++) {
      let x = randrng(0, r.width)
      let y = randrng(0, r.height)
      const key = makeKey(x, y)
      if (r.monsters.has(key)) {
        i--;
        continue;
      }
      r.setIn(['monsters', key], 1)
      r.update('monstersLeft', v => v + 1)

      incrementArea(r, x, y, 1)
    }
  })
}


function incrementArea(record, x, y, dv) {
  return record.withMutations(r => {
    for (let [dx, dy] of DIRS) {
      const y1 = y + dy
      const x1 = x + dx
      if (y1 > -1 && y1 < r.height && x1 > -1 && x1 < r.width) {
        r.updateIn(['counts', y1, x1], v => v + dv)
      }
    }
  })
}


const MINE = 1
const WRONG = 2
function checkInvalid(record) {
  record.opened.forEach((r, i) => {
    r.forEach((v, j) => {
      if (v === 1) {
        let count = record.counts.getIn([i, j])
        // let unopened = count
        let open
        for (let [y, x] of DIRS) {
          y += i
          x += j
          // remove 1 from count for each flag
          open = r.get(x)
          count -= open === 2
          // unopened -= open !== 0
        }
        // flagged doesn't match count
        if (count < 0) {
          for (let [y, x] of DIRS) {
            y += i
            x += j
            // remove 1 from count for each flag
            if (r.get(x) === 2)
              record.setIn(['hints', i, j], WRONG)
          }
        }
      }
    })
  })
}


function openCascade(record, x, y) {
  return record.withMutations(r => {
    let stack = [[y, x]]
    let visited = new Set()
    while (stack.length) {
      const cell = stack.pop()
      const key = makeKey(cell[1], cell[0])
      visited.add(key)
      r.setIn(['opened', ...cell], 1)

      // if hit a mine, continue, but set loss flag
      if (r.monsters.get(key) === 1) {
        r.set('cond', LOSE)
        r.monsters.forEach((_, mkey) => {
          const j = mkey & 0b11111111
          const i = mkey >> 8
          r.setIn(['opened', j, i], 1)
        })
        continue
      }

      if (r.counts.getIn(cell) > 0)
        continue

      for (let dir of DIRS) {
        const xx = dir[1] + cell[1]
        const yy = dir[0] + cell[0]
        const next = [yy, xx]
        if (!visited.has(makeKey(next[1], next[0])) && yy > -1 && yy < r.height && xx > -1 && xx < r.width) {
          stack.push(next)
        }
      }
    }

    // check win, if all are open
    let openCount = 0
    r.opened.forEach(rr => {
      rr.forEach(open => openCount += open === 1)
    })

    if (openCount === r.width * r.height - r.monsters.size)
      if (r.cond !== LOSE)
        r.set('cond', WIN)
  })
}

const CHORDED = new Set()

export class Game extends Component {
  constructor({ initData }) {
    super()
    this.initData = initData
    this.state = {
      record: initData(),
      chord: null,
      screenWidth: document.documentElement.clientWidth,
      screenHeight: document.documentElement.clientHeight
    }
    this.history = [this.state.record]
    this.historyPointer = 1

    this.timer = createRef()
    this.gato = createRef()
    // binds
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleRightClick = this.handleRightClick.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleMouseLeave = this.handleMouseLeave.bind(this)
    this.newGame = this.newGame.bind(this)
    this.handleResize = throttle(this.handleResize.bind(this), 100)
  }

  setState(newState, cb) {
    if (newState.record !== this.state.record) {
      // invalidate history newer than current base
      this.history.length = this.historyPointer

      // only save record data
      this.history.push(newState.record)

      // increment history base pointer
      this.historyPointer++
    }
    return super.setState(newState, cb)
  }

  goHistory(location) {
    this.historyPointer = location
    return super.setState({
      ...this.state,
      record: this.history[this.historyPointer++]
    })
  }

  newGame() {
    if (this.initData) {
      const newData = this.initData()
      this.history = [newData]
      this.historyPointer = 1
      this.timer.current.reset()
      super.setState({
        record: newData,
        chord: null
      })
    }
  }

  handleClick(evt) {
    evt.preventDefault()
    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      this._open(x, y)
    }
  }

  _open(x, y) {
    const { record } = this.state
    if (record.cond) return false

    if (record.opened.getIn([y, x]) !== 0) return

    return this.setState({
      record:
        record.withMutations(r => {
          // if first action of game, move all mines in vicinity to the corners
          if (r.first) {
            for (let dir of DIRS_SELF) {
              const xx = dir[1] + x
              const yy = dir[0] + y
              const oldKey = makeKey(xx, yy)
              if (!r.monsters.has(oldKey))
                continue

              let nx, ny, newKey;
              do {
                nx = randrng(0, r.width)
                ny = randrng(0, r.height)
                newKey = makeKey(nx, ny)
              } while (Math.abs(nx - x) == 1 || Math.abs(ny - y) == 1 || r.monsters.get(newKey))

              r.deleteIn(['monsters', oldKey])
              incrementArea(r, xx, yy, -1)
              r.setIn(['monsters', newKey], 1)
              incrementArea(r, nx, ny, 1)
            }
            r.set('first', false);

            this.timer.current.start()
          }

          // open the square
          openCascade(r, x, y)
          // checkInvalid(r)
        }),
      chord: this.state.chord
    })
  }

  handleRightClick(evt) {
    evt.preventDefault()
    const { record } = this.state
    if (record.cond) return false

    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y
      return this.setState({
        record: record.withMutations(r => {
          const status = r.opened.getIn([y, x])
          r.update('monstersLeft', v => v + (status == 2 ? 1 : status == 0 ? -1 : 0))
          r.setIn(['opened', y, x], status == 2 ? 0 : status == 0 ? 2 : status)
          // checkInvalid(r)
        })
      })
    }
  }

  handleMouseUp(evt) {
    evt.preventDefault()
    this.gato.current.unshock()
    const { record, chord } = this.state

    if (evt.button === 1) {
      return this.setState({
        record: record.withMutations(r => {
          if (chord != null) {
            let mcount = 0
            for (let dir of DIRS) {
              const x = dir[1] + chord[1]
              const y = dir[0] + chord[0]
              if (r.opened.getIn([y, x]) === 2 && valid(r, y, x))
                mcount++
            }
            if (mcount === r.counts.getIn(chord)) {
              for (let dir of DIRS) {
                const x = dir[1] + chord[1]
                const y = dir[0] + chord[0]
                if (r.opened.getIn([y, x]) === 0 && valid(r, y, x))
                  openCascade(r, x, y)
              }
              // checkInvalid(r)
            }
          }
        }),
        chord: null
      })
    }
  }

  handleMouseLeave(evt) {
    evt.preventDefault()
    const { record } = this.state

    if (!evt.target.classList.contains('board-cell')) {
      return this.setState({
        record,
        chord: null
      })
    }
  }

  handleMouseMove(evt) {
    evt.preventDefault()
    const { record, chord } = this.state
    if (record.cond) return false

    if (chord != null && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return this.setState({
          record,
          chord: [y, x]
        })
    }
  }

  handleMouseDown(evt) {
    evt.preventDefault()
    if (evt.button !== 2)
      this.gato.current.shock()
    const { record } = this.state
    if (record.cond) return false

    if (evt.button === 1 && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return this.setState({
          record,
          chord: [y, x]
        })
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown, false)
    document.addEventListener('resize', this.handleResize, false)
    document.addEventListener('gesturestart', this.handleGestureStart, false)
  }

  componentWillUnmount() {
    document.removeEventListener('gesturestart', this.handleGestureStart, false)
    document.removeEventListener('resize', this.handleResize, false)
    document.removeEventListener('keydown', this.handleKeyDown, false)
  }

  handleGestureStart(e) {
    console.log(e)
  }

  handleResize() {
    this.setState({
      screenWidth: document.documentElement.clientWidth,
      screenHeight: document.documentElement.clientHeight
    });
  }

  handleKeyDown(evt) {
    if (evt.key === 'F2') {
      this.newGame()
    }
    // if (evt.key === 'c') {

    // }
    // if (evt.key === 'x') {

    // }
    // if (evt.key === 'z') {
    // }
  }

  render() {
    const { record, chord, screenHeight, screenWidth } = this.state

    const flipped = screenHeight > screenWidth * 1.2

    // create a lookup for chords
    CHORDED.clear()
    if (chord) {
      for (let dir of DIRS) {
        const x = dir[1] + chord[1]
        const y = dir[0] + chord[0]
        if (valid(record, y, x))
          CHORDED.add(makeKey(x, y))
      }
    }

    let mood = 'idle'
    if (record.cond === 1) {
      this.timer.current.stop()
      mood = 'sad'
    } else if (record.cond === 2) {
      this.timer.current.stop()
      mood = 'happy'
    }

    let rows
    if (flipped) {
      rows = new Array(record.width)
      for (let i = 0; i < record.width; i++) {
        const cells = new Array(record.height)
        let key
        for (let j = 0; j < record.height; j++) {
          key = makeKey(i, j)
          cells[j] = (
            <BoardCell
              key={j}
              x={i}
              y={j}
              cell={record.counts.get(j).get(i)}
              opened={record.opened.get(j).get(i)}
              monster={record.monsters.get(key) || 0}
              chorded={CHORDED.has(key)}
            />
          )
        }

        rows[i] = (
          <tr key={i} $HasKeyedChildren>
            {cells}
          </tr>
        )
      }
    } else {
      rows = new Array(record.height)
      for (let i = 0; i < record.height; i++) {
        const cells = new Array(record.width)
        let key
        for (let j = 0; j < record.width; j++) {
          key = makeKey(j, i)
          cells[j] = (
            <BoardCell
              key={j}
              x={j}
              y={i}
              cell={record.counts.get(i).get(j)}
              opened={record.opened.get(i).get(j)}
              monster={record.monsters.get(key) || 0}
              chorded={CHORDED.has(key)}
            />
          )
        }

        rows[i] = (
          <tr key={i} $HasKeyedChildren>
            {cells}
          </tr>
        )
      }
    }

    return (
      <div id="game-wrapper" classname={`${flipped ? 'flipped' : null}`}>
        <div id="hud">
          <div id="monsters-left">{record.monstersLeft}</div>
          <Gato ref={this.gato} mood={mood} onClick={this.newGame} />
          <Timer ref={this.timer} />
        </div>
        <table id="game" className="skin-default"
          onKeyPess={this.handleKeyPress}
          onClick={this.handleClick}
          onContextMenu={this.handleRightClick}
          onMouseDown={this.handleMouseDown}
          onMouseMove={this.handleMouseMove}
          onMouseUp={this.handleMouseUp}
          onMouseLeave={this.handleMouseLeave}
        >
          <tbody $HasKeyedChildren>
            {rows}
          </tbody>
        </table>
        {/* <div className="history-bar" $HasKeyedChildren>
          {this.history.map((r, i) =>
            <div key={i} className={`history-entry ${this.historyPointer === i + 1 ? 'current-entry' : ''}`} onClick={() => this.goHistory(i)} />
          )}
        </div> */}
      </div>
    )
  }
}

function BoardCell({ opened, monster, cell, chorded, x, y }) {
  let showFlag = false
  let showMonster = false

  let inner = <div className="inner">&nbsp;</div>
  if (opened === 1 && monster < 1) {
    if (cell)
      inner = <div className="inner">{cell}</div>
  } else if (opened === 1 && monster > 0) {
    showMonster = true
  } else if (opened === 2) {
    showFlag = true
  }

  return (
    <td className={`cell-${cell} board-cell${opened === 1 ? ' opened' : ''}${showMonster ? ' monster' : ''}${showFlag ? ' flagged' : ''}${chorded ? ' chorded' : ''}`} data-x={x} data-y={y}>
      {inner}
    </td>
  )
}

BoardCell.defaultHooks = {
  onComponentShouldUpdate(p, n) {
    return p.opened !== n.opened
      || p.monster !== n.monster
      || p.cell !== n.cell
      || p.chorded !== n.chorded
  }
}
