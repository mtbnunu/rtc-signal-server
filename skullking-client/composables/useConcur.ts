const secondsRemaining = ref(-1);
const message = ref();

export const useConcur = <T = void, U = void>(options: {
  id: string;
  onAgree: () => void;
  onConcur?: (d: { sourceId: string; data: T }) => void;
  onUnconcur?: (d: { sourceId: string; data: U }) => void;
  gradePeriodSeconds?: number;
  gracePeriodMessage?: string;
}) => {
  message.value = options.gracePeriodMessage;

  const { broadcast, useDataListener, myId, peerConnections, isHost } =
    useConnectionHandler();

  const concurredList = ref<{ [id: string]: boolean }>({});

  useDataListener("concur", (d) => {
    if (d.id === options.id) {
      options.onConcur?.(d);
      concurredList.value[d.sourceId] = true;

      if (concurredList.value[myId.value!]) {
        console.log("1", { allkeys: Object.keys(peerConnections.value) });
        if (
          Object.keys(peerConnections.value).every(
            (id) => concurredList.value[id]
          )
        ) {
          console.log("2");
          startGracePeriod();
        }
      }
    }
  });

  useDataListener("unconcur", (d) => {
    if (d.id === options.id) {
      options.onUnconcur?.(d);
      concurredList.value[d.sourceId] = false;
      cancelGracePeriod();
    }
  });

  useDataListener("grace", (d) => {
    if (d.id === options.id) {
      secondsRemaining.value = d.secondsRemaining;
    }
  });

  useDataListener("finalize", (d) => {
    if (d.id === options.id) {
      options.onAgree();
    }
  });

  const interval = ref();

  const startGracePeriod = () => {
    console.log("startGracePeriod");
    if (isHost.value) {
      if (options.gradePeriodSeconds) {
        secondsRemaining.value = options.gradePeriodSeconds;
        broadcast({
          action: "grace",
          id: options.id,
          secondsRemaining: secondsRemaining.value,
        });
        interval.value = window.setInterval(() => {
          secondsRemaining.value--;
          broadcast({
            action: "grace",
            id: options.id,
            secondsRemaining: secondsRemaining.value,
          });

          if (secondsRemaining.value === 0) {
            broadcast({ action: "finalize", id: options.id });
            window.clearInterval(interval.value);
          }
        }, 1000);
      } else {
        broadcast({ action: "finalize", id: options.id });
      }
    }
  };

  const cancelGracePeriod = () => {
    window.clearInterval(interval.value);
    secondsRemaining.value = -1;
  };

  onBeforeUnmount(() => {
    cancelGracePeriod();
  });

  return {
    concurredState: computed(() => concurredList.value),
    selfState: computed(() => concurredList.value[myId.value!]),
    getStatusById: (id: string) => concurredList.value[id],
    concur: (data: T) => {
      broadcast({ action: "concur", id: options.id, data });
    },
    unconcur: (data: U) => {
      broadcast({ action: "unconcur", id: options.id, data });
    },
  };
};

export const countdown = computed(() => secondsRemaining.value);
export const countdownMessage = computed(() => message.value);
