<template>
    <UContainer>
      <UHorizontalNavigation
        :links="links"
        class="border-b py-4"
      />
    </UContainer>
  </template>
  
  <script setup>
  const links = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' }
  ]
  </script>