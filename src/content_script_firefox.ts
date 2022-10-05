import { createImageViewer } from './content_script'

// check if the page is an image page
if (Object.prototype.toString.call(document) === '[object ImageDocument]') {
  // initialize the image viewer/editor
  createImageViewer()
}
