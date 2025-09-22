<template>
  <UContainer>
    <UCard>
      <h2>CHOOSE NETWORK</h2>
      <UContainer>
        <div v-for="chain in chains" :key="chain" class="flex items-center justify-between" style="margin-top: 10px;">
          <span>{{ chain }}</span>
          <UToggle :model-value="toggles[chain]" @update:modelValue="value => onToggle(chain, value)" />
        </div>
      </UContainer>
    </UCard>

    <UCard>
  <div class="flex justify-between items-center mb-2">
    <h2>ACTIVE CONNECTIONS ({{ sessions.length }})</h2>
    <button
      class="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
      @click="disconnectAllSessions"
      v-if="sessions.length > 0"
    >
      Disconnect All
    </button>
  </div>

  <UContainer>
    <ul class="divide-y divide-gray-200" style="max-height: 300px; overflow-y: auto;">
      <li
        v-for="pair in sessions"
        :key="pair.topic"
        class="flex justify-between items-center py-3"
      >
        <!-- Left: Metadata -->
        <div class="flex flex-col">
          <span class="text-base font-medium text-white-800">
            {{ pair.peer.metadata?.name || 'Unknown App' }}
          </span>
          <span class="text-sm text-gray-500 whitespace-nowrap">
            <strong>Topic:</strong> {{ pair.topic || 'No Topic' }}
          </span>
          <span class="text-sm text-gray-500 whitespace-nowrap">
            <strong>Public Key:</strong> {{ pair.peer.publicKey || 'No Publickey' }}
          </span>
          <span class="text-sm text-gray-600 whitespace-nowrap">
            <strong>Expires on:</strong> {{ accountWalletConnect.formatExpiryIST(pair.expiry) }}
          </span>
        </div>

        <!-- Right: Disconnect Button -->
        <button
          class="ml-4 px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
          @click="disconnectSession(pair.topic)"
        >
          Disconnect
        </button>
      </li>
    </ul>
  </UContainer>
</UCard>

    <!-- <UCard>
      <h2>ACTIVE PAIRS ({{ pairings.length }})</h2>
    <UContainer>
      <ul class="divide-y divide-gray-200" style="max-height: 300px; overflow-y: auto;">
        <li
          v-for="pair in pairings"
          :key="pair.topic"
          class="flex justify-between items-center py-3"
        >
        <div>

        
          <div class="flex flex-col">
            <span class="text-base font-medium text-white-800">
              {{ pair.peerMetadata?.name || 'Unknown App' }}
            </span>
             
            <span class="text-sm text-gray-500">
              {{ pair.topic || 'No Topic' }}
            </span>
          </div>

  
          <div class="text-sm text-gray-600 whitespace-nowrap">
            Expires on: {{ accountWalletConnect.formatExpiryIST(pair.expiry) }}
          </div>

          </div>
        </li>
      </ul>
    </UContainer>
  </UCard> -->
  </UContainer>

</template>

<script setup lang="ts">
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { ConcordiumIDAppSDK, ConcordiumIDAppPoup, Status, type CreateAccountResponseMsgType, type SignedCredentialDeploymentTransaction } from "@concordium/id-app-sdk";
import { ref, watch } from 'vue'
import type { Network } from '@concordium/web-sdk';
const acWallet = ref<AccountWallet>()
const accountWalletConnect = ref<AccountWalletWC>()
const uri = ref("")
const deeplink = ref("")
const showLoader = useState('showLoader')
const ifConnected = ref(false)
const publicKey = ref(localStorage.getItem('pk'))
const accountAddress = ref(localStorage.getItem('accountAddress'))
const network: Network = 'Testnet'

const reload = () => {
  publicKey.value = localStorage.getItem('pk')
  accountAddress.value = localStorage.getItem('accountAddress')
}


const clear = () => {
  localStorage.removeItem('pk')
  localStorage.removeItem('accountAddress')
  publicKey.value = ''
  accountAddress.value = ''
}

const disconnectAllSessions = async () => {
  await accountWalletConnect.value?.disconnectall()
  window.location.reload()
}

const chains = ['Ethereum', 'Concordium ' + '(' + network + ')' ,  'Bitcoin']
const toggles = reactive(
  chains.reduce((acc, chain) => {
    acc[chain] = false
    return acc
  }, {}))


function onToggle(chain, value) {
  console.log(`${chain} toggled to: ${value}`)
  // You can add your custom logic here
  toggleNetwork()
  toggles[chain] = value
}

const pairings = ref([])
const sessions = ref([])

const disconnectSession = async (topic) => {
  console.log({ topic })
  await accountWalletConnect.value?.disconnection(topic)
  window.location.reload()
}

const formatExpiry = (expiry) => {
  const date = new Date(expiry * 1000) // convert UNIX timestamp to ms
  return date.toLocaleString()
}

onMounted(async () => {
  // clear()
  showLoader.value = true
  accountWalletConnect.value = new AccountWalletWC();
  await accountWalletConnect.value.initClient()
  showLoader.value = false
  acWallet.value = new AccountWallet(accountWalletConnect.value)
  ConcordiumIDAppPoup.closePopup()

  sessions.value = accountWalletConnect.value.getListOfSessions()
  pairings.value = accountWalletConnect.value.getListOfPairing()
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
      toggleNetwork()
    }
  }
)

const toggleNetwork = async () => {
  console.log(accountWalletConnect.value?.session)
  if (accountWalletConnect.value?.getListOfSessions().length == 0) {
    console.log('No Wallet Connect Session')
    showLoader.value = true
    await wcConnect()
    showLoader.value = false

    sessions.value = accountWalletConnect.value.getListOfSessions()
    if(!accountWalletConnect.value.uri){
      alert('Could not connect to wallet connect server, please reload the page and try again in sometime. ')
      return
    }
    
    ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
      walletConnectUri: accountWalletConnect.value.uri
    })
    
    return;
  }

  ConcordiumIDAppPoup.invokeIdAppActionsPopup({
    onCreateAccount,
    onRecoverAccount,
    walletConnectSessionTopic: accountWalletConnect.value?.getListOfSessions()[0]?.topic
  })
  // sessions.value = accountWalletConnect.value.getListOfSessions()
}

const wcConnect = async () => {
  if (!accountWalletConnect.value) {
    console.error('WalletConnect client is not initialized')
    ConcordiumIDAppPoup.closePopup()
    return
  }
  await accountWalletConnect.value.connect(ConcordiumIDAppSDK.chainId.Testnet)
}

const openIdapp = async () => {
  console.log('Opening openIdapp..')
  // On mobile, hand off to the native app:
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    console.log('Opening Idapp on mobile...')
    window.location.href = deeplink.value;
  } else {
    console.log('Opening Idapp on desktop...')
    // Desktop fallback: show instructions or open a popup for testing
    // const width = 400;
    // const height = 700;
    // const top = 0;
    // const left = window.screen.availWidth - width;
    //window.open(uri.value, 'Idapp', `width=${width},height=${height},top=${top},left=${left}`);
  }
}


const onCreateAccount = async () => {
  console.log('beefore calling createCCDAccount...')

  // send  the request to create the account
  acWallet.value?.createCCDAccount(network).then(async (result) => {
    if (!result) {
      alert('Error: Could not create account from Idapp')
      return;
    }
    const { create_acc_resp, public_key } = result;
    console.log(public_key)

    if (create_acc_resp.status == Status.SUCCESS) {
      const resp: CreateAccountResponseMsgType = create_acc_resp.message as CreateAccountResponseMsgType;
      console.log('Recieved account creation response account_address ' + resp.accountAddress)

      console.log('ConcordiumIDAppSDK.signCredentialTransaction ...')

      console.log({
        resp
      })

      if (confirm("Signature Request: Please approve to sign the transaction?")) {
        const signedCreddepTx: SignedCredentialDeploymentTransaction = await acWallet.value?.signTransaction(
          resp.serializedCredentialDeploymentTransaction, network)
        if (!signedCreddepTx) {
          alert('Error: Could generate signature')
          return;
        }

        console.log({
          signedCreddepTx
        })
        console.log('ConcordiumIDAppSDK.submitCCDTransaction ...')
        try{
              const txHash = await acWallet.value?.submitTransaction(signedCreddepTx.credentialDeploymentTransaction,
                  signedCreddepTx.signature, network)
                console.log({ txHash: txHash?.toString() })

                console.log(result)
                    alert(`Account created successfully with address: ${resp?.accountAddress} \n\nTransaction Hash: ${txHash?.toString()}` )
                ConcordiumIDAppPoup.closePopup()
        }catch(e){
          alert(e?.message)
          ConcordiumIDAppPoup.closePopup()
        }
        
      } else {
        alert('Signature request rejected')
        ConcordiumIDAppPoup.closePopup()
      }

    } else {
      console.log(create_acc_resp)
      alert(`Request rejected : ${create_acc_resp?.message?.details} `)
      window.location.reload()
    }
  }).catch(e => {
      ConcordiumIDAppPoup.closePopup()
      console.error('Error creating account:', e)
      alert('Error creating account: ' + e.message)
      window.location.reload()
    })


  setTimeout(() => {
    // open the idapp
    console.log('after calling createCCDAccount...')
    console.log('Opening Idapp...')
    deeplink.value = "concordiumidapp://id-signup";
    uri.value = "http://localhost:5173/id-signup";
    openIdapp()
    console.log('after calling createCCDAccount...')
  }, 2000)


}

const onRecoverAccount = async () => {
  const publicKey = localStorage.getItem('pk')
  if (publicKey) {
    acWallet.value?.recoverCCDAccount(publicKey).then(result => {
      console.log(result)
      alert('Account recovered successfully with address: ' + result?.account_address)
      localStorage.setItem('accountAddress', result?.account_address)
      ConcordiumIDAppPoup.closePopup()
    }).catch(e => {
      ConcordiumIDAppPoup.closePopup()
      console.error('Error recovering account:', e)
      alert('Error recovering account: ' + e.message)
      window.location.reload()
    })

    setTimeout(() => {
      console.log('after calling onRecoverAccount...')
      console.log('Opening Idapp...')      
      deeplink.value = "concordiumidapp://id-signup";
      uri.value = "http://localhost:5173/id-signup";
      openIdapp()
    }, 2000)

  } else {
    alert('No pk found')
  }
}

</script>