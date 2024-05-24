<template>
  <div class="d-flex ga-4 pa-4 justify-space-evenly overflow-x-scroll">
    <v-sheet v-for="peer in everyone" :key="peer.id" border rounded
      class="px-4 py-2 d-flex justify-center flex-wrap ga-2">
      <v-avatar :image="`/characters/${peer.profile?.image}.webp`" size="40"></v-avatar>
      <slot name="append" :id="peer.id" :profile="peer" :isSelf="false"></slot>
    </v-sheet>
  </div>

</template>

<script setup lang="ts">


const { me, users } = useProfile()
const { peerConnections, myId } = useConnectionHandler();

const everyone = computed(() => {
  return [{ profile: me.value, id: myId.value }, ...peers.value]
})

const peers = computed(() => {
  return Object.keys(peerConnections.value).map(p => {
    return {
      id: p,
      profile: users.value[p]
    }
  })
})

</script>
