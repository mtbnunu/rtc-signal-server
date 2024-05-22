<template>
  <h1></h1>
  Initial Screen
  <button @click="host">
    Host New Game
  </button>
  <input v-model="joinRoomId" type="text" />
  <button @click="join">
    Join
  </button>
  {{ err }}
</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"

const { createRoom, joinRoom, onConnected } = useConnectionHandler()
const { goto } = useStateMachine()

const err = ref("")

const joinRoomId = ref('')

const host = () => {
  createRoom();
  goto("waiting")
}
const join = async () => {
  err.value = ""
  try {
    joinRoom(joinRoomId.value)
    onConnected(() => {
      console.log("JOINED")
      goto("waiting")
    })
  }
  catch (e) {
    err.value = "Failed to join room"
  }
}
</script>
<style></style>
