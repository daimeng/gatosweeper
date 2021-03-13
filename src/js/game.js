import { Component, createRef } from 'inferno'
import { Map, Record, Range } from 'immutable'
import throttle from 'lodash.throttle'
import { Timer } from './timer'
import { Gato } from './gato'

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


const GameRecord = Record({
  width: 0,
  height: 0,
  first: true,
  counts: null,
  opened: null,
  monsters: null,
  chord: null,
  lose: false,
  monstersLeft: 0,
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
    monsters: new Map(),
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
        r.set('lose', true)
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
  })
}

const CHORDED = new Set()

export class Game extends Component {
  constructor({ initData }) {
    super()
    this.state = { record: initData }
    this.paw = createRef()
    this.timer = createRef()
    this.gato = createRef()
    // binds
    this.handleClick = this.handleClick.bind(this)
    this.handleRightClick = this.handleRightClick.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleMouseLeave = this.handleMouseLeave.bind(this)
    this.pawFollow = this.pawFollow.bind(this)
  }

  handleClick(evt) {
    evt.preventDefault()
    const { record } = this.state
    if (record.lose) return false

    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y
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
          })
      })
    }
  }

  handleRightClick(evt) {
    evt.preventDefault()
    const { record } = this.state
    if (record.lose) return false

    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y
      return this.setState({
        record: record.withMutations(r => {
          const status = r.opened.getIn([y, x])
          r.update('monstersLeft', v => v + (status == 2 ? 1 : status == 0 ? -1 : 0))
          r.setIn(['opened', y, x], status == 2 ? 0 : status == 0 ? 2 : status)
        })
      })
    }
  }

  handleMouseUp(evt) {
    evt.preventDefault()
    this.gato.current.unshock()
    const { record } = this.state

    if (evt.button === 1) {
      return this.setState({
        record: record.withMutations(r => {
          if (r.chord != null) {
            let mcount = 0
            for (let dir of DIRS) {
              const x = dir[1] + record.chord[1]
              const y = dir[0] + record.chord[0]
              if (r.opened.getIn([y, x]) === 2 && valid(r, y, x))
                mcount++
            }
            if (mcount === r.counts.getIn(r.chord)) {
              for (let dir of DIRS) {
                const x = dir[1] + record.chord[1]
                const y = dir[0] + record.chord[0]
                if (r.opened.getIn([y, x]) === 0 && valid(r, y, x))
                  openCascade(r, x, y)
              }
            }
          }

          r.set('chord', null)
        })
      })
    }
  }

  handleMouseLeave(evt) {
    evt.preventDefault()
    const { record } = this.state

    if (!evt.target.classList.contains('board-cell')) {
      return this.setState({
        record: record.set('chord', null)
      })
    }
  }

  pawFollow(evt) {
    this.paw.current.style.transform = `translate(${evt.clientX}px, ${evt.clientY}px)`
  }

  handleMouseMove(evt) {
    evt.preventDefault()
    const { record } = this.state
    if (record.lose) return false

    if (record.chord != null && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return this.setState({
          record: record.set('chord', [y, x])
        })
    }
  }

  handleMouseDown(evt) {
    evt.preventDefault()
    if (evt.button !== 2)
      this.gato.current.shock()
    const { record } = this.state
    if (record.lose) return false

    if (evt.button === 1 && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return this.setState({
          record: record.set('chord', [y, x])
        })
    }
  }

  render() {
    const { gatoFrame, record } = this.state

    // create a lookup for chords
    CHORDED.clear()
    if (record.chord) {
      for (let dir of DIRS) {
        const x = dir[1] + record.chord[1]
        const y = dir[0] + record.chord[0]
        if (valid(record, y, x))
          CHORDED.add(makeKey(x, y))
      }
    }

    let mood = 'idle'
    if (record.lose) {
      this.timer.current.stop()
      mood = 'sad'
    }
    // else if (record.loss)

    const rows = new Array(record.counts.size)
    record.counts.forEach((row, i) => {
      rows[i] = (
        <BoardRow
          key={i}
          row={row}
          y={i}
          monsters={record.monsters}
          opened={record.opened.get(i)}
          chorded={CHORDED}
        />
      )
    })

    return (
      <div id="game-container" onMouseMove={throttle(this.pawFollow, 50)}>
        <div id="paw-cursor" ref={this.paw} />
        <div>
          <div id="hud">
            <div id="monsters-left">{record.monstersLeft}</div>
            <Gato ref={this.gato} mood={mood} />
            <Timer ref={this.timer} />
          </div>
          <table id="game" className="skin-default"
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
        </div>
      </div>
    )
  }
}


function BoardRow({ row, opened, monsters, chorded, y }) {
  const cells = new Array(row.size)
  let key
  row.forEach((cell, j) => {
    key = makeKey(j, y)
    cells[j] = (
      <BoardCell
        key={j}
        x={j}
        y={y}
        cell={cell}
        opened={opened.get(j)}
        monster={monsters.get(key) || 0}
        chorded={chorded.has(key)}
      />
    )
  })

  return (
    <tr $HasKeyedChildren>
      {cells}
    </tr>
  )
}

function BoardCell({ opened, monster, cell, chorded, x, y }) {
  let showFlag = false
  let showMonster = false

  let inner = <div className="inner"></div>
  if (opened === 1 && monster < 1)
    inner = <div className="inner">{cell || ''}</div>
  else if (opened === 1 && monster > 0)
    showMonster = true
  else if (opened === 2)
    showFlag = true

  return (
    <td className={`board-cell ${opened === 1 ? 'opened' : ''} ${showMonster ? 'monster' : ''} ${showFlag ? 'flagged' : ''} ${chorded ? 'chorded' : ''} cell-${cell}`} data-x={x} data-y={y}>
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
