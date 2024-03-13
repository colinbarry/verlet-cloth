const appEl = document.querySelector("#app");

const ITERATIONS = 2;

function makeModel(width, height) {
  let points = [],
    joins = [];

  function difference(p0, p1) {
    return { x: p0.x - p1.x, y: p0.y - p1.y };
  }

  function length(point) {
    return Math.sqrt(point.x * point.x + point.y * point.y);
  }

  function makeJoin(from, to) {
    const len = length(difference(from, to));
    return { from, to, length: len };
  }

  for (let r = 0; r < height; r++) {
    const y = (r * 1) / (height - 1);
    for (let c = 0; c < width; c++) {
      const point = { x: (c * 1) / (width - 1), y };
      point.px = point.x;
      point.py = point.y;

      if (r === 0) point.isFixed = true;

      points.push(point);
    }
  }

  function pointByPosition(r, c) {
    return points[r * width + c];
  }

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width - 1; c++) {
      const from = pointByPosition(r, c);
      joins.push(makeJoin(from, pointByPosition(r, c + 1)));
      if (r < height - 1) {
        if ((r + c) % 2 === 1) {
          joins.push(makeJoin(from, pointByPosition(r + 1, c + 1)));
        } else {
          joins.push(
            makeJoin(pointByPosition(r, c + 1), pointByPosition(r + 1, c)),
          );
        }
      }
    }
  }

  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height - 1; r++) {
      joins.push(makeJoin(pointByPosition(r, c), pointByPosition(r + 1, c)));
    }
  }

  function tick(deltaTime) {
    deltaTime = Math.min(deltaTime, 1 / 30);
    const force = { x: Math.random() * 0.1, y: 0.8 };

    for (let particle of points) {
      if (particle.isFixed) continue;

      const acceleration = { x: force.x, y: force.y };
      const px = particle.x;
      const py = particle.y;

      particle.x =
        2 * particle.x - particle.px + acceleration.x * (deltaTime * deltaTime);
      particle.y =
        2 * particle.y - particle.py + acceleration.y * (deltaTime * deltaTime);

      particle.px = px;
      particle.py = py;
    }

    for (let i = 0; i < ITERATIONS; ++i) {
      for (let join of joins) {
        const diff = difference(join.from, join.to);
        const diffLen = length(diff);
        const factor = (join.length - diffLen) / diffLen / 2;
        const offset = { x: diff.x * factor, y: diff.y * factor };

        if (!join.from.isFixed) {
          join.from.x += offset.x;
          join.from.y += offset.y;
        }

        if (!join.to.isFixed) {
          join.to.x -= offset.x;
          join.to.y -= offset.y;
        }
      }
    }
  }

  function removePoint(point) {
    points = points.filter((each) => each !== point);
    joins = joins.filter((each) => each.from !== point && each.to !== point);
  }

  return {
    points: () => points,
    joins: () => joins,
    tick,

    removePoint,
  };
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function distanceFromPointToLine(
  x0Line,
  y0Line,
  x1Line,
  y1Line,
  xPoint,
  yPoint,
) {
  const px = x1Line - x0Line;
  const py = y1Line - y0Line;
  const norm = px * px + py * py;
  const u = clamp(
    ((xPoint - x0Line) * px + (yPoint - y0Line) * py) / norm,
    0,
    1,
  );

  const x = x0Line + u * px;
  const y = y0Line + u * py;

  const dx = x - xPoint;
  const dy = y - yPoint;

  return Math.sqrt(dx * dx + dy * dy);
}

function nearestPoint(x, y, points) {
  const EPSILON = 0.05;
  const nearest = points.reduce((best, each) => {
    const dx = each.x - x;
    const dy = each.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= EPSILON) {
      if (!best || dist < best.dist) {
        best = { point: each, dist };
      }
    }

    return best;
  }, undefined);

  return nearest ? nearest.point : undefined;
}

function makePointerHandler() {
  let isDragging = false;
  let prevPoint;

  appEl.addEventListener("pointerdown", (e) => {
    isDragging = true;

    const pt = appEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse());
    const closest = nearestPoint(txPoint.x, txPoint.y, model.points());

    if (closest) {
      model.removePoint(closest);
    }

    prevPoint = { x: txPoint.x, y: txPoint.y };
  });

  appEl.addEventListener("pointermove", (e) => {
    if (isDragging) {
      const pt = new DOMPoint(e.clientX, e.clientY);
      const txPoint = pt.matrixTransform(appEl.getScreenCTM().inverse());

      const points = model.points().filter((each) => {
        return (
          distanceFromPointToLine(
            prevPoint.x,
            prevPoint.y,
            txPoint.x,
            txPoint.y,
            each.x,
            each.y,
          ) < 0.03
        );
      });

      prevPoint = { x: txPoint.x, y: txPoint.y };

      points.forEach((each) => model.removePoint(each));
    }
  });

  appEl.addEventListener("pointerup", () => {
    isDragging = false;
  });
}

function render(app, points, joins) {
  const doc =
    `<g>` +
    joins
      .map(
        (join) =>
          `<line x1="${join.from.x}" y1="${join.from.y}" x2="${join.to.x}" y2="${join.to.y}"></line>`,
      )
      .join("") +
    "</g>";

  app.innerHTML = doc;
}

const model = makeModel(24, 24);
makePointerHandler();

let timestamp;
function frame(now) {
  if (timestamp === undefined) {
    timestamp = now;
  }

  const elapsed = now - timestamp;
  model.tick(elapsed);
  render(appEl, model.points(), model.joins());
  timestamp = now;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
