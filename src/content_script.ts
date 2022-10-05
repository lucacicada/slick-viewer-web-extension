import type { Browser, Storage } from 'webextension-polyfill'
declare const chrome: Browser

function hideMouseWhenIdleTimeout(timeoutInMilliseconds: number) {
  let moveTimerHandler: number | undefined

  function resetMouseMoveTimeout() {
    clearTimeout(moveTimerHandler)
    moveTimerHandler = undefined

    moveTimerHandler = setTimeout(() => {
      document.body.style.cursor = 'none'
    }, timeoutInMilliseconds)
  }

  document.addEventListener('mousemove', resetMouseMoveTimeout, { passive: true })

  resetMouseMoveTimeout()

  return function disconnect() {
    document.removeEventListener('mousemove', resetMouseMoveTimeout)
    clearTimeout(moveTimerHandler)
  }
}

function normalizeImageAttributesObserver(el: Element, attributes: string[]) {
  const observer = new MutationObserver((_, observer) => {
    observer.disconnect()

    attributes.forEach((attribute) => el.removeAttribute(attribute))

    // for some reason, setting the cursor style at the CSS level does not works
    el.setAttribute('style', 'cursor: inherit')

    observer.observe(el, {
      attributeFilter: attributes
    })
  })

  observer.observe(el, {
    attributeFilter: attributes
  })

  // same as the MutationObserver callback
  attributes.forEach((attribute) => el.removeAttribute(attribute))

  // for some reason, setting the cursor style at the CSS level does not works
  el.setAttribute('style', 'cursor: inherit')
}

export function createImageViewer() {
  // get the image
  const image = document.body.querySelector('img')!

  // sanity check, make sure the image exists
  if (!image) {
    throw new TypeError('Slick Viewer: image not available on the current page.')
  }

  // create a new canvas
  const canvas = document.createElement('canvas')

  // set the canvas size to match the windows size
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  // get the 2d rendering context
  const ctx = canvas.getContext('2d')!

  // sanity check, make sure the 2d rendering context exists
  if (!ctx) {
    throw new TypeError('Slick Viewer: 2d rendering context is unavailable.')
  }

  // reset the browser default style
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')

  // remove all the elements
  document.querySelectorAll('link, style, div, canvas').forEach((el) => el.remove())

  // reset the img attributes
  normalizeImageAttributesObserver(image, ['width', 'height', 'class', 'style'])

  // inject the css
  const style = document.createElement('style')
  style.textContent = `/* Slick Viewer styles v0.1 */

html,
body {
  height: 100%;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0px;
  height: 100vh;
  background-color: #181818;
}

/*
 * Disable pointer events
 */
div,
canvas {
  pointer-events: none;
}

img {
  display: block;
  background-image: none;
  background-color: transparent;
  object-fit: cover;
  width: 100%;
  height: 100%;
  cursor: inherit;
}

canvas {
  display: block;
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.main-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/*
 * The nice blur effect
 */
.main-container::before {
  content: "";
  position: absolute;
  inset: 0;
  backdrop-filter: blur(16px);
}

.controls-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
  padding: 1rem;
  gap: 1rem;
}

.controls-container.end {
  align-items: end;
}

.controls-container.row {
  flex-direction: row;
  align-items: end;
}

.controls-button {
  display: flex;
  appearance: none;
  outline: none;
  cursor: pointer;
  pointer-events: all;
  border: none;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  width: 2rem;
  height: 2rem;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.06));
}`

  // actually insert the css in the page <head>
  document.head.appendChild(style)

  // creates the main container
  const mainContainer = document.createElement('div')
  mainContainer.classList.add('main-container')
  mainContainer.append(canvas)

  const controlsContainer = document.createElement('div')
  controlsContainer.classList.add('controls-container')
  mainContainer.append(controlsContainer)

  // // frame
  // const frameButton = document.createElement('button')
  // frameButton.classList.add('controls-button')
  // frameButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 3v18M18 3v18M3 6h18M3 18h18"/></svg>`
  // controlsContainer.append(frameButton)

  // // 1to1 ratio
  // const originalRatioButton = document.createElement('button')
  // originalRatioButton.classList.add('controls-button')
  // originalRatioButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 20 20"><path fill="currentColor" d="M6.763 7.075A.5.5 0 0 1 7 7.5v5a.5.5 0 0 1-1 0V8.309l-.276.138a.5.5 0 1 1-.448-.894l1-.5a.5.5 0 0 1 .487.022ZM14 7.5a.5.5 0 0 0-.724-.447l-1 .5a.5.5 0 1 0 .448.894L13 8.31v4.19a.5.5 0 0 0 1 0v-5Zm-4 1a.5.5 0 1 1-1 0a.5.5 0 0 1 1 0ZM9.5 12a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1ZM2 6.75A2.75 2.75 0 0 1 4.75 4h10.5A2.75 2.75 0 0 1 18 6.75v6.5A2.75 2.75 0 0 1 15.25 16H4.75A2.75 2.75 0 0 1 2 13.25v-6.5ZM4.75 5A1.75 1.75 0 0 0 3 6.75v6.5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0 0 17 13.25v-6.5A1.75 1.75 0 0 0 15.25 5H4.75Z"/></svg>`
  // controlsContainer.append(originalRatioButton)

  // // crop button
  // const cropButton = document.createElement('button')
  // cropButton.classList.add('controls-button')
  // cropButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M7.932 9.009V16H15v4.009h2V16h3.932v-2H17V7.009H9.932V3h-2v4.009H4v2h3.932Zm2 0V14H15V9.009H9.932Z" clip-rule="evenodd"/></svg>`
  // controlsContainer.append(cropButton)

  // insert the container into the page
  document.body.append(mainContainer)

  // the global settings
  let _settings: Record<string, any> = {}

  let disableLeftClickPanning = false

  // zoom mode
  // none - Zoom from the center of the image (means no translation)
  // pointer - Zoom at the pointer location
  // canvas_center - Zoom from the center of the canvas
  let zoomMode = 'pointer'

  // in pixels
  const rotateMargin = {
    top: 65,
    bottom: 65,
    left: 65,
    right: 65
  }

  // initialize the rendering variables
  let _rotation = 0
  let _translateX = canvas.width / 2
  let _translateY = canvas.height / 2
  let _scale = 1
  const _selectedArea = {
    x: 0,
    y: 0,
    w: 0,
    h: 0
  }

  // draw onto the canvas
  function _draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.setTransform(_scale, 0, 0, _scale, _translateX, _translateY)

    // // TODO: this code is buggy, we need to rotate this points first
    // // keep the rotation at the canvas center
    // const px1 = -_translateX / _scale + canvas.width / 2 / _scale
    // const py1 = -_translateY / _scale + canvas.height / 2 / _scale
    // ctx.translate(px1, py1)
    // ctx.rotate(_rotation)
    // ctx.translate(-px1, -py1)

    // just rotate when we need to rotate around the image center
    ctx.rotate(_rotation)

    const { naturalWidth, naturalHeight } = image

    // TODO: there is a wired line clearly visible
    // draw the image bg color, match the body background color
    ctx.fillStyle = '#181818'
    ctx.fillRect(-naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight)

    ctx.drawImage(image, -naturalWidth / 2, -naturalHeight / 2)

    // draw the selection
    const { x, y, w, h } = _selectedArea
    if (w !== 0 && h !== 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.beginPath()
      ctx.lineWidth = 1
      ctx.fillStyle = 'rgba(100, 151, 177, 0.2)'
      ctx.strokeStyle = 'rgb(100, 151, 177)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
      ctx.closePath()
    }
  }

  // signal to update the rendering
  function update() {
    _draw()
  }

  // settings
  function onStorageChange(changes: Storage.StorageAreaOnChangedChangesType) {
    const settings = (changes['settings'] as Storage.StorageChange | undefined)?.newValue as Record<string, any> | undefined
    if (settings) {
      _settings = settings

      update()
    }
  }

  chrome.storage.local.onChanged.addListener(onStorageChange)
  chrome.storage.local.get('settings').then(({ settings }) => {
    _settings = settings

    update()
  })

  //
  let panning = false
  let dragRotating = false
  let clickRotating = false
  let selectingArea = false
  let pointerLastX = 0
  let pointerLastY = 0

  // how much zoom when scrolling with the mouse wheel
  const WHEEL_ZOOM_FACTOR = 1.1

  // TODO: needs to be scale aware when rotating around the image center
  // TODO: otherwise if we pan too far away it will rotate too fast, the rotation scale will get amplified as we move in a tangent
  // higher value = faster rotation
  const ROTATE_POINTER_SENSITIVITY = 1 / 1500

  function onPointerDownEvent(e: PointerEvent) {
    const { offsetX: x, offsetY: y } = e

    pointerLastX = x
    pointerLastY = y

    // do nothing, preserve the original behavior
    if (e.shiftKey) {
      return undefined
    }

    // Left click
    if (e.button === 0) {
      if (
        rotateMargin &&
        (x <= rotateMargin.left ||
          x >= canvas.width - rotateMargin.right ||
          y <= rotateMargin.top ||
          y >= canvas.height - rotateMargin.bottom)
      ) {
        if (e.cancelable) e.preventDefault()

        dragRotating = true
      } else {
        if (!disableLeftClickPanning) {
          if (e.cancelable) e.preventDefault()

          panning = true
        }
      }
    }

    // Right click
    else if (e.button === 2) {
      if (e.cancelable) e.preventDefault()

      selectingArea = true
      _selectedArea.x = x
      _selectedArea.y = y
      _selectedArea.w = 0
      _selectedArea.h = 0
    }

    // Mouse center (Wheel) click
    else if (e.button === 1) {
      if (e.cancelable) e.preventDefault()

      panning = true
    }

    return undefined
  }

  function onPointerMoveEvent(e: PointerEvent) {
    const { offsetX: x, offsetY: y } = e

    const dx = x - pointerLastX
    const dy = y - pointerLastY

    pointerLastX = x
    pointerLastY = y

    if (clickRotating) {
      return
    }

    if (panning) {
      document.body.style.cursor = 'grabbing'
      _translateX += dx
      _translateY += dy

      update()
    } else if (dragRotating) {
      document.body.style.cursor = 'move'

      let rx = dx * ROTATE_POINTER_SENSITIVITY
      let ry = dy * ROTATE_POINTER_SENSITIVITY

      // position aware rotation
      if (y > canvas.height / 2) rx *= -1
      if (x < canvas.width / 2) ry *= -1

      _rotation += rx
      _rotation += ry

      update()
    } else if (selectingArea) {
      _selectedArea.w = x - _selectedArea.x
      _selectedArea.h = y - _selectedArea.y

      update()
    } else {
      if (
        rotateMargin &&
        (x <= rotateMargin.left ||
          x >= canvas.width - rotateMargin.right ||
          y <= rotateMargin.top ||
          y >= canvas.height - rotateMargin.bottom)
      ) {
        document.body.style.cursor = 'move'
      } else {
        document.body.style.cursor = ''
      }
    }
  }

  function onPointerUpEvent(e: PointerEvent) {
    const { offsetX, offsetY } = e

    pointerLastX = offsetX
    pointerLastY = offsetY

    let { x, y, w, h } = _selectedArea
    const fireSelectedAreaEvent = selectingArea

    panning = false
    dragRotating = false
    clickRotating = false
    selectingArea = false

    _selectedArea.x = 0
    _selectedArea.y = 0
    _selectedArea.w = 0
    _selectedArea.h = 0

    document.body.style.cursor = ''

    // if the selection is too small, ignore it
    if (fireSelectedAreaEvent && Math.abs(w) > 10 && Math.abs(h) > 10) {
      // normalize the rectangle
      if (w < 0) {
        x += w
        w = x - w - x
      }
      if (h < 0) {
        y += h
        h = y - h - y
      }

      let amount: number
      if (w > h) {
        amount = canvas.width / w
      } else {
        amount = canvas.height / h
      }

      _scale *= amount
      _translateX = (_translateX - x) * amount
      _translateY = (_translateY - y) * amount
    }

    update()
  }

  function onWheelEvent(e: WheelEvent) {
    if (e.cancelable) e.preventDefault()

    const { offsetX: x, offsetY: y } = e
    pointerLastX = x
    pointerLastY = y

    // right click, rotate instead
    if (e.buttons === 2) {
      clickRotating = true

      panning = false
      dragRotating = false
      selectingArea = false

      _selectedArea.x = 0
      _selectedArea.y = 0
      _selectedArea.w = 0
      _selectedArea.h = 0

      // normalize between -PI nad +PI
      // _rotation - Math.PI * 2 * Math.floor((_rotation + Math.PI) / (Math.PI * 2))

      const ROT = Math.PI / (e.shiftKey ? 10 : 100) // 100 is precise
      _rotation += Math.sign(e.deltaY) < 0 ? -ROT : ROT

      update()
    } else {
      const factor = Math.sign(e.deltaY) < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR
      _scale *= factor

      if (zoomMode === 'canvas_center') {
        let x = canvas.width / 2
        let y = canvas.height / 2
        _translateX = x - (x - _translateX) * factor
        _translateY = y - (y - _translateY) * factor
      } else if (zoomMode === 'pointer') {
        _translateX = x - (x - _translateX) * factor
        _translateY = y - (y - _translateY) * factor
      }

      update()
    }
  }

  function onImageClick() {
    //
  }

  // prevent the default browser behavior when clicking
  document.addEventListener(
    'click',
    (e) => {
      // preserve the click on everything that is not an image
      if (e.target === image) {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()

        onImageClick()
      }
    },
    {
      capture: true,
      passive: false
    }
  )

  // disable context menu, right click is the area selection tool
  document.addEventListener(
    'contextmenu',
    (e) => {
      if (!e.shiftKey && e.cancelable) e.preventDefault()
    },
    {
      capture: true,
      passive: false
    }
  )

  function registerEventListeners() {
    const { naturalWidth, naturalHeight } = image

    // fit to center
    _rotation = 0
    _translateX = canvas.width / 2
    _translateY = canvas.height / 2
    _scale = Math.min((canvas.height - 56) / naturalHeight, (canvas.width - 56) / naturalWidth)
    update()

    document.addEventListener('pointerdown', onPointerDownEvent, { passive: false })
    document.addEventListener('pointermove', onPointerMoveEvent, { passive: true })
    document.addEventListener('pointerup', onPointerUpEvent, { passive: true })
    document.addEventListener('wheel', onWheelEvent, { passive: false })

    document.addEventListener('keydown', (e) => {
      // fit to center
      if (e.code === 'Space' || e.code === 'Numpad0') {
        _rotation = 0
        _translateX = canvas.width / 2
        _translateY = canvas.height / 2
        _scale = Math.min((canvas.height - 56) / naturalHeight, (canvas.width - 56) / naturalWidth)
        update()
      }
    })

    // keep the canvas updated with the window size
    window.addEventListener(
      'resize',
      () => {
        const oldW = canvas.width
        const oldH = canvas.height

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        // adjust the position to preserve the translation
        _translateX -= (oldW - canvas.width) / 2
        _translateY -= (oldH - canvas.height) / 2

        update()
      },
      {
        passive: true
      }
    )

    hideMouseWhenIdleTimeout(2400)
  }

  // on chromium, the image at this point is fully loaded
  // the browser have already parsed the image metadata and asserted that it's a valid image
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    registerEventListeners()
  }
  // on firefox, the image is not fully loaded
  else {
    image.addEventListener('load', () => {
      registerEventListeners()
    })
  }
}
