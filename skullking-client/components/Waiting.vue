<template>
  <v-tabs bg-color="indigo-darken-2" fixed-tabs v-model="tab">
    <v-tab value="room">Room Info</v-tab>
    <v-tab value="player">Players</v-tab>


  </v-tabs>
  {{ myId }}<br />
  {{ peerConnections }}<br />
  {{ users }}
  <!-- {{ peerConnections }}
  {{ users }} -->
  <v-card-text>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="room">
        <div class="vcenter">
          <div class="container">
            <div class="qrcode">
              <img :src="qrCodeUrl" width="200" height="200" />
            </div>
            <div class="center">
              <v-text-field v-model="shareLink" :append-inner-icon="'mdi-clipboard'" type="text" readonly
                variant="outlined" @click="select"></v-text-field>
            </div>
            <div class="center mt4">
              {{ Object.entries(peerConnections).length + 1 }} person in the room
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="player">

        <v-list-item>
          <template v-slot:prepend>
            <v-avatar :image="`/characters/${me.image}.webp`" size="60"></v-avatar>
          </template>
          ME: {{ me.name }}
        </v-list-item>
        <v-divider />


        <v-list lines="one" block>
          <v-list-item v-for="peer in peers" :key="peer.id">
            <template v-slot:prepend>
              <v-avatar :image="`/characters/${peer.profile?.image}.webp`" size="60"></v-avatar>
            </template>
            {{ peer.profile?.name }}
          </v-list-item>
          <v-divider />

        </v-list>
      </v-tabs-window-item>

    </v-tabs-window>
  </v-card-text>


  <div v-if="isHost">
    <v-btn @click="startgame" :disabled="!closeRoom" block size="x-large" variant="tonal">
      Start Game
    </v-btn>
  </div>
</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"
import { useProfile } from "../composables/useProfile"

const { roomId, peerConnections, isHost, onData, isInitialized, closeRoom, myId } = useConnectionHandler();
const { goto } = useStateMachine()
const tab = ref()

const { open } = useSnackbar()

const shareLink = computed(() => `${window.location.protocol}//${window.location.host}/${roomId.value}`)
const qrCodeUrl = computed(() => `https://quickchart.io/qr?text=${encodeURIComponent(shareLink.value)}&ecLevel=L&margin=2&size=200&format=svg`)

onData((d) => {
  if (d.data?.action === "start") {
    goto("playing")
  }
})


const select = (e) => {
  e.target.select()
  document.execCommand("copy");
  open('Copied to clipboard')
}

const startgame = () => {
  if (closeRoom.value) {
    closeRoom.value()
  }
}

const { users, me } = useProfile()

const peers = computed(() => {
  return Object.keys(peerConnections.value).map(p => {
    return {
      id: p,
      profile: users.value[p]
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
