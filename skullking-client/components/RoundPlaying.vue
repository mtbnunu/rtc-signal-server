<template>
  <v-card-text>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="room">
        <div class="container">
          <div class="myBet">
            {{ getBetValue(myId!, props.round) }}
          </div>
          <PlayerTable>
            <template v-slot:append="{ id, profile, isSelf }">
              <v-chip prepend-icon="mdi-circle-multiple" size="large" class="text-h6 ml-2">
                {{ getBetValue(id!, round) }}
              </v-chip>
            </template>
          </PlayerTable>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="player">

        <PlayerList :includeMe="true">
          <template v-slot:append="{ id }">
            <v-fade-transition>
              <div>
                <v-chip v-if="getReadyStatus(id, round)" prepend-icon="mdi-circle-multiple" size="large"
                  class="text-h6">
                  {{ getBetValue(id, round) }}
                </v-chip>
              </div>
            </v-fade-transition>
          </template>
        </PlayerList>
      </v-tabs-window-item>

    </v-tabs-window>
  </v-card-text>



  <ConcurButton :concur="concur" :unconcur="unconcur" :concurredState="concurredState">
    <template v-slot:concur>
      Round Ended
    </template>
    <template v-slot:unconcur>
      Nevermind
    </template>
  </ConcurButton>

  <v-tabs color="primary" fixed-tabs v-model="tab">
    <v-tab value="player">Players</v-tab>
    <v-tab value="room">Room Info</v-tab>
  </v-tabs>

</template>




<script setup lang="ts">
const props = defineProps<{
  round: number
}>()
const emit = defineEmits(['done'])
const { broadcast, onData, useDataListener, isHost, peerConnections, myId } = useConnectionHandler();
const { scorecard, updateBet, getReadyStatus, getBetValue } = useScorecard()
const { me, users } = useProfile()
const { open } = useSnackbar()

const tab = ref()

const peers = computed(() => {
  return Object.keys(peerConnections.value).map(p => {
    return {
      id: p,
      profile: users.value[p]
    }
  })
})


const { concur, unconcur, selfState, getStatusById, concurredState } = useConcur({
  id: `endRound-${props.round}`, onAgree: () => {
    emit('done')
  }, gradePeriodSeconds: 2, gracePeriodMessage: `Round ${props.round} Ended`
})


</script>

<style>
.myBet {
  font-size: 15rem;
  text-align: center;
}
</style>
