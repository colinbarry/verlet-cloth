const appEl = document.querySelector('#app')

const ITERATIONS = 2

function difference (p0, p1) {
  return { x: p0.x - p1.x, y: p0.y - p1.y }
}

function length (point) {
  return Math.sqrt(point.x * point.x + point.y * point.y)
}

/** Computes the determinant
 | a b |
 | c d |
 */
function det (a, b, c, d) {
  return a * d - b * c
}

/** True if the lines given by the points intersect
 */
function lineIntersectsLine (x1, y1, x2, y2, x3, y3, x4, y4) {
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

function makeModel (width, height) {
  let points = []
  let joins = []

  function makeJoin (from, to) {
    const len = length(difference(from, to))
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

  function pointByPosition (r, c) {
    return points[r * width + c]
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
            makeJoin(pointByPosition(r, c + 1), pointByPosition(r + 1, c))
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

  function tick (deltaTime) {
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

    for (let i = 0; i < ITERATIONS; ++i) {
      for (const join of joins) {
        const diff = difference(join.from, join.to)
        const diffLen = length(diff)
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

  function removePoint (point) {
    points = points.filter((each) => each !== point)
    joins = joins.filter((each) => each.from !== point && each.to !== point)
  }

  function removeJoin (joinToRemove) {
    joins = joins.filter((each) => each !== joinToRemove)

    const pointsUsingJoin = points.filter(
      (point) => point === joinToRemove.from || point === joinToRemove.to
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
    removeJoin
  }
}

function makePointerHandler () {
  let isDragging = false
  let prevPoint

  appEl.addEventListener('pointerdown', (e) => {
    isDragging = true

    const pt = appEl.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY

    const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse())
    prevPoint = { x: txPoint.x, y: txPoint.y }
  })

  appEl.addEventListener('pointermove', (e) => {
    if (isDragging) {
      const pt = new DOMPoint(e.clientX, e.clientY)
      const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse())

      if (length(difference(txPoint, prevPoint)) <= 0.01) return

      const joinsToRemove = model.joins().filter((join) => {
        return lineIntersectsLine(
          prevPoint.x,
          prevPoint.y,
          txPoint.x,
          txPoint.y,
          join.from.x,
          join.from.y,
          join.to.x,
          join.to.y
        )
      })

      joinsToRemove.forEach((join) => model.removeJoin(join))
      prevPoint = { x: txPoint.x, y: txPoint.y }
    }
  })

  appEl.addEventListener('pointerup', () => {
    isDragging = false
  })
}

function render (app, points, joins) {
  const doc =
    '<g>' +
    joins
      .map(
        (join) =>
          `<line x1="${join.from.x}" y1="${join.from.y}" x2="${join.to.x}" y2="${join.to.y}"></line>`
      )
      .join('') +
    '</g>'

  app.innerHTML = doc
}

const model = makeModel(24, 24)
makePointerHandler()

let timestamp
function frame (now) {
  if (timestamp === undefined) {
    timestamp = now
  }

  const elapsed = now - timestamp
  model.tick(elapsed)
  render(appEl, model.points(), model.joins())
  timestamp = now
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
