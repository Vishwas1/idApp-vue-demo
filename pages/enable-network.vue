<template>
  <UContainer>
    <UCard>

      <UContainer>
        <div v-for="chain in chains" :key="chain" class="flex items-center justify-between" style="margin-top: 10px;">
          <span>{{ chain }}</span>
          <UToggle :model-value="toggles[chain]" @update:modelValue="value => onToggle(chain, value)" />
        </div>
      </UContainer>

      <UContainer>
        <UCard>

          <div class="flex items-center justify-between">
            <ul>
              <li>
                PublicKey : {{ publicKey }}
              </li>
              <li>
                WalletAddress: {{ accountAddress }}
              </li>
            </ul>      
          </div>
          <UButton @click="reload" >Reload</UButton>
          <UButton @click="clear" >Clear</UButton>
        </UCard>
      </UContainer>
    </UCard>
  </UContainer>

</template>

<script setup lang="ts">
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { ConcordiumIDAppSDK, ConcordiumIDAppPoup } from "id-app-sdk";
import { ref, watch } from 'vue'
const acWallet = ref<AccountWallet>()
const accountWalletConnect = ref<AccountWalletWC>()
const uri = ref("")
const deeplink = ref("")
const showLoader = useState('showLoader')
const ifConnected = ref(false)
const publicKey = ref(localStorage.getItem('pk'))
const accountAddress = ref(localStorage.getItem('accountAddress'))

const reload = ()=>{
publicKey.value = localStorage.getItem('pk')
accountAddress.value = localStorage.getItem('accountAddress')
}
function useLocalStorage(key, defaultValue) {
  const storedValue = localStorage.getItem(key)
  const data = ref(storedValue ? storedValue : defaultValue)

  // Watch the reactive variable and update localStorage when it changes
  watch(data, (newVal) => {
    localStorage.setItem(key, newVal)
  }, { deep: true })

  return data
}




const clear = () => {
  localStorage.removeItem('pk')
  localStorage.removeItem('accountAddress')
  publicKey.value = ''
  accountAddress.value = ''
}
const chains = ['Ethereum', 'Concordium', 'Bitcoin']
const toggles = reactive(
  chains.reduce((acc, chain) => {
    acc[chain] = false
    return acc
  }, {})
)


function onToggle(chain, value) {

  console.log(`${chain} toggled to: ${value}`)
  // You can add your custom logic here

  toggleNetwork()
  toggles[chain] = value
}


onMounted(async () => {
  // clear()
  showLoader.value = true
  accountWalletConnect.value = new AccountWalletWC();
  await accountWalletConnect.value.initClient()
  await wcConnect()
  showLoader.value = false
  acWallet.value = new AccountWallet(accountWalletConnect.value)
  ConcordiumIDAppPoup.closePopup()
})

watch(
  () => accountWalletConnect.value?.session,
  (newVal, oldVal) => {
    console.log({
      oldVal,
      newVal
    })
    if (newVal != null || newVal != undefined) {
      console.log('Wallect Connect Session Establised ' + newVal?.topic)
      uri.value = ""
      ifConnected.value = true
      ConcordiumIDAppPoup.closePopup()
      toggleNetwork()
    }

    // console.log('User changed', newVal)
  }
)

const toggleNetwork = () => {
  console.log(accountWalletConnect.value?.session)
  if (!accountWalletConnect.value?.session) {
    ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
      onIdAppPopup: openIdapp
    })
    return;
  }

  ConcordiumIDAppPoup.invokeIdAppActionsPopup({
    onCreateAccount,
    onRecoverAccount
  })
}

const wcConnect = async () => {
  if (!accountWalletConnect.value) {
    return
  }
  // showLoader.value = true
  await accountWalletConnect.value.connect(ConcordiumIDAppSDK.chainId)
  // showLoader.value = false
  uri.value = "http://localhost:5173/wallet-connect?encodedUri=" + accountWalletConnect.value.uri;
  deeplink.value = "concordiumidapp://wallet-connect?encodedUri=" + accountWalletConnect.value.uri;
}

// const openIdapp = async () => {
//   console.log('Opening openIdapp..')
//   const width = 400;
//   const height = 700;
//   const top = 0;
//   const left = window.screen.availWidth - width;
//   window.open(uri.value, 'Idapp', `width=${width},height=${height},top=${top},left=${left}`);
// }

const openIdapp = async () => {
  console.log('Opening openIdapp..')
  // On mobile, hand off to the native app:
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = deeplink.value;
  } else {
    // Desktop fallback: show instructions or open a popup for testing
      const width = 400;
      const height = 700;
      const top = 0;
      const left = window.screen.availWidth - width;
      window.open(uri.value, 'Idapp', `width=${width},height=${height},top=${top},left=${left}`);
  }
}

const onCreateAccount = async () => {
  console.log('beefore calling createCCDAccount...')
  const result = await acWallet.value?.createCCDAccount()
  console.log(result)
  console.log('after calling createCCDAccount...')
}

const onRecoverAccount = async () => {
  console.log('Nefore calling recoverCCDAccount...')
  const publicKey = localStorage.getItem('pk')
  if (publicKey) {
    const result = await acWallet.value?.recoverCCDAccount(publicKey)
    localStorage.setItem('accountAddress', result?.account_address)
  } else {
    alert('No pk found')
  }
}

</script>