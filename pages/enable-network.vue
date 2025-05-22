<template>
  <UContainer>
    <UCard>

      <UContainer>
        <div v-for="chain in chains" :key="chain" class="flex items-center justify-between" style="margin-top: 10px;">
          <span>{{ chain }}</span>
          <UToggle :model-value="toggles[chain]" @update:modelValue="value => onToggle(chain, value)" />
        </div>




        <!-- <UButton type="success" @click="toggleNetwork" :disabled="showLoader">Enable CCD Network</UButton> -->
        <!-- <UToggle v-model="isCCDEnabled" /> -->

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
        </UCard>
      </UContainer>
    </UCard>
  </UContainer>

</template>

<script setup lang="ts">
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { IDAppSDK, invokeOpenIDappPopup, invokePopup, closePopup } from "idapp-app-sdk";
import { ref, watch } from 'vue'
const acWallet = ref<AccountWallet>()
const accountWalletConnect = ref<AccountWalletWC>()
const uri = ref("")
const showLoader = useState('showLoader')
const ifConnected = ref(false)


function useLocalStorage(key, defaultValue) {
  const storedValue = localStorage.getItem(key)
  const data = ref(storedValue ? storedValue : defaultValue)

  // Watch the reactive variable and update localStorage when it changes
  watch(data, (newVal) => {
    localStorage.setItem(key, newVal)
  }, { deep: true })

  return data
}

const publicKey = useLocalStorage('pk', '')
const accountAddress = useLocalStorage('accountAddress', '')


const clear = () => {
  localStorage.removeItem('pk')
  localStorage.removeItem('accountAddress')
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
  closePopup()
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
      closePopup()
      toggleNetwork()
    }

    // console.log('User changed', newVal)
  }
)

const toggleNetwork = () => {
  console.log(accountWalletConnect.value?.session)
  if (!accountWalletConnect.value?.session) {
    invokeOpenIDappPopup({
      onIdAppPopup: openIdapp
    })
    return;
  }

  invokePopup({
    onCreateAccount,
    onRecoverAccount
  })
}

const wcConnect = async () => {
  if (!accountWalletConnect.value) {
    return
  }
  // showLoader.value = true
  await accountWalletConnect.value.connect(IDAppSDK.chainId)
  // showLoader.value = false
  uri.value = "http://localhost:5173/wallet-connect?encodedUri=" + accountWalletConnect.value.uri;
}

const openIdapp = async () => {
  console.log('Opening openIdapp..')
  const width = 400;
  const height = 700;
  const top = 0;
  const left = window.screen.availWidth - width;
  window.open(uri.value, 'Idapp', `width=${width},height=${height},top=${top},left=${left}`);
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