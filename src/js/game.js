import React from 'react'
import { Map, Record, Range } from 'immutable'

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
      let cell = stack.pop()
      visited.add(makeKey(...cell))
      r.setIn(['opened', ...cell], 1)

      if (r.counts.getIn(cell) > 0)
        continue

      for (let dir of DIRS) {
        const xx = dir[1] + cell[1]
        const yy = dir[0] + cell[0]
        const next = [yy, xx]
        if (!visited.has(makeKey(...next)) && yy > -1 && yy < r.height && xx > -1 && xx < r.width) {
          stack.push(next)
        }
      }
    }
  })
}

const CHORDED = new Set()

export function Game({ initData }) {
  const [state, setState] = React.useState(initData)
  const record = state.record

  function handleClick(evt) {
    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y
      return setState({
        record:
          state.record.withMutations(r => {
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
            }

            // open the square
            openCascade(r, x, y)
          })
      })
    }
  }

  function handleRightClick(evt) {
    evt.preventDefault()

    if (evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      return setState({
        record: record.updateIn(['opened', y, x], v => v == 2 ? 0 : v == 0 ? 2 : v)
      })
    }
  }

  function handleMouseUp(evt) {
    evt.preventDefault()

    if (evt.button === 1) {
      return setState({
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

  function handleMouseLeave(evt) {
    evt.preventDefault()

    return setState({
      record: record.set('chord', null)
    })
  }


  function handleMouseMove(evt) {
    evt.preventDefault()

    if (record.chord != null && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return setState({
          record: record.set('chord', [y, x])
        })
    }
  }

  function handleMouseDown(evt) {
    evt.preventDefault()

    if (evt.button === 1 && evt.target.classList.contains('board-cell')) {
      const data = evt.target.dataset
      const x = +data.x
      const y = +data.y

      if (record.opened.getIn([y, x]) === 1)
        return setState({
          record: record.set('chord', [y, x])
        })
    }
  }

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

  return (
    <table id="game" className="skin-default"
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <tbody>
        {record.counts.map((row, i) =>
          <BoardRow key={i} row={row} y={i} record={record} chorded={CHORDED}></BoardRow>
        )}
      </tbody>
    </table>
  )
}


function BoardRow({ row, record, chorded, y }) {
  return (
    <tr>
      {row.map((cell, j) =>
        <BoardCell key={j} x={j} y={y} cell={cell} record={record} chorded={chorded}></BoardCell>
      )}
    </tr>
  )
}


function BoardCell({ record, cell, chorded, x, y }) {
  const key = makeKey(x, y)
  const monster = record.monsters.get(key);
  const opened = record.opened.getIn([y, x]);
  let inner = <div className="inner"></div>
  if (opened === 1)
    inner = monster > 0
      ? <div className="inner">X</div>
      : <div className="inner">{cell || ''}</div>
  else if (opened === 2)
    inner = <div className="inner">F</div>

  return (
    <td className={`board-cell ${opened === 1 ? 'opened' : ''} ${opened === 2 ? 'flagged' : ''} ${chorded.has(key) ? 'chorded' : ''} cell-${cell}`} data-x={x} data-y={y}>
      {inner}
    </td>
  )
}
