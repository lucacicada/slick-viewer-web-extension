import type { MaybeRefOrGetter } from 'vue'
import { unrefElement, useElementBounding, useEventListener, useMutationObserver, useResizeObserver } from '@vueuse/core'
import { computed, ref, shallowRef, toValue, watch } from 'vue'

interface UseViewportControlOptions {
  padding?: number
}

const DRAG_MARGIN = 60

export function useViewportControl(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  content: MaybeRefOrGetter<HTMLImageElement | HTMLMediaElement | null | undefined>,
  options?: MaybeRefOrGetter<UseViewportControlOptions>,
) {
  const transformMatrix = shallowRef<DOMMatrix | undefined>(typeof DOMMatrix === 'undefined' ? undefined as unknown as DOMMatrix : new DOMMatrix())
  const transform = computed(() => transformMatrix.value ? String(transformMatrix.value) : 'matrix(1, 0, 0, 1, 0, 0)')

  const area = shallowRef<{ x: number, y: number, w: number, h: number } | null>(null)

  const containerBounding = useElementBounding(container)

  let suppressContextMenu = false

  const contentWidth = ref(0)
  const contentHeight = ref(0)

  // #region Determine the size of the image or video content.

  function computeDimensions(el: EventTarget | null | undefined) {
    if (el) {
      if (el instanceof HTMLImageElement) {
        contentWidth.value = el.naturalWidth
        contentHeight.value = el.naturalHeight
        return
      }

      if (el instanceof HTMLVideoElement) {
        contentWidth.value = el.videoWidth
        contentHeight.value = el.videoHeight
        return
      }
    }

    contentWidth.value = 0
    contentHeight.value = 0
  }

  watch(() => unrefElement(content), (el) => {
    computeDimensions(el)

    // Special case, there is no `decoded` event for images,
    // so we need to decode the image manually.
    if (typeof HTMLImageElement !== 'undefined' && el instanceof HTMLImageElement) {
      el.decode().then(() => computeDimensions(el))
    }
  }, {
    immediate: true,
  })

  useEventListener(content, ['load', 'loadedmetadata'], (e) => {
    computeDimensions(e.target)
  }, {
    passive: true,
  })

  useMutationObserver(content, (mutations) => {
    for (const mutation of mutations) {
      computeDimensions(mutation.target)
    }
  }, {
    attributeFilter: ['src'],
  })

  // #endregion

  // #region Control the transform matrix of the viewport.

  function getContextData() {
    const matrix = transformMatrix.value

    if (!matrix || containerBounding.width.value === 0 || containerBounding.height.value === 0 || contentWidth.value === 0 || contentHeight.value === 0) {
      return null
    }

    return {
      matrix,
      container: {
        top: containerBounding.top.value,
        left: containerBounding.left.value,
        bottom: containerBounding.bottom.value,
        right: containerBounding.right.value,
        width: containerBounding.width.value,
        height: containerBounding.height.value,
        x: containerBounding.x.value,
        y: containerBounding.y.value,
      },
      content: {
        width: contentWidth.value,
        height: contentHeight.value,
      },
    }
  }

  function zoom(scaleFactor: number, pivot?: { x: number, y: number }) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const matrix = ctx.matrix

    if (scaleFactor < 1) {
      const currentScale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b)

      // Get the size of the image after scaling
      const currentWidth = Math.abs(currentScale * ctx.content.width)
      const currentHeight = Math.abs(currentScale * ctx.content.height)

      // Prevent zooming out too much
      if (Math.max(currentWidth, currentHeight) < 50) {
        return
      }
    }

    const x = pivot?.x ?? ctx.content.width / 2
    const y = pivot?.y ?? ctx.content.height / 2

    transformMatrix.value = matrix
      .translate(x, y)
      .scale(scaleFactor)
      .translate(-x, -y)
  }

  function zoomAtMousePoint(scaleFactor: number, event: MouseEvent | WheelEvent) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const mouseX = event.clientX - ctx.container.left
    const mouseY = event.clientY - ctx.container.top

    const inv = ctx.matrix.inverse()
    const pointInImageCoords = inv.transformPoint(new DOMPoint(mouseX, mouseY))

    zoom(scaleFactor, {
      x: pointInImageCoords.x,
      y: pointInImageCoords.y,
    })
  }

  function rotate(deg: number, pivot?: { x: number, y: number }) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const x = pivot?.x ?? ctx.content.width / 2
    const y = pivot?.y ?? ctx.content.height / 2

    transformMatrix.value = ctx.matrix
      .translate(x, y)
      .rotate(deg)
      .translate(-x, -y)
  }

  function rotateAtMousePoint(deg: number, event: MouseEvent | WheelEvent) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const inv = ctx.matrix.inverse()
    const mouseX = event.clientX - ctx.container.left
    const mouseY = event.clientY - ctx.container.top

    const pointInImageCoords = inv.transformPoint(new DOMPoint(mouseX, mouseY))

    rotate(deg, {
      x: pointInImageCoords.x,
      y: pointInImageCoords.y,
    })
  }

  function rotateExact(deg: number) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    transformMatrix.value = ctx.matrix
      .translate(ctx.content.width / 2, ctx.content.height / 2)
      // FIXME: subtract the current rotation works, but we may hit float point precision issues thus the rotation is set to -0.00000000001
      .rotate(-Math.atan2(ctx.matrix.b, ctx.matrix.a) * (180 / Math.PI))
      .rotate(deg)
      .translate(-ctx.content.width / 2, -ctx.content.height / 2)
  }

  function centerImage(padding?: number) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    padding = padding ?? toValue(options)?.padding ?? 0

    const scale = Math.min(
      (ctx.container.width - padding) / ctx.content.width,
      (ctx.container.height - padding) / ctx.content.height,
    )

    transformMatrix.value = new DOMMatrix()
      .translate(ctx.container.width / 2, ctx.container.height / 2)
      .scale(scale)
      .translate(-ctx.content.width / 2, -ctx.content.height / 2)
  }

  /**
   * Pad in screen coordinates.
   * Useful to drag the image around with the mouse.
   */
  function pad(x: number, y: number) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const inv = ctx.matrix.inverse()
    const origin = inv.transformPoint(new DOMPoint(0, 0))
    const moved = inv.transformPoint(new DOMPoint(x, y))

    const localDeltaX = moved.x - origin.x
    const localDeltaY = moved.y - origin.y

    transformMatrix.value = ctx.matrix.translate(localDeltaX, localDeltaY)
  }

  /**
   * Select the area, zoom in and pan to the center of the area.
   */
  function select(area: { x: number, y: number, w: number, h: number }) {
    const ctx = getContextData()

    if (!ctx) {
      return
    }

    const inv = ctx.matrix.inverse()
    const origin = inv.transformPoint(new DOMPoint(ctx.container.width / 2, ctx.container.height / 2))
    const areaCenter = inv.transformPoint(new DOMPoint(area.x + area.w / 2, area.y + area.h / 2))

    const scaleFactor = Math.min(ctx.container.width / area.w, ctx.container.height / area.h)

    transformMatrix.value = ctx.matrix
      .translate(origin.x, origin.y)
      .scale(scaleFactor)
      .translate(-areaCenter.x, -areaCenter.y)
  }

  // #endregion

  useShortcuts({
    ' ': () => centerImage(),
    'Escape': () => rotateExact(0),
    'ArrowUp': () => pad(0, -10),
    'ArrowDown': () => pad(0, 10),
    'ArrowLeft': () => pad(-10, 0),
    'ArrowRight': () => pad(10, 0),
    'Home': () => centerImage(20),
    'End': () => centerImage(0),
    '+': () => zoom(1.1),
    '-': () => zoom(0.9),
  })

  function mouseInOuterBounds(event: MouseEvent) {
    const x = event.clientX - containerBounding.left.value
    const y = event.clientY - containerBounding.top.value

    return x >= DRAG_MARGIN && x <= containerBounding.width.value - DRAG_MARGIN && y >= DRAG_MARGIN && y <= containerBounding.height.value - DRAG_MARGIN
  }

  usePointerAction(container, {
    pan: {
      down: ({ event }) => {
        if (event.shiftKey || event.ctrlKey) {
          return
        }

        if (event.button === 1) {
          return true
        }

        if (event.button === 0) {
          return mouseInOuterBounds(event)
        }
      },
      move: ({ delta }) => {
        pad(delta.x, delta.y)
      },
    },
    rotate: {
      down: ({ event }) => {
        if (event.shiftKey || event.ctrlKey) {
          return
        }

        if (event.button === 0) {
          return !mouseInOuterBounds(event)
        }
      },
      move: ({ delta, event }) => {
        const ROTATE_POINTER_SENSITIVITY = 1 / 100

        let rx = delta.x * ROTATE_POINTER_SENSITIVITY
        let ry = delta.y * ROTATE_POINTER_SENSITIVITY

        // position aware rotation
        if (event.clientY > containerBounding.height.value / 2) {
          rx *= -1
        }

        if (event.clientX < containerBounding.width.value / 2) {
          ry *= -1
        }

        rotate(rx + ry)
      },
    },
    area: {
      down: ({ event }) => {
        if (event.shiftKey || event.ctrlKey) {
          return
        }

        if (event.button === 2) {
          return true
        }
      },
      move: (event) => {
        const top = event.startY - containerBounding.top.value
        const left = event.startX - containerBounding.left.value
        const width = event.x - event.startX
        const height = event.y - event.startY

        const MIN_AREA = 12

        if (Math.abs(width) < MIN_AREA || Math.abs(height) < MIN_AREA) {
          area.value = null
          return
        }

        suppressContextMenu = true

        area.value = {
          x: Math.min(left, left + width),
          y: Math.min(top, top + height),
          w: Math.abs(width),
          h: Math.abs(height),
        }
      },
      up: () => {
        if (area.value) {
          select(area.value)
        }

        area.value = null
      },
    },
  })

  useEventListener(container, 'wheel', (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    // If we are r-click, make sure to suppress the context menu
    if (e.buttons === 2) {
      suppressContextMenu = true
    }

    // Rotate instead of zooming under the cursor
    if (e.shiftKey || e.buttons === 2) {
      // When r-click, rotate slow
      const angle = Math.sign(e.deltaY) * (e.shiftKey ? 15 : 2)
      rotateAtMousePoint(angle, e)
    }
    else {
      zoomAtMousePoint(e.deltaY < 0 ? 1.1 : 0.9, e)
    }
  })

  useEventListener(container, 'contextmenu', (event) => {
    if (event.shiftKey) {
      return
    }

    if (suppressContextMenu) {
      suppressContextMenu = false

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
  }, {
    capture: true,
    passive: false,
  })

  // #region Reset the viewport to the initial state.

  function reset() {
    centerImage()
  }

  watch(() => [toValue(contentWidth), toValue(contentHeight)], () => {
    reset()
  }, {
    immediate: true,
  })

  const { stop } = useResizeObserver(container, () => {
    reset()
    stop()
  })

  // #endregion

  return {
    transformMatrix,
    transform,
    //
    width: contentWidth,
    height: contentHeight,
    area,
    //
    zoom,
    zoomAtMousePoint,
    rotate,
    rotateAtMousePoint,
    rotateExact,
    centerImage,
    pad,
    select,
  }
}

interface UsePointerEvent {
  event: PointerEvent
  startX: number
  startY: number
  x: number
  y: number
  delta: {
    x: number
    y: number
  }
}

interface PointerAction {
  down?: (event: UsePointerEvent) => void | boolean
  move?: (event: UsePointerEvent) => void
  up?: (event: UsePointerEvent) => void
}

function usePointerAction(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  actions: Record<string, PointerAction>,
) {
  const rect = useElementBounding(target)

  const pointer = ref({
    suppressContextMenu: false,
    pointerId: undefined as number | undefined,
    down: false,
    action: undefined as string | undefined,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  })

  useEventListener(target, 'pointerdown', (event) => {
    if (event.shiftKey || event.ctrlKey) {
      return
    }

    if (rect.width.value === 0 || rect.height.value === 0) {
      return
    }

    const actionValue = toValue(actions)
    for (const actionName in actionValue) {
      const action = actionValue[actionName]
      if (action?.down) {
        if (event.defaultPrevented) {
          return
        }

        const context = {
          event,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          delta: {
            x: 0,
            y: 0,
          },
        }

        if (action.down(context)) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()

          pointer.value = {
            suppressContextMenu: false,
            pointerId: event.pointerId,
            down: true,
            action: actionName,
            startX: event.clientX,
            startY: event.clientY,
            x: event.clientX,
            y: event.clientY,
          }
        }
      }
    }
  })

  useEventListener('pointermove', (event) => {
    if (!pointer.value.down || event.pointerId !== pointer.value.pointerId) {
      return
    }

    const deltaX = event.clientX - pointer.value.x
    const deltaY = event.clientY - pointer.value.y
    pointer.value.x = event.clientX
    pointer.value.y = event.clientY

    const actionValue = toValue(actions)
    const action = actionValue[pointer.value.action!]

    if (!action || !action.move) {
      return
    }

    action.move({
      event,
      startX: pointer.value.startX,
      startY: pointer.value.startY,
      x: pointer.value.x,
      y: pointer.value.y,
      delta: {
        x: deltaX,
        y: deltaY,
      },
    })
  }, {
    passive: true,
  })

  useEventListener(['pointerup', 'pointercancel'], (event) => {
    if (!pointer.value.down || event.pointerId !== pointer.value.pointerId) {
      return
    }

    pointer.value.pointerId = undefined
    pointer.value.down = false

    const actionValue = toValue(actions)
    const action = actionValue[pointer.value.action!]
    pointer.value.action = undefined

    if (!action || !action.up) {
      return
    }

    action.up({
      event,
      startX: pointer.value.startX,
      startY: pointer.value.startY,
      x: pointer.value.x,
      y: pointer.value.y,
      delta: {
        x: event.clientX - pointer.value.startX,
        y: event.clientY - pointer.value.startY,
      },
    })
  }, {
    passive: true,
  })

  useEventListener('contextmenu', (event) => {
    if (event.shiftKey) {
      return
    }

    if (pointer.value.suppressContextMenu) {
      pointer.value.suppressContextMenu = false

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
  }, {
    capture: true,
    passive: false,
  })

  return pointer
}

/**
 * For convenience, `preventDefault()` is automatically called on the event after the callback is invoked.
 *
 * To control this behavior, return `false` from the callback, this will leave the `event` untouched.
 */
interface ShortcutHandler {
  (event: KeyboardEvent): void | boolean
}

type Shortcuts = {
  [K in string]: (event: KeyboardEvent) => void | boolean
}

function useShortcuts<T extends ShortcutHandler | Shortcuts>(
  shortcuts: MaybeRefOrGetter<T>,
) {
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.repeat || event.defaultPrevented) {
      return
    }

    const s = toValue(shortcuts)

    if (!s) {
      return
    }

    let res: any
    let called = false

    if (typeof s === 'function') {
      res = s(event)
      called = true
    }
    else if ('key' in event && typeof s[event.key] === 'function') {
      res = s[event.key]!(event)
      called = true
    }

    if (called && res !== false) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
  })
}
