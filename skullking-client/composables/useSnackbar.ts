const timeout = ref(3000);
const snackbar = ref(false);
const text = ref("");

export const useSnackbar = () => {
  return {
    timeout,
    snackbar,
    text,
    open: (_text: string, _timeout: number = 3000) => {
      snackbar.value = true;
      text.value = _text;
      timeout.value = _timeout;
    },
  };
};
