const scorecard = ref<{
  [id: string]: {
    [round: number]: {
      bet?: number;
      winnings: number;
    };
  };
}>({});

export const useScorecard = () => {
  return {
    scorecard: computed(() => scorecard.value),
    updateBet: (id: string, round: number, bet?: number) => {
      scorecard.value[id] = scorecard.value[id] || {};
      scorecard.value[id][round] = { bet, winnings: 0 };
      console.log("Bet received", { id, round, bet });
      console.log("Scorecard", scorecard.value);
    },
    getReadyStatus: (id: string, round: number) => {
      return (
        !!scorecard.value[id] &&
        !!scorecard.value[id][round] &&
        typeof scorecard.value[id][round].bet !== "undefined"
      );
    },
    getBetValue: (id: string, round: number) => {
      return scorecard.value[id]?.[round]?.bet;
    },
    setWinnings: (id: string, round: number, winnings: number) => {
      scorecard.value[id][round].winnings = winnings;
    },
  };
};
