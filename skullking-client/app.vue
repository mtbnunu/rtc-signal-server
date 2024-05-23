<template>
  <v-app>
    <component :is="current.screen" />


    <v-snackbar v-model="snackbar" :timeout="timeout">
      {{ text }}

      <template v-slot:actions>
        <v-btn color="blue" variant="text" @click="hasErr = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useStateMachine } from "./composables/useStateMachine"
import { useSnackbar } from "./composables/useSnackbar"
const { current } = useStateMachine()
const { snackbar, text, timeout } = useSnackbar()
</script>

<style>
.center {
  text-align: center;
}

.container {
  padding: 1em;
  min-width: 350px;
  margin: auto;
}
</style>
