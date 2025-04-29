<!-- components/SelectableCardList.vue -->
<template>
    <UContainer class="space-y-2 py-3">
      <UCard
        v-for="(item, index) in items"
        :key="index"
        class="cursor-pointer transition-all duration-200"
        :class="selected === index ? 'ring-2 ring-primary' : ''"
        @click="selected = index"
      >
        <p>{{ item.title }}</p>
      </UCard>
    </UContainer>
  </template>
  
  <script setup>
  const items = [
    { title: 'Option 1', description: 'This is the first option.' },
    { title: 'Option 2', description: 'This is the second option.' },
    { title: 'Option 3', description: 'This is the third option.' }
  ]
  
  const selected = ref(null)
  </script>
  