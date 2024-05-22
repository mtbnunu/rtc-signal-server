<template>
  <div>
    <component :is="current.screen" />
  </div>
</template>

<script setup>
import { useStateMachine } from "./composables/useStateMachine"
const { current } = useStateMachine()
</script>
