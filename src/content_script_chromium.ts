import { createImageViewer } from './content_script'

// wait until chrome is ready
function onReadyStateChange() {
  if (
    // dataset.image means this page has already been injected
    document?.documentElement?.dataset.image ||
    (document.head &&
      document.body &&
      document.head.childElementCount === 2 &&
      document.head.children[0].tagName === 'META' &&
      document.head.children[1].tagName === 'TITLE' &&
      document.head.children[1].textContent &&
      document.head.children[1].textContent.endsWith(')') &&
      document.body.childElementCount === 1 &&
      document.body.children[0].tagName === 'IMG')
  ) {
    // detach this event listener, we do not need it anymore
    document.removeEventListener('readystatechange', onReadyStateChange)

    // mark the page as injected
    document.documentElement.dataset.image = ''

    // initialize the image viewer/editor
    createImageViewer()
  }
}

// chrome start from loading, wait until interactive
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', onReadyStateChange)
} else {
  // handle the case when the page for some reason is already loaded
  onReadyStateChange()
}
