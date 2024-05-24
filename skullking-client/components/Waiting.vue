<template>
  <v-card-text>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="room">
        <div class="vcenter">
          <div class="container">
            <a :href="shareLinkTest" target="_blank">open new</a>
            <div class="qrcode mb-12">
              <img :src="qrCodeUrl" width="200" height="200" />
            </div>
            <div class="center">
              <v-text-field v-model="roomId" :append-inner-icon="'mdi-clipboard'" type="text" readonly label="Room ID"
                variant="outlined" @click="select"></v-text-field>
            </div>
            <div class="center">
              <v-text-field v-model="shareLink" :append-inner-icon="'mdi-clipboard'" type="text" readonly
                label="Direct Link" variant="outlined" @click="select"></v-text-field>
            </div>
            <div class="center mt4">
              {{ Object.entries(peerConnections).length + 1 }} person in the room
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="player">
        <PlayerList :includeMe="true">
          <template v-slot:append="{ id, peer, isSelf }">
            <v-btn icon="$edit" variant="plain" size="small" class="muted" @click="openEditProfile" v-if="isSelf">
            </v-btn>
            <v-fade-transition mode="out-in">
              <v-chip v-if="getStatusById(id)" prepend-icon="mdi-check-bold" color="success">
                Ready</v-chip>
              <v-chip v-else prepend-icon="mdi-minus-circle" color="warning">
                Not Ready</v-chip>
            </v-fade-transition>
          </template>
        </PlayerList>
      </v-tabs-window-item>

    </v-tabs-window>
  </v-card-text>



  <ConcurButton :concur="concur" :unconcur="unconcur" :concurredState="concurredState">
    <template v-slot:concur>
      Ready
    </template>
    <template v-slot:unconcur>
      Cancel Ready
    </template>
  </ConcurButton>


  <v-tabs color="primary" fixed-tabs v-model="tab">
    <v-tab value="room">Room Info</v-tab>
    <v-tab value="player">Players</v-tab>
  </v-tabs>
</template>
<script setup lang="ts">

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"
import { useProfile } from "../composables/useProfile"
const { openEditProfile } = useProfile()
const { roomId, peerConnections, isHost, closeRoom, onConnected, send } = useConnectionHandler();
const { goto } = useStateMachine()

const tab = ref(isHost ? "room" : "player")
watch(isHost, (n, o) => {
  if (n !== o)
    if (n) {
      tab.value = "room"
    } else {
      tab.value = "player"
    }
}, { immediate: true })

const { open } = useSnackbar()

const shareLinkTest = computed(() => `${window.location.protocol}//${window.location.host}/${roomId.value}`)
const shareLink = computed(() => `http://192.168.1.78:3000/${roomId.value}`)
const qrCodeUrl = computed(() => `https://quickchart.io/qr?text=${encodeURIComponent(shareLink.value)}&ecLevel=L&margin=2&size=200&format=svg`)

const select = (e) => {
  e.target.select()
  document.execCommand("copy");
  open('Copied to clipboard')
}

const { concur, unconcur, selfState, getStatusById, concurredState } = useConcur({
  id: 'startgame', onAgree: () => {
    if (isHost) {
      closeRoom()
    }
    goto("playing")
  }, gradePeriodSeconds: 3, gracePeriodMessage: "Game starts in"
})

onMounted(() => {
  //repeat for new connections
  onConnected(() => {
    if (selfState.value) {
      concur()
    }
  })
})

</script>
<style>
.info {
  padding: 1em;
}

.qrcode {
  text-align: center;
  margin-top: 1em;
}

.vcenter {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.mt4 {
  margin-top: 4em;
}


.v-window,
.v-window__container,
.v-window-item {
  height: 100%;
}
</style>
