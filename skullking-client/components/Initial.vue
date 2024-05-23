<template>
  <div class="container">

    <h1>Skull King Calculator</h1>
    <div>
      <v-btn prepend-icon="$plus" variant="tonal" block @click="host" size="large" :loading="loading">
        Host New Game
      </v-btn>
    </div>

    <div class="or">
      or
    </div>

    <v-text-field v-model="joinRoomId" type="text" single-line variant="outlined" label="Enter Room Code" clearable
      class="roomcode" />
    <v-btn prepend-icon="$next" variant="tonal" block @click="join" :loading="loading" size="large">
      Join

    </v-btn>

  </div>

</template>
<script setup>

import { useConnectionHandler } from "../composables/useConnectionHandler.ts"
import { useStateMachine } from "../composables/useStateMachine.ts"

const route = useRoute();
const router = useRouter();
const prefill = computed(() => {
  return route.path?.split?.("/")?.[1] || ''
})

const { createRoom, joinRoom, onConnected, errorText, broadcast } = useConnectionHandler()
const { goto } = useStateMachine()

const joinRoomId = ref("")
const loading = ref(false)

const { open } = useSnackbar()

const host = async () => {
  loading.value = true;
  const room = await createRoom();
  loading.value = false;
  const iam = useProfile()

  goto('waiting')
}
const join = async () => {
  loading.value = true;
  try {
    await joinRoom(joinRoomId.value)

    // const iam = useProfile()
    // broadcast({ action: "iam", data: iam })

    goto('waiting')
  } catch (e) {
    open(e.message)
    loading.value = false;
    return true;
  }
}


onMounted(() => {
  if (prefill.value) {
    joinRoomId.value = prefill.value
    if (join()) {
      joinRoomId.value = ""
      router.replace({ path: null })
    }
  }
})

</script>
<style scoped>
h1 {
  margin-bottom: 1em;
}

.or {
  text-align: center;
  margin-top: 1em;
  margin-bottom: 1em;
}

.roomcode {

  .v-label {
    width: 100%;
    text-align: center;
  }

  input {
    text-align: center;
  }
}
</style>
