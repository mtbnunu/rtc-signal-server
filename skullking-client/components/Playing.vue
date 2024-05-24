<template>
  <div class="center text-h5 ma-4">
    Round {{ round }}
  </div>
  <Bet v-if="phase === 'bet'" :round="round" @done="playPhase()" />
  <RoundPlaying v-if="phase === 'play'" :round="round" @done="scorePhase()" />
  <template v-if="phase === 'score'">

  </template>

</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"
import RoundPlaying from "./RoundPlaying.vue";

const phases = ["bet", "play", "score"]

const round = ref(1)
const phase = ref("bet")

const { roomId, peerConnections, closeRoom, isHost } = useConnectionHandler();
const { goto } = useStateMachine()

const playPhase = () => {
  phase.value = "play"
}

const scorePhase = () => {
  phase.value = "score"
}


</script>
