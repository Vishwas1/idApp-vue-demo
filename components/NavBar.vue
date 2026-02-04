<template>
    <UContainer>
      <UHorizontalNavigation
        :links="links"
        class="border-b"
      />
    </UContainer>
  </template>
  
  <script setup>
  const idLength = computed(() => {
    const idObjectStr = localStorage.getItem('identity-objects')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects.length
})



const idcLength = computed(() => {
    const idObjectStr = localStorage.getItem('identity-credentials')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects.length
})

  const links = [
    
    { label: 'Enable Network ', to: '/enable-network-mainnet' },
    { label: 'Enable Network (Testnet)', to: '/enable-network-testnet' },
    { label: 'SDK Managed', to: '/sdk-managed' },
    { label: 'Merchant Managed', to: '/merchant-managed' },
    // { label: 'Create ID', to: '/create-identity' },
    // { label: 'IDs (' + idLength.value + ')', to: '/your-ids' },
    // { label: 'Create Account', to: '/create-account' },
    // { label: 'ID Credentials (' + idcLength.value + ')', to: '/your-id-creds' },
  ]
</script>