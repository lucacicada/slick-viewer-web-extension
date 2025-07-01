import { tryOnScopeDispose, useAsyncState } from '@vueuse/core'
import browser from 'webextension-polyfill'

export function usePermission(permission: string) {
  const { state, isReady, isLoading, executeImmediate } = useAsyncState(
    async () => {
      return await browser.permissions.contains({ permissions: [permission] })
    },
    true,
  )

  function onPermissionAdded(_permissions: browser.Permissions.Permissions) {
    executeImmediate()
  }
  function onPermissionRemoved(_permissions: browser.Permissions.Permissions) {
    executeImmediate()
  }

  browser.permissions.onAdded.addListener(onPermissionAdded)
  browser.permissions.onRemoved.addListener(onPermissionRemoved)

  tryOnScopeDispose(() => {
    browser.permissions.onAdded.removeListener(onPermissionAdded)
    browser.permissions.onRemoved.removeListener(onPermissionRemoved)
  })

  return {
    granted: state,
    isReady,
    isLoading,
    request: () => browser.permissions.request({ permissions: [permission as any] }),
    remove: () => browser.permissions.remove({ permissions: [permission as any] }),
  }
}
