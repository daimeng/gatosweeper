export function makeKey(y, x) {
  return (y << 5) | x
}

export function randrng(start, end) {
  let range = end - start
  return Math.floor(start + Math.random() * range)
}

export const DIRS = [
  [0, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
]
