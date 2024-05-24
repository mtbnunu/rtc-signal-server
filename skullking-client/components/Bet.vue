<template>
  <v-dialog v-model="betDialog" max-width="600" persistent>
    <v-card prepend-icon="mdi-hand-coin" title="Place your bet">
      <v-card-text>
        <div class="d-flex ga-2 align-center flex-wrap justify-space-evenly pa-4">
          <v-btn v-for="(_, i) in round + 1" :variant="currentBet === i ? 'tonal' : 'outlined'" size="x-large"
            @click="() => selectBet(i)" color="blue">
            {{ i }} </v-btn>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text="Place" block variant="tonal" size="x-large" :disabled="currentBet === null"
          @click="saveAndClose"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <div class="pa-4">
    <v-btn block variant="tonal" v-if="registeredBet !== null" @click="changeMind" size="large" color="warning">Change
      my mind</v-btn>
  </div>

  <PlayerList :includeMe="true">
    <template v-slot:append="{ id }">
      <v-fade-transition mode="out-in">
        <v-chip v-if="getReadyStatus(id, round)" prepend-icon="mdi-check-bold" color="success">
          Ready</v-chip>
        <v-chip v-else prepend-icon="mdi-thought-bubble" color="warning">
          Deciding</v-chip>
      </v-fade-transition>
    </template>
  </PlayerList>
</template>

<script setup lang="ts">

const props = defineProps<{
  round: number
}>()
const emit = defineEmits(['done'])
const { broadcast, onData, useDataListener, isHost, peerConnections, myId } = useConnectionHandler();
const { scorecard, updateBet, getReadyStatus, getBetValue } = useScorecard()
const { open } = useSnackbar()

const { concur, unconcur, } = useConcur<{ bet: number, round: number }, { round: number }>({
  id: 'bet',
  onAgree: () => {
    betDialog.value = false
    emit("done")
  },
  onConcur: (d) => {
    updateBet(d.sourceId, d.data.round, d.data.bet)
  },
  onUnconcur: (d) => {
    updateBet(d.sourceId, d.data.round, undefined)
  },
  gradePeriodSeconds: 3,
  gracePeriodMessage: "Reveal Bets in"
})

const betDialog = ref(true)

const registeredBet = ref<number | null>(null)
const currentBet = ref<number | null>(null)

const selectBet = (bet: number) => {
  currentBet.value = bet;
}

const changeMind = () => {
  unconcur({ round: props.round });
  betDialog.value = true
}

const saveAndClose = () => {
  if (currentBet.value !== null) {
    betDialog.value = false
    registeredBet.value = currentBet.value
    concur({ bet: registeredBet.value, round: props.round });
  }
}


</script>

<style>
/* .revealIn {
  .seconds {
    font-size: 10rem;
  }

  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 11111;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.3;
  pointer-events: none;
  flex-direction: column;
} */
</style>
