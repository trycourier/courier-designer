<template>
  <div ref="containerRef"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { Editor as ReactEditor } from '@trycourier/react-editor'
import * as ReactDOM from 'react-dom/client'
import * as React from 'react'

export default defineComponent({
  name: 'Editor',
  setup() {
    const containerRef = ref<HTMLElement | null>(null)
    let root: ReactDOM.Root | null = null

    onMounted(() => {
      if (containerRef.value) {
        root = ReactDOM.createRoot(containerRef.value)
        root.render(React.createElement(ReactEditor))
      }
    })

    onBeforeUnmount(() => {
      if (root) {
        root.unmount()
      }
    })

    return {
      containerRef
    }
  }
})
</script> 