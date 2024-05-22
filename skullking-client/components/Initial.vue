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

const route = useRoute();
const prefill = computed(() => {
  return route.path?.split?.("/")?.[1] || ''
})

const { createRoom, joinRoom, onConnected, errorText } = useConnectionHandler()
const { goto } = useStateMachine()

const err = ref("")
const joinRoomId = ref("")

const host = () => {
  createRoom();
  goto("waiting")
}
const join = async () => {
  err.value = ""
  const to = setTimeout(() => {
    err.value = "no man";
    joinRoomId.value = ""
  }, 3000)
  joinRoom(joinRoomId.value)
  onConnected(() => {
    clearTimeout(to)
    console.log("JOINED")
    goto("waiting")
  })
}

onMounted(() => {
  if (prefill.value) {
    joinRoomId.value = prefill.value
    join()
  }
})

</script>
<style></style>
