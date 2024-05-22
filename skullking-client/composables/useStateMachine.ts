import Waiting from "~/components/Waiting.vue";
import Initial from "~/components/Initial.vue";

const states = {
  initial: {
    screen: Initial,
  },
  waiting: {
    screen: Waiting,
  },
  join: {},
  playing: {},
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
