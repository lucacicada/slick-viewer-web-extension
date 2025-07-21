<script setup lang="tsx">
import { useSettings } from '../composables/useSettings'

const settings = useSettings()
</script>

<template>
  <div class="h-full p-4">
    <div class="w-full max-w-2xl mx-auto">
      <div class="space-y-2">
        <label>Background Color</label>
        <div>
          <input v-model="settings.bgColor" type="color">
        </div>
      </div>

      <div class="space-y-2">
        <label>
          Background Image
        </label>

        <div class="flex items-center h-6 shrink-0">
          <div class="grid grid-cols-1 group size-4">
            <input v-model="settings.bgImage" type="checkbox" class="col-start-1 row-start-1 bg-white border border-gray-300 rounded-sm appearance-none checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto">
            <svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25" viewBox="0 0 14 14" fill="none">
              <path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path class="opacity-0 group-has-indeterminate:opacity-100" d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label>Blur Background</label>

        <div class="flex items-center h-6 shrink-0">
          <div class="grid grid-cols-1 group size-4">
            <input v-model="settings.bgBlur" type="checkbox" class="col-start-1 row-start-1 bg-white border border-gray-300 rounded-sm appearance-none checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto">
            <svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25" viewBox="0 0 14 14" fill="none">
              <path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path class="opacity-0 group-has-indeterminate:opacity-100" d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
