<template>
  <h1>
    playing</h1>
  <h1>{{ roomId }}</h1>

</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"

const { roomId, peerConnections, closeRoom, isHost } = useConnectionHandler();
const { goto } = useStateMachine()

</script>
<style></style>
