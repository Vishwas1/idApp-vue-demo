<template>
  <UContainer>
    <UCard>

      <UContainer>
        <div v-for="chain in chains" :key="chain" class="flex items-center justify-between" style="margin-top: 10px;">
          <span>{{ chain }}</span>
          <UToggle :model-value="toggles[chain]" @update:modelValue="value => onToggle(chain, value)" />
        </div>
      </UContainer>

      <!-- <UContainer>
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
      </UContainer> -->
    </UCard>
  </UContainer>

</template>

<script setup lang="ts">
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { ConcordiumIDAppSDK, ConcordiumIDAppPoup, Status, type CreateAccountResponseMsgType, type SignedCredentialDeploymentTransaction } from "id-app-sdk";
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
  }, {}))


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
      toggleNetwork()
    }
  }
)

const toggleNetwork =async () => {
  console.log(accountWalletConnect.value?.session)
  if (!accountWalletConnect.value?.session) {
    console.log('No Wallet Connect Session')
    showLoader.value = true
    await wcConnect()
    showLoader.value = false
    
    ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
      walletConnectUri: accountWalletConnect.value.uri
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
    console.error('WalletConnect client is not initialized')
    ConcordiumIDAppPoup.closePopup()
    return
  }
  await accountWalletConnect.value.connect(ConcordiumIDAppSDK.chainId)
  // uri.value = "http://localhost:5173/wallet-connect?encodedUri=" + wc_uri;
  // deeplink.value = "concordiumidapp://wallet-connect?encodedUri=" + wc_uri;
}


// const connectWalletConnectAndOpenIdApp = async () => {
//   showLoader.value = true
//   await wcConnect()
//   showLoader.value = false
//   // openIdapp()
//   ConcordiumIDAppPoup.closePopup()
// }


// const verifyIfMobile = () => {
//   if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
//     return true
//   } else {
//     return false 
//   }
// }

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
  acWallet.value?.createCCDAccount().then(async (result) => {
    if(!result){
      alert('Error: Could not create account from Idapp')
      return;
    }
    const { create_acc_resp, public_key } = result ; 
    console.log(public_key)
    
    if (create_acc_resp.status == Status.SUCCESS) {
        const resp: CreateAccountResponseMsgType = create_acc_resp.message as CreateAccountResponseMsgType;
        console.log('Recieved account creation response account_address ' + resp.accountAddress)

        console.log('ConcordiumIDAppSDK.signCredentialTransaction ...')

        console.log({
          resp
        })
        
        if(confirm("Signature Request: Please approve to sign the transaction?")){
const signedCreddepTx: SignedCredentialDeploymentTransaction = await acWallet.value?.signTransaction(
          resp.serializedCredentialDeploymentTransaction)
        if(!signedCreddepTx){
          alert('Error: Could generate signature')
          return; 
        }

        console.log({
          signedCreddepTx
        })
        console.log('ConcordiumIDAppSDK.submitCCDTransaction ...')
        const txHash = await acWallet.value?.submitTransaction(signedCreddepTx.credentialDeploymentTransaction, 
        signedCreddepTx.signature)
        console.log({ txHash: txHash?.toString() })

        console.log(result)
        alert(`Account created successfully with address: ${resp?.accountAddress} \n\nTransaction Hash: ${txHash?.toString()}
        ` )
        ConcordiumIDAppPoup.closePopup()
        } else {
          alert('Signature request rejected')
          ConcordiumIDAppPoup.closePopup()
        }
        
    } else {
        throw new Error("")
    }

    // alert('Account created successfully with address: ' + resp?.accountAddress)
    //     ConcordiumIDAppPoup.closePopup()
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
  console.log('Nefore calling recoverCCDAccount...')
  const publicKey = localStorage.getItem('pk')
  if (publicKey) {
    
    // send  the request to recover the account
    acWallet.value?.recoverCCDAccount(publicKey).then(result => {
      console.log(result)
      alert('Account recovered successfully with address: ' + result?.account_address)
      localStorage.setItem('accountAddress', result?.account_address)
      //  we can close the poup here
      ConcordiumIDAppPoup.closePopup()
      //disconnect the wallet connect session
      accountWalletConnect.value?.disconnection()
      
    })

    setTimeout(() => {
      console.log('after calling onRecoverAccount...')
      console.log('Opening Idapp...')
      // open the idapp
      deeplink.value = "concordiumidapp://id-signup";
      uri.value = "http://localhost:5173/id-signup";
      openIdapp()
    }, 2000)
    
  } else {
    alert('No pk found')
  }
}

</script>