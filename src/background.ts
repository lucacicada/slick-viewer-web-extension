import browser from 'webextension-polyfill'

updateActionIcon()

browser.runtime.onInstalled.addListener(updateActionIcon)
browser.runtime.onStartup.addListener(updateActionIcon)
browser.storage.local.onChanged.addListener(async (changes) => {
  if ('enabled' in changes) {
    await setActionIcons(changes.enabled.newValue !== false)
  }
})

async function updateActionIcon() {
  const { enabled } = await browser.storage.local.get('enabled')
  return await setActionIcons(enabled !== false)
}

async function setActionIcons(enabled: boolean) {
  return await browser.action.setIcon({
    path: {
      16: browser.runtime.getURL(`icon/${enabled ? '' : 'gray/'}16.png`),
      32: browser.runtime.getURL(`icon/${enabled ? '' : 'gray/'}32.png`),
      48: browser.runtime.getURL(`icon/${enabled ? '' : 'gray/'}48.png`),
      96: browser.runtime.getURL(`icon/${enabled ? '' : 'gray/'}96.png`),
      128: browser.runtime.getURL(`icon/${enabled ? '' : 'gray/'}128.png`),
    },
  })
}
