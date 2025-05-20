<template>
  <div>
    <h1>About Us</h1>
    <p>This is the about page!</p>

    <UButton type="success" @click="wcConnect" :disabled="showLoader">Connect WC</UButton>
    <!-- <UButton type="success" @click="wcApprove" :disabled="!accountWalletConnect?.uri">Approve WC</UButton> -->
    <UButton type="success" @click="openPopup" :disabled="showLoader">Enable CCD</UButton>

    <div v-if="uri">
       <a :href="uri" target="_blank">Open the ID app</a>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { IDAppSDK, invokePopup } from "idapp-app-sdk";

const acWallet = ref<AccountWallet>()
const accountWalletConnect = ref<AccountWalletWC>()
const uri = ref("")
const showLoader = useState('showLoader')

onMounted(async () => {
  showLoader.value = true
  accountWalletConnect.value = new AccountWalletWC();
  await accountWalletConnect.value.initClient()
  showLoader.value = false
  
  acWallet.value = new AccountWallet(accountWalletConnect.value)
})

const openPopup = () => {
  invokePopup({
    onCreateAccount,
    onRecoverAccount
  })
}

const wcConnect = async () => {
  if(!accountWalletConnect.value){
    return
  }
  // showLoader.value = true
  await accountWalletConnect.value.connect(IDAppSDK.chainId)
  // showLoader.value = false
  uri.value = "http://localhost:5173/wallet-connect?encodedUri=" + accountWalletConnect.value.uri;
}

const onCreateAccount = async () => {
  console.log('beefore calling createCCDAccount...')
  await acWallet.value?.createCCDAccount()
  console.log('after calling createCCDAccount...')
}

const onRecoverAccount = async () => {
  console.log('Nefore calling recoverCCDAccount...')
  // acWallet.value?.recoverCCDAccount()
  alert('Method not implemented')
}

</script>