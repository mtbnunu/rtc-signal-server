<template>
  <template v-if="includeMe">
    <v-list-item>
      <template v-slot:prepend>
        <v-avatar :image="`/characters/${me.image}.webp`" size="60"></v-avatar>
      </template>
      {{ me.name }}
      <template v-slot:append>
        <slot name="append" :id="myId" :profile="me" :isSelf="true"></slot>
      </template>
    </v-list-item>
    <v-divider />
  </template>

  <v-list lines="one" block>
    <v-list-item v-for="peer in peers" :key="peer.id">
      <template v-slot:prepend>
        <v-avatar :image="`/characters/${peer.profile?.image}.webp`" size="60"></v-avatar>
      </template>
      {{ peer.profile?.name }}
      <template v-slot:append>
        <slot name="append" :id="peer.id" :profile="peer" :isSelf="false"></slot>
      </template>
    </v-list-item>
    <v-divider />

  </v-list>
</template>

<script setup lang="ts">


const { me, users } = useProfile()
const { peerConnections, myId } = useConnectionHandler();


const props = defineProps<{
  includeMe?: boolean
}>()

const peers = computed(() => {
  return Object.keys(peerConnections.value).map(p => {
    return {
      id: p,
      profile: users.value[p]
    }
  })
})

</script>
