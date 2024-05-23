const animals = [
  "bear",
  "bird",
  "cat",
  "deer",
  "dog",
  "elephant",
  "fox",
  "giraffe",
  "hippo",
  "kangaroo",
  "koala",
  "lion",
  "monkey",
  "owl",
  "panda",
  "pig",
  "rabbit",
  "sheep",
  "turtle",
  "zebra",
  "squirrel",
  "penguin",
  "frog",
  "dolphin",
];

const adjectives = [
  "adorable",
  "amazing",
  "amusing",
  "animated",
  "bouncy",
  "bubbly",
  "cuddly",
  "cheerful",
  "charming",
  "chirpy",
  "colorful",
  "dandy",
  "dazzling",
  "delightful",
  "dreamy",
  "energetic",
  "enthusiastic",
  "exciting",
  "fabulous",
  "fancy",
  "fluffy",
  "funny",
  "fuzzy",
  "gentle",
  "glorious",
  "gorgeous",
  "graceful",
  "happy",
  "hilarious",
  "jolly",
  "joyful",
  "jumpy",
  "lively",
  "lovely",
  "luminous",
  "magical",
  "merry",
  "mischievous",
  "neat",
  "nice",
  "perky",
  "playful",
  "pleasant",
  "radiant",
  "shiny",
  "silly",
  "smiley",
  "sparkly",
  "sunny",
  "sweet",
  "twinkly",
  "vibrant",
  "whimsical",
  "witty",
  "affectionate",
  "agreeable",
  "bright",
  "breezy",
  "captivating",
  "carefree",
  "charismatic",
  "chipper",
  "corky",
  "courteous",
  "dynamic",
  "enchanting",
  "flamboyant",
  "glittery",
  "good-natured",
  "grinning",
  "hearty",
  "humorous",
  "idealistic",
  "jaunty",
  "kooky",
  "laughing",
  "lighthearted",
  "likable",
  "lucky",
  "mesmerizing",
  "nimble",
  "optimistic",
  "perceptive",
  "radiating",
  "rollicking",
  "sensational",
  "snazzy",
  "spiffy",
  "spunky",
  "stunning",
  "stupendous",
  "super",
  "tender",
  "tremendous",
  "tricksy",
  "upbeat",
  "vivacious",
  "warmhearted",
  "wonderful",
  "youthful",
  "adoring",
  "appealing",
  "comical",
  "divine",
  "eager",
  "exquisite",
  "fanciful",
  "feisty",
  "glamorous",
  "gracious",
  "huggy",
  "humble",
  "joyous",
  "keen",
  "kind",
  "light",
  "magnetic",
  "marvelous",
  "modest",
  "nifty",
  "peachy",
  "personable",
  "plucky",
  "positive",
  "resplendent",
  "sassy",
  "shimmering",
  "sleek",
  "snappy",
  "sociable",
  "sparkling",
  "splendid",
  "sympathetic",
  "tantalizing",
  "terriffic",
  "ticklish",
  "trendy",
  "trusty",
  "zealous",
];

type profile = { name: string; image: string };

export const getRandom = (arr: Array<string>) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const randomProfile = () => {
  const animal = getRandom(animals);
  const adj = getRandom(adjectives);
  const name = `${adj} ${animal}`;

  console.log(name, animal);

  return { name, image: animal };
};

const users = ref<{ [key: string]: profile }>({});
const me = ref<profile>(randomProfile());
const editing = ref(false);

export const useProfile = () => {
  const { broadcast } = useConnectionHandler();

  return {
    me: computed(() => me.value),
    users: computed(() => users.value),
    editing,
    animals,
    getMyProfile() {
      return me.value;
    },
    getUserProfile(id: string) {
      return users.value[id];
    },
    updateUserProfile(id: string, profile: profile) {
      users.value[id] = profile;
    },
    updateMyProfile(profile: profile) {
      me.value = profile;
      broadcast({ action: "iam", data: me.value });
    },
    openEditProfile() {
      editing.value = true;
    },
  };
};
