import { createApp } from 'vue'
import css from './main.css?inline'
import App from './Main.vue'

function createImageViewer() {
  // Remove existing styles
  for (const el of Array.from(document.querySelectorAll('link'))) {
    el.parentNode?.removeChild(el)
  }

  // Manually inject the CSS
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // The entire DOM will be discarded and replaced by Vue
  createApp(App).mount(document.body)
}

// Wait until the page is ready
function onInteractive() {
  if (
    // For Firefox, the document may be an ImageDocument
    Object.prototype.toString.call(document) === '[object ImageDocument]'

    // For other browsers, check if the content type is image/
    || document.contentType.startsWith('image/')

    // For chromium-based browsers, check the DOM structure
    || (document.head
      && document.body
      && document.head.childElementCount === 2
      && document.head.children[0].tagName === 'META'
      && document.head.children[1].tagName === 'TITLE'
      && document.head.children[1].textContent
      && document.head.children[1].textContent.endsWith(')')
      && document.body.childElementCount === 1
      && document.body.children[0].tagName === 'IMG')
  ) {
    // detach this event listener, we do not need it anymore
    document.removeEventListener('readystatechange', onInteractive)

    // initialize the image viewer/editor
    createImageViewer()
  }
}

// chrome start from loading, wait until interactive
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', onInteractive)
}
else {
  onInteractive()
}
