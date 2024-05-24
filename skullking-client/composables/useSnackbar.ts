const timeout = ref(3000);
const snackbar = ref(false);
const texts = ref<string[]>([]);

export const useSnackbar = () => {
  return {
    timeout,
    snackbar,
    texts,
    open: (_text: string, _timeout: number = 3000) => {
      // snackbar.value = false;
      // setTimeout(() => {
      //   snackbar.value = true;
      // }, 0);
      // texts.value.push(_text);
      // timeout.value = _timeout;
      // setTimeout(() => {
      //   texts.value = texts.value.filter((text) => text !== _text);
      // }, _timeout);
    },
  };
};
