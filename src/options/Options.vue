<script setup lang="tsx">
import { tryOnScopeDispose, useAsyncState } from '@vueuse/core'
import browser from 'webextension-polyfill'
import UsePermission from '../components/UsePermission.vue'
import { usePermission } from '../composables/usePermission'
import { useSettings } from '../composables/useSettings'

const settings = useSettings()
const { granted, isReady, isLoading, request, remove } = usePermission('storage')
</script>

<template>
  <div>
    <div v-if="isReady">
      <div v-if="granted">
        <p>Storage permission is granted.</p>
        <button @click="remove">
          Request Storage Permission
        </button>
      </div>
      <div v-else>
        <p>Storage permission is not granted.</p>
        <button @click="request">
          Request Storage Permission
        </button>
      </div>
    </div>

    <UsePermission permission="storage" #="{ isReady, remove, request }">
      <div v-if="isReady">
        <div v-if="granted">
          <p>Storage permission is granted.</p>
          <button @click="remove">
            Request Storage Permission
          </button>
        </div>
        <div v-else>
          <p>Storage permission is not granted.</p>
          <button @click="request">
            Request Storage Permission
          </button>
        </div>
      </div>
    </UsePermission>
  </div>
</template>
