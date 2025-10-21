<template>
  <UContainer>
    <UHorizontalNavigation :links="links" class="border-b" />
  </UContainer>
</template>
  
  <script setup>
const idLength = computed(() => {
  const idObjectStr = localStorage.getItem("identity-objects");
  let idObjects = [];

  if (idObjectStr) {
    idObjects = JSON.parse(idObjectStr);
  } else {
    idObjects = [];
  }
  return idObjects.length;
});

const idcLength = computed(() => {
  const idObjectStr = localStorage.getItem("identity-credentials");
  let idObjects = [];

  if (idObjectStr) {
    idObjects = JSON.parse(idObjectStr);
  } else {
    idObjects = [];
  }
  return idObjects.length;
});

const links = [
  { label: "Authentication", to: "/authentication" },
  { label: "VerifyId", to: "/idVerification" },
  { label: "Payment", to: "/payment" },
  { label: "CCDPayment", to: "/ccd_payment" },
];
</script>