<script setup lang="ts">
import { usePermission } from '../composables/usePermission'

const { permission: p } = defineProps<{ permission: string }>()

const permission = usePermission(p)
</script>

<template>
  <slot v-bind="permission" />
</template>
