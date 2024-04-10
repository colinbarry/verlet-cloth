// @ts-check

/**
 * The number of times that the simulation constraints are evaluated, per
 * frame. A larger number gives more accurate results at the expense of
 * performance.
 * @type {number}
 */
const NUM_SIMULATION_ITERATIONS = 2

/**
 * @type {?SVGGraphicsElement}
 */
const appEl = document.querySelector("#app")

/**
 * A two-dimensional point
 * @typedef {{x: number, y: number}} Point
 */

/**
 * A two-dimensional line, defined in terms of start and end points
 * @typedef {{from: Point, to: Point}} Line
 */

/**
 * Returns the difference between two points as a Point
 * @param {Point} p0
 * @param {Point} p1
 * @return {Point}
 */
const difference = (p0, p1) => {
  return { x: p0.x - p1.x, y: p0.y - p1.y }
}

/**
 * Returns the scalar length of the given point
 * @param {Point} point
 * @return {number}
 **/
const pointLength = (point) => {
  return Math.sqrt(point.x * point.x + point.y * point.y)
}

/**
 * Computes the determinant of the 2-d matrix
 * @param {number} a - Matrix element (1, 1)
 * @param {number} b - Matrix element (1, 2)
 * @param {number} c - Matrix element (2, 1)
 * @param {number} d - Matrix element (2, 2)
 * @return {number}
 */
const det = (a, b, c, d) => {
  return a * d - b * c
}

/** True only if the given pair of lines intersect
 * @param {Line} line1
 * @param {Line} line2
 * @return {boolean}
 */
const lineIntersectsLine = (
  { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } },
  { from: { x: x3, y: y3 }, to: { x: x4, y: y4 } },
) => {
  const x =
    det(det(x1, y1, x2, y2), x1 - x2, det(x3, y3, x4, y4), x3 - x4) /
    det(x1 - x2, y1 - y2, x3 - x4, y3 - y4)
  const y =
    det(det(x1, y1, x2, y2), y1 - y2, det(x3, y3, x4, y4), y3 - y4) /
    det(x1 - x2, y1 - y2, x3 - x4, y3 - y4)

  const intersects =
    Math.min(x1, x2) <= x &&
    Math.max(x1, x2) >= x &&
    Math.min(x3, x4) <= x &&
    Math.max(x3, x4) >= x &&
    Math.min(y1, y2) <= y &&
    Math.max(y1, y2) >= y &&
    Math.min(y3, y4) <= y &&
    Math.max(y3, y4) >= y

  return intersects
}

/**
 * Runs the simulation assuming that the given number milliseconds have elapsed
 * since the previous simulation step
 * @callback Tick
 * @param {number} deltaTimeInMilliseconds
 */

/**
 * Returns the collection of points
 * @callback Points
 * @return {Point[]}
 */

/**
 * Returns the collection of joins
 * @callback Joins
 * @return {Line[]}
 */

/**
 * @typedef Model
 * @prop {Points} points()
 * @prop {Joins} joins()
 * @prop {Tick} tick
 * @prop removePoint
 * @prop removeJoin
 */

/** Creates a model with a given width and height
 * @param {number} width - Number of points in width
 * @param {number} height - Number of points in height
 * @return {Model}
 */
const makeModel = (width, height) => {
  let points = []
  let joins = []

  /**
   * @param {Point} from
   * @param {Point} to
   * @return {Line | {length: number}}
   */
  const makeJoin = (from, to) => {
    const len = pointLength(difference(from, to))
    return { from, to, length: len }
  }

  for (let r = 0; r < height; r++) {
    const y = (r * 1) / (height - 1)
    for (let c = 0; c < width; c++) {
      const point = { x: (c * 1) / (width - 1), y }
      point.px = point.x
      point.py = point.y

      if (r === 0) point.isFixed = true

      points.push(point)
    }
  }

  /**
   * Returns the point at the given row and column
   * @param {number} row
   * @param {number} column
   * @returns {Point}
   */
  const pointByPosition = (row, column) => {
    return points[row * width + column]
  }

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width - 1; c++) {
      const from = pointByPosition(r, c)
      joins.push(makeJoin(from, pointByPosition(r, c + 1)))
      if (r < height - 1) {
        if ((r + c) % 2 === 1) {
          joins.push(makeJoin(from, pointByPosition(r + 1, c + 1)))
        } else {
          joins.push(
            makeJoin(pointByPosition(r, c + 1), pointByPosition(r + 1, c)),
          )
        }
      }
    }
  }

  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height - 1; r++) {
      joins.push(makeJoin(pointByPosition(r, c), pointByPosition(r + 1, c)))
    }
  }

  /**
   * Runs the simulation assuming that the given number milliseconds have elapsed
   * since the previous simulation step
   * @function makeModel~tick
   * @param {number} deltaTime - delta time, in milliseconds
   */
  const tick = (deltaTime) => {
    deltaTime = Math.min(deltaTime, 1 / 30)
    const force = { x: Math.random() * 0.1, y: 0.8 }

    for (const particle of points) {
      if (particle.isFixed) continue

      const acceleration = { x: force.x, y: force.y }
      const px = particle.x
      const py = particle.y

      particle.x =
        2 * particle.x - particle.px + acceleration.x * (deltaTime * deltaTime)
      particle.y =
        2 * particle.y - particle.py + acceleration.y * (deltaTime * deltaTime)

      particle.px = px
      particle.py = py
    }

    for (let i = 0; i < NUM_SIMULATION_ITERATIONS; ++i) {
      for (const join of joins) {
        const diff = difference(join.from, join.to)
        const diffLen = pointLength(diff)
        const factor = (join.length - diffLen) / diffLen / 2
        const offset = { x: diff.x * factor, y: diff.y * factor }

        if (!join.from.isFixed) {
          join.from.x += offset.x
          join.from.y += offset.y
        }

        if (!join.to.isFixed) {
          join.to.x -= offset.x
          join.to.y -= offset.y
        }
      }
    }
  }

  /**
   * Removes the given point from the collection of points, and any joins that
   * are connected to the point.
   * @param {Point} point
   */
  const removePoint = (point) => {
    points = points.filter((each) => each !== point)
    joins = joins.filter((each) => each.from !== point && each.to !== point)
  }

  /** Removes the given join from the collection of joins.
   * @param {Line} joinToRemove
   */
  const removeJoin = (joinToRemove) => {
    joins = joins.filter((each) => each !== joinToRemove)

    const pointsUsingJoin = points.filter(
      (point) => point === joinToRemove.from || point === joinToRemove.to,
    )
    const pointsToDelete = pointsUsingJoin.filter((point) => {
      return (
        joins.reduce((count, join) => {
          return join.from === point || join.to === point ? count + 1 : count
        }, 0) !== 0
      )
    })

    points = points.filter((point) => !(point in pointsToDelete))
  }

  return {
    points: () => points,
    joins: () => joins,
    tick,

    removePoint,
    removeJoin,
  }
}

/** Add pointer event listeners to the given HTML element
 * @param {SVGGraphicsElement} appEl
 */
const makePointerHandler = (appEl) => {
  let isDragging = false
  let prevPoint

  appEl.addEventListener("pointerdown", (e) => {
    isDragging = true

    const pt = new DOMPoint()
    pt.x = e.clientX
    pt.y = e.clientY

    const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse())
    prevPoint = { x: txPoint.x, y: txPoint.y }
  })

  appEl.addEventListener("pointermove", (e) => {
    if (isDragging) {
      const pt = new DOMPoint(e.clientX, e.clientY)
      const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse())

      if (pointLength(difference(txPoint, prevPoint)) <= 0.01) return

      const joinsToRemove = model.joins().filter((join) => {
        return lineIntersectsLine({ from: prevPoint, to: txPoint }, join)
      })

      joinsToRemove.forEach((join) => model.removeJoin(join))
      prevPoint = { x: txPoint.x, y: txPoint.y }
    }
  })

  appEl.addEventListener("pointerup", () => {
    isDragging = false
  })
}

/**
 * Renders the given points and joins as an SVG graphic under the app element
 * @param {SVGElement} app
 * @param {Point[]} points
 * @param {Line[]} joins
 */
const render = (app, points, joins) => {
  const doc = joins
    .map(
      (join) =>
        `<line x1="${join.from.x}" y1="${join.from.y}" x2="${join.to.x}" y2="${join.to.y}"></line>`,
    )
    .join("")

  app.innerHTML = doc
}

const model = makeModel(24, 24)
if (appEl) makePointerHandler(appEl)

/** @type {?number} */
let timestamp

/**
 * @param {number} now
 */
function frame(now) {
  if (timestamp === undefined) {
    timestamp = now
  }

  // @ts-ignore
  const elapsed = now - timestamp
  model.tick(elapsed)
  if (appEl) render(appEl, model.points(), model.joins())
  timestamp = now
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
