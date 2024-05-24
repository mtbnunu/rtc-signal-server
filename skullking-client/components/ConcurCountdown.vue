<template>
  <v-scale-transition>
    <div class="countdown" v-if="countdown > -1">
      <div class="content">
        {{ countdownMessage }}
        <v-scale-transition mode="out-in">

          <div class="seconds" :key="countdown">
            {{ countdown }}
          </div>

        </v-scale-transition>
      </div>
    </div>
  </v-scale-transition>
</template>

<script setup lang="ts">
import { countdown, countdownMessage } from "../composables/useConcur.ts"

</script>

<style>
.countdown {
  .content {
    background: white;

    width: 20rem;
    height: 20rem;
    border-radius: 50%;
    text-align: center;
    font-weight: bold;
    padding-top: 3rem;
  }

  .seconds {
    margin-top: -2rem;
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
  opacity: 0.8;
  pointer-events: none;
  flex-direction: column;
}
</style>
