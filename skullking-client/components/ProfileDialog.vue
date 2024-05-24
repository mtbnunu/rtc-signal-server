<template>
  <v-dialog v-model="editProfileDialog" max-width="600">


    <v-card prepend-icon="mdi-account" title="Pick your profile">
      <v-card-text>

        <div class="d-flex ga-4 align-center ">
          <v-avatar :image="`/characters/${current.image}.webp`" size="60"></v-avatar>
          <v-text-field v-model="current.name" label="Name"> </v-text-field>
        </div>
        <div class="d-flex flex-wrap justify-center">
          <v-avatar v-for="animal in animals" :key="animal" :image="`/characters/${animal}.webp`" size="60"
            class="ma-2 center" :class="{ 'selected': animal === current.image }"
            @click="() => current.image = animal"></v-avatar>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn text="Close" variant="plain" @click="editProfileDialog = false"></v-btn>

        <v-btn color="primary" text="Save" variant="tonal" @click="saveAndClose"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script setup>
const { editing: editProfileDialog, me, animals, updateMyProfile } = useProfile()

const current = ref({
  name: me.value.name,
  image: me.value.image
})

const saveAndClose = () => {
  updateMyProfile(current.value)
  editProfileDialog.value = false
}

</script>

<style>
.selected {
  outline: solid 3px #fff;
  box-shadow: 0px 0px 0px 5px #878787 !important;
}
</style>
