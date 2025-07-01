import type { MaybeRefOrGetter, RemovableRef } from '@vueuse/core'
import { tryOnScopeDispose, watchWithFilter } from '@vueuse/core'
import { ref, toRaw, toValue } from 'vue'
import browser from 'webextension-polyfill'

export function useStorageArea<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  validator?: {
    parse: (data: any) => T
  },
) {
  const rawInit: T = toValue(initialValue)
  const data = ref(toValue(initialValue)) as RemovableRef<T>
  const storage = browser.storage.local

  async function read(event?: StorageEvent) {
    if ((event && event.key !== key)) {
      return
    }

    try {
      const rawValue = event ? event.newValue : await storage.get(key).then(data => data[key])
      if (rawValue == null) {
        data.value = rawInit
      }
      else {
        data.value = validator ? validator.parse(rawValue) : rawValue as T
      }
    }
    catch (e) {
      console.error(e)
    }
  }

  const onStorageChange = async (changes: browser.Storage.StorageAreaOnChangedChangesType) => {
    if (key in changes) {
      await read({ key, newValue: changes[key].newValue as any } as StorageEvent)
    }
  }

  browser.storage.local.onChanged.addListener(onStorageChange)

  tryOnScopeDispose(() => {
    browser.storage.local.onChanged.removeListener(onStorageChange)
  })

  read()

  watchWithFilter(
    data,
    async () => {
      try {
        if (data.value == null) {
          await storage.remove(key)
        }
        else {
          browser.storage.local.onChanged.removeListener(onStorageChange)
          await storage.set({ [key]: toRaw(data.value) })
          browser.storage.local.onChanged.addListener(onStorageChange)
        }
      }
      catch (e) {
        console.error(e)
      }
    },
    {
      flush: 'pre',
      deep: true,
    },
  )

  return data
}
