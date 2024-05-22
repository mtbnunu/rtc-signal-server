import Waiting from "~/components/Waiting.vue";
import Initial from "~/components/Initial.vue";
import Playing from "~/components/Playing.vue";

const states = {
  initial: {
    screen: Initial,
  },
  waiting: {
    screen: Waiting,
  },
  playing: {
    screen: Playing,
  },
};

const currentStateName = ref<keyof typeof states>("initial");

export const useStateMachine = () => ({
  currentStateName,
  states,
  current: computed(() => states[currentStateName.value]),
  goto: (state: keyof typeof states) => {
    currentStateName.value = state;
  },
});
