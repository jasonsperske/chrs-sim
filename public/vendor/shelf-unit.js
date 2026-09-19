// Shelf unit — a small object, here mostly to show that the ledge profiles are
// shared library code rather than something baked into the staircase.

export const meta = {
  order: 3,
  name: 'Shelf unit',
  description:
    'A simple carcass with evenly spaced shelves, sharing the same ledge profiles as the stair treads.',
}

export const params = [
  { id: 'width', label: 'Width', type: 'number', min: 200, max: 2400, step: 10, default: 800, unit: 'mm', group: 'Carcass' },
  { id: 'height', label: 'Height', type: 'number', min: 200, max: 2600, step: 10, default: 1800, unit: 'mm', group: 'Carcass' },
  { id: 'depth', label: 'Depth', type: 'number', min: 100, max: 800, step: 5, default: 320, unit: 'mm', group: 'Carcass' },
  { id: 'shelves', label: 'Intermediate shelves', type: 'int', min: 0, max: 12, step: 1, default: 4, group: 'Carcass' },
  { id: 'toeKick', label: 'Toe kick height', type: 'number', min: 0, max: 250, step: 5, default: 80, unit: 'mm', group: 'Carcass' },

  { id: 'shelfThickness', label: 'Shelf thickness', type: 'number', min: 8, max: 80, step: 1, default: 22, unit: 'mm', group: 'Boards' },
  { id: 'sideThickness', label: 'Side thickness', type: 'number', min: 8, max: 80, step: 1, default: 22, unit: 'mm', group: 'Boards' },
  {
    id: 'edgeStyle',
    label: 'Front edge profile',
    type: 'select',
    options: [
      { value: 'square', label: 'Square' },
      { value: 'chamfer', label: 'Chamfer' },
      { value: 'rounded', label: 'Round-over' },
      { value: 'bullnose', label: 'Bullnose' },
      { value: 'cove', label: 'Cove' },
      { value: 'ogee', label: 'Ogee' },
    ],
    default: 'bullnose',
    group: 'Boards',
  },
  {
    id: 'edgeSize',
    label: 'Profile size',
    type: 'number',
    min: 0,
    max: 25,
    step: 0.5,
    default: 8,
    unit: 'mm',
    group: 'Boards',
    visibleWhen: (p) => str(p, 'edgeStyle') !== 'square' && str(p, 'edgeStyle') !== 'bullnose',
  },

  { id: 'back', label: 'Back panel', type: 'boolean', default: true, group: 'Back' },
  {
    id: 'backThickness',
    label: 'Back thickness',
    type: 'number',
    min: 3,
    max: 40,
    step: 1,
    default: 9,
    unit: 'mm',
    group: 'Back',
    visibleWhen: (p) => bool(p, 'back'),
  },
]

export function build(p) {
  const width = num(p, 'width')
  const height = num(p, 'height')
  const depth = num(p, 'depth')
  const side = num(p, 'sideThickness')
  const shelfT = num(p, 'shelfThickness')
  const toe = num(p, 'toeKick')
  const shelves = Math.max(0, Math.round(num(p, 'shelves')))
  const innerWidth = Math.max(width - 2 * side, 1)
  const parts = []

  // Sides run the full height; the shelves span between them.
  const sides = []
  for (const s of [1, -1]) {
    sides.push(slab(depth, height, side, 0, 0).translate(0, 0, (s * (width - side)) / 2))
  }
  parts.push({ name: 'sides', geometry: merge(sides), color: 0xb98a54 })

  // Fixed top and bottom, then evenly spaced shelves in the clear opening.
  const boards = []
  const shape = boardProfile(depth, shelfT, str(p, 'edgeStyle'), num(p, 'edgeSize'))
  const levels = [toe, height - shelfT]
  const clear = height - shelfT - (toe + shelfT)
  for (let i = 1; i <= shelves; i++) {
    levels.push(toe + shelfT + (clear * i) / (shelves + 1) - shelfT / 2)
  }
  // The shaped edge points along +X while the unit is being drawn; the whole
  // thing is turned to +Z at the end, so it opens toward the viewer.
  for (const y of levels) {
    boards.push(extrudeProfile(shape, innerWidth, 0, y, 'front'))
  }
  parts.push({ name: 'shelves', geometry: merge(boards), color: 0xd8ab72 })

  if (bool(p, 'back')) {
    const t = num(p, 'backThickness')
    parts.push({
      name: 'back-panel',
      geometry: slab(t, height - toe, innerWidth, 0, toe),
      color: 0x9c7a4c,
    })
  }

  if (toe > 0) {
    parts.push({
      name: 'toe-kick',
      geometry: slab(shelfT, toe, innerWidth, depth - shelfT, 0),
      color: 0x8a6a3f,
    })
  }

  // Built with the open face along +X, which is the easy way to extrude a shelf,
  // and then swung round so it opens toward +Z — where the Front view looks
  // from, so the front view looks into the unit rather than along it.
  const facing = parts.filter((part) => part.geometry && triangleCount(part.geometry) > 0)
  for (const part of facing) part.geometry.rotateY(-Math.PI / 2)
  return facing
}

export function metrics(p) {
  const width = num(p, 'width')
  const height = num(p, 'height')
  const toe = num(p, 'toeKick')
  const shelfT = num(p, 'shelfThickness')
  const shelves = Math.max(0, Math.round(num(p, 'shelves')))
  const clear = height - shelfT - (toe + shelfT)
  const bay = clear / (shelves + 1) - shelfT
  const span = width - 2 * num(p, 'sideThickness')
  const spanLevel = span > 900 ? 'error' : span > 750 ? 'warn' : 'ok'

  return [
    { label: 'Clear bay height', value: formatLength(bay), level: bay < 120 ? 'warn' : 'ok' },
    {
      label: 'Shelf span',
      value: formatLength(span),
      level: spanLevel,
      note: spanLevel === 'ok' ? undefined : 'Spans over 750 mm sag noticeably in most timber.',
    },
    { label: 'Boards', value: `${shelves + 2} horizontal` },
  ]
}
