<template>
  <h1>
    waiting</h1>
  <h1>{{ roomId }}</h1>
  <ul>
    <li v-for="[id, conn] in Object.entries(peerConnections)" :key="id">
      {{ id }}
    </li>
  </ul>
  <div v-if="isHost">
    <button @click="closeRoom">
      Start Game
    </button>
  </div>
</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"

const { roomId, peerConnections, closeRoom, isHost } = useConnectionHandler();
const { goto } = useStateMachine()


</script>
<style></style>
