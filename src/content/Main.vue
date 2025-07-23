<script setup lang="ts">
import { ImageIcon, ImageOff, Maximize, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { computed, ref, useTemplateRef } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useViewportControl } from '../composables/useViewportControl'

const container = useTemplateRef('containerRef')
const content = useTemplateRef('mediaRef')

const { transform, transformMatrix, width, height, area, ...context } = useViewportControl(
  container,
  content,
  {
    padding: 20,
  },
)

const rotationInDeg = computed(() => {
  if (!transformMatrix.value) {
    return 0
  }

  let angle = Math.atan2(transformMatrix.value.b, transformMatrix.value.a)
  angle = angle * (180 / Math.PI)

  // FIXME: the angle sometimes is very close to 0, but not exactly 0
  // this is likely due to rotateExact that try to subtract the current angle
  return Math.abs(angle) < 0.0001 ? 0 : angle
})

const src = location.href
const settings = useSettings()
const hideMouse = ref(false)
const pointerDown = ref(false)
</script>

<template>
  <div
    ref="containerRef"
    class="bg-black size-full relative overflow-hidden bg-center bg-cover before:absolute before:inset-[0] select-none"
    :class="[
      hideMouse ? 'cursor-none' : (pointerDown ? 'cursor-grabbing' : 'cursor-default'),
      settings.bgBlur ? 'before:bg-[#0000009e] before:backdrop-blur-2xl' : '',
    ]"
    :style="{
      backgroundImage: settings.bgImage ? `url(${src})` : '',
      backgroundColor: settings.bgColor,
    }"
  >
    <div class="cursor-move absolute z-10 h-[60px] inset-x-0 top-0" />
    <div class="cursor-move absolute z-10 h-[60px] inset-x-0 bottom-0" />
    <div class="cursor-move absolute z-10 w-[60px] inset-y-0 right-0" />

    <img
      ref="mediaRef"
      :key="`image-${src}`"
      class="absolute top-0 left-0 block p-0 m-0 origin-top-left will-change-transform max-w-[fit-content] max-h-[fit-content]"
      :width="width"
      :height="height"
      :src="src"
      :style="{
        transform,
      }"
    >

    <div class="absolute bottom-0 left-0 p-2 text-xs text-white bg-black/50">
      {{ rotationInDeg === 0 ? '0' : rotationInDeg.toFixed(2) }}°
    </div>

    <div
      v-if="area"
      class="absolute bg-cyan-500/10 border-border border-1"
      :style="{
        left: `${area.x}px`,
        top: `${area.y}px`,
        width: `${area.w}px`,
        height: `${area.h}px`,
      }"
    />

    <div
      v-if="area"
      class="absolute bg-cyan-500/10 border-border border-1"
      :style="{
        left: `${area.x}px`,
        top: `${area.y}px`,
        width: `${area.w}px`,
        height: `${area.h}px`,
      }"
    />

    <div class="absolute inset-y-0 z-50 flex group">
      <div class="-translate-x-full flex flex-col gap-2 transition-transform duration-300 ease-in-out w-[65px] items-center group-hover:translate-x-0">
        <div class="flex-1" />

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="context.zoom(1.1)"
        >
          <ZoomIn class="size-6" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="context.zoom(0.9)"
        >
          <ZoomOut class="size-6" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="context.rotate(-10)"
        >
          <RotateCcw class="size-6" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="context.rotate(10)"
        >
          <RotateCw class="size-6" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="context.centerImage()"
        >
          <Maximize class="size-6" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center p-1.5 text-white transition-colors duration-300 ease-in-out rounded-lg cursor-pointer shrink-0 bg-black/50 size-8 hover:bg-black/80"
          @click="settings.bgImage = !settings.bgImage"
        >
          <ImageOff v-if="settings.bgImage" class="size-6" />
          <ImageIcon v-else class="size-6" />
        </button>

        <div class="flex-1" />
      </div>
    </div>
  </div>
</template>
