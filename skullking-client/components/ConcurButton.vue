<template>
  <div class="pa-4">
    <div class="concurred">
      <v-avatar v-for="peer in concurredPeers" :image="`/characters/${peer.image}.webp`" :key="peer.image"
        size="30"></v-avatar>
    </div>
    <v-fade-transition mode="out-in">
      <v-btn v-if="selfState" @click="unconcur" block size="large" variant="tonal" color="warning">
        <slot name="unconcur">Cancel</slot>
      </v-btn>
      <v-btn v-else @click="concur" block size="large" variant="tonal" color="primary">
        <slot name="concur">Ready</slot>
      </v-btn>
    </v-fade-transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  concur: () => void
  unconcur: () => void
  concurredState: {
    [id: string]: boolean;
  }
}>()
const { me, users } = useProfile()

const { myId } = useConnectionHandler();
const selfState = computed(() => {
  return props.concurredState[myId.value!]
})

const concurredPeers = computed(() => {
  return Object.entries(props.concurredState).filter(([k, v]) => v).flatMap(([k]) => k).map(x => x === myId.value ? me.value : users.value[x])
})

</script>

<style>
.concurred {
  margin-bottom: -1em;
  text-align: right;

  .v-avatar {
    width: 15px;
  }
}
</style>
