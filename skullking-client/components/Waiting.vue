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
    <button @click="startgame">
      Start Game
    </button>
  </div>
</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"

const { roomId, peerConnections, closeRoom, isHost, onData } = useConnectionHandler();
const { goto } = useStateMachine()

onData((d) => {
  if (d.data?.action === "start") {
    goto("playing")
  }
})

const startgame = () => {
  closeRoom()
}

</script>
<style></style>
