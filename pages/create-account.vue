<template>
    
    
    <UContainer>
        <div class="flex flex-col gap-2">
            <UCard style="width: 100%;">
        <h4>
            Account Seed:
        </h4>
        <UTextarea v-model="accountSeed" />
        <UButton type="success" @click="generateAccountSeed">Generate</UButton> 
        <br>
        PublicKey:
        <div class="flex items-center gap-2">
            <UInput
            v-model="account_pk"
            placeholder="Public Key"
            class="flex-1"
            />
            <UButton @click="incrementAccountIndex">+{{ account_pk_index }}</UButton>
        </div>
        <!-- PublicKey: <UInput v-model="account_pk" placeholder="Public Key" /><br><UButton @click="incrementAccountIndex">+ Next Account</UButton> -->
        
        SecretKey: <UInput v-model="account_sk" placeholder="Secret Key" disabled />
   
            Select An Identity:
            <USelect option-attribute="label" v-model="selectedIdentityIndex" :options="selectIdentityOptions" label="Select An Identity" placeholder="Choose one" />
            <small>Identity Index: {{  selectedIdentityIndex   }}</small>
            <br>
            <small>Credential Index: <UButton @click="decreseCredIndex">-</UButton></small> {{ credIndex }}  <UButton @click="incrementCredIndex">+</UButton>  
            <br>
            <UButton type="success" @click="requestAccountCrednetialTx">Request Cred Tx</UButton> 
            <h4>
                Account Credential Tx:
            </h4>
            <div style="max-height: 200px; overflow-y: auto;">
                <pre>{{ cred_tx }}</pre>
            </div>
            

            <UButton type="success" @click="signSubmitAccountCrednetialTx">Sign & Submit Tx</UButton> 
            <br>
            AccountAddress: <UInput v-model="account_address" placeholder="Account Address" />
            <!-- <small><a :href="tx_url" target="_blank">{{ tx_url }}</a></small> -->
         
    </UCard>
</div>
    </UContainer>

</template>
<script setup lang="ts">


import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ConcordiumHdWallet, ConcordiumGRPCWebClient, type IdentityProvider, type CredentialInputNoSeed, type IdentityObjectV1, createCredentialTransactionNoSeed, signCredentialTransaction, getAccountAddress, CredentialRegistrationId } from '@concordium/web-sdk'
import { createCredentialDeploymentKeysAndRandomness, getAccountSigningKey, getCredentialId, getCryptographicParameters, getDefaultTransactionExpiry, sendCredentialDeploymentTransaction, } from '~/utils';
import { computed, onMounted, ref } from 'vue';
const showLoader = useState('showLoader')

const network = 'Testnet';
const cred_tx = ref({})
const accountSeed = ref('')
const account_address = ref('')
const account_pk = ref('')
const account_pk_index = ref(0)
const account_sk = ref('')
const ipList = ref<IdentityProviderWithMetadata[]>([])
const ipListSelected = ref(0)
const accountAddressProxy = ref({})
const selectedIdentityIndex = ref(0)
const credIndex = ref(0)

const nodeAddress = 'https://grpc.testnet.concordium.com';
const nodePort = 20000;
const client = new ConcordiumGRPCWebClient(nodeAddress, nodePort);

const idObjects =  computed(() => {
    const idObjectStr = localStorage.getItem('identity-objects')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects
})


const selectIdentityOptions = computed(() =>{
    console.log("idObjects.value", idObjects.value.length)
    return idObjects.value.map((idObject, idx) => ({
        label: `${idObject.attributeList.chosenAttributes.idDocNo} (${idObject.signature.substr(0, 8)})`,
        value: idx
  }))
})

// Base URL for the wallet proxy.
const walletProxyBaseUrl = 'https://wallet-proxy.testnet.concordium.com';
// Base URL for CCDscan. This is used to link to a submitted transaction.
const ccdscanBaseUrl = 'https://testnet.ccdscan.io';

const selectedIdentityProvider: ComputedRef<IdentityProviderWithMetadata> = computed(() => {
    return ipList.value[ipListSelected.value]
})

// const selectedIdentity = computed(() => {
//     console.log(selectedIdentityIndex.value)
//     return idObjects.value[selectedIdentityIndex.value]
// })

const identityObjectProxy = computed(() => {
    const idObjectStr = localStorage.getItem('identity-objects')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects[0]
})
 

onMounted(async () => {
    const ip_info = await getIdentityProviders()
    localStorage.setItem('ip-info', JSON.stringify(ip_info))
    ipList.value = ip_info


    try{
        const idObjects = JSON.parse(localStorage.getItem('identity-credentials') || '[]')
        if(idObjects.length > 0){
            console.log("idObjects", idObjects)
            credIndex.value = idObjects[idObjects.length - 1].credNumber + 1
        } else {
            credIndex.value = 0
        }
    }catch(e){
        console.error(e)
        credIndex.value = 0
        
    }
    
})

const getIdentityProviders = async (): Promise<IdentityProviderWithMetadata[]> => {
        const response = await fetch(walletProxyBaseUrl + '/v1/ip_info');
        return response.json();
    }
//// 
interface IdentityProviderMetaData {
    issuanceStart: string;
    recoveryStart: string;
    icon: string;
    support: string;
}

type IdentityProviderWithMetadata = IdentityProvider & {
    metadata: IdentityProviderMetaData;
};


const createAccountWithIdentity = async (public_key: string) => {
    const global = await getCryptographicParameters();
    const identityIndex = selectedIdentityIndex.value
    const idSeed = localStorage.getItem('seed-phrase');
    
    const { idCredSec, prfKey, attributeRandomness, blindingRandomness, credentialPublicKeys } =
        createCredentialDeploymentKeysAndRandomness(
            idSeed,
            network,
            selectedIdentityProvider.value.ipInfo.ipIdentity,
            identityIndex,
            credIndex.value,
            public_key
        );

    const credentialInput: CredentialInputNoSeed = {
        revealedAttributes: [],
        idObject: identityObjectProxy.value as unknown as IdentityObjectV1,
        globalContext: global,
        credNumber : credIndex.value,
        ipInfo: selectedIdentityProvider.value.ipInfo,
        arsInfos: selectedIdentityProvider.value.arsInfos,
        attributeRandomness,
        credentialPublicKeys,
        idCredSec,
        prfKey,
        sigRetrievelRandomness: blindingRandomness,
    };
    const expiry = getDefaultTransactionExpiry();
    const credentialTransaction = createCredentialTransactionNoSeed(credentialInput, expiry);
    console.log('Credential Transaction:', credentialTransaction);
    
    const accountAddress = getAccountAddress(credentialTransaction.unsignedCdi.credId);
    console.log(accountAddress);
    accountAddressProxy.value = accountAddress.address

    return {
        credentialTransaction,
        accountAddress, 
    }
}


// const recoverIdentityCredentials = async () => {
    
//     try{
//         const idSeed = localStorage.getItem('seed-phrase');
// // const credNumber = 0; /// 0...20
// const cryptographicParameters = await getCryptographicParameters()
//     let identityCredentials = null // localStorage.getItem('identity-credentials')
//     if(!identityCredentials){
//         identityCredentials = []
//     } else {
//         identityCredentials = JSON.parse(identityCredentials)
//     }
//     for(let i = 0; i < 20; i++){
//         const credId = getCredentialId(idSeed, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, i);
//         try{
//             const accountInfo = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
//             identityCredentials.push(accountInfo)
//         }catch(e){
//             console.error(e)
//         }
//         // accountAddressProxy.value = accountInfo.accountAddress
//     }
//     localStorage.setItem('identity-credentials', JSON.stringify(identityCredentials, (key, value) =>typeof value === "bigint" ? Number(value) : value));
//     }catch(e){
//         console.error(e)
//     }
    
// }



const recoverIdentityCredentials = async () => {
    
    try{
        const idSeed = localStorage.getItem('seed-phrase');
        // const credNumber = 0; /// 0...20
        const cryptographicParameters = await getCryptographicParameters()
        let identityCredentials = []
         
        for(let i = 0; i < 20; i++){
            const credId = getCredentialId(idSeed, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, i);
            try{
                const accountInfo:any = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
                accountInfo['credNumber'] = i;
                accountInfo['identityIndex'] = 0; //hardcoded for now
                accountInfo['status'] = 'confirmed'
                identityCredentials.push(accountInfo)
            }catch(e){
                console.error(e)
            }
            // accountAddressProxy.value = accountInfo.accountAddress
        }
        localStorage.setItem('identity-credentials', JSON.stringify(identityCredentials, (key, value) =>typeof value === "bigint" ? Number(value) : value));
        window.location.reload()
        }catch(e){
            console.error(e)
        }
        
}


/// Account Wallet side

/**
 * Increment the account index
 */
 const incrementAccountIndex = () => {
    account_pk_index.value = account_pk_index.value + 1
    generateAccountKeys()
}

const incrementCredIndex = () => {
    credIndex.value = credIndex.value + 1
}

const  decreseCredIndex = () => {
    if(credIndex.value == 0){
        return 0
    }
    credIndex.value = credIndex.value - 1
}

/**
 * Generate new account seed phrase and store it in local storage
 */
const generateAccountSeed = async () => {
    const mnemonic = generateMnemonic(wordlist, 256);
    localStorage.setItem('account-seed-phrase', mnemonic);
    accountSeed.value = mnemonic
    account_pk_index.value = 0
    generateAccountKeys()
}

/**
 * * Generate a new account wallet and derive the public key and signing key
 */
const generateAccountKeys = () => {
    // generate a new seed phrase for the account wallet
    const accountSeedPhrase = localStorage.getItem('account-seed-phrase') || "birth forget knife tube frame mistake month pair that viable gentle repair casino buzz grid team tenant drip year copy dice steel jaguar fruit"// generateMnemonic(wordlist, 256)
    

    // derive the public key for the account
    const identityProviderIdentity = 0 
    const accountwallet = ConcordiumHdWallet.fromSeedPhrase(accountSeedPhrase, network);
    const publicKey = accountwallet.getAccountPublicKey(
        identityProviderIdentity,  // identity provider index
        0,  // identity index
        account_pk_index.value // credential index
    ).toString('hex');

    
    const signingKey = getAccountSigningKey(accountSeedPhrase, identityProviderIdentity, account_pk_index.value);
    account_pk.value = publicKey
    account_sk.value = signingKey

    account_address.value =""

cred_tx.value = {}
    return {
        publicKey, 
        signingKey
    }
} 

/**
 * Request the account credential transaction from the ID App
 */
const requestAccountCrednetialTx = async () => {
    // const {publicKey }  = generateAccountKeys()

    // request idApp to give me the credential deployment transaction and wallet address
    const { credentialTransaction, accountAddress } =  await createAccountWithIdentity(account_pk.value, account_pk_index.value); 
    cred_tx.value = credentialTransaction;
    account_address.value = accountAddress.address;

    /// 

    let identityCredentials = localStorage.getItem('identity-credentials')
    if(!identityCredentials){
        identityCredentials = []
    } else {
        identityCredentials = JSON.parse(identityCredentials)
    }
    identityCredentials.push({
        "type": "simple",
        "accountAddress": accountAddress.address,
        "accountCredentials": {
            "0": {
            "v": 0,
            "value": {
                "type": "normal",
                "contents": {
                "ipIdentity": 0,
                "credentialPublicKeys": {
                    "threshold": 1,
                    "keys": {
                    "0": {
                        "schemeId": "Ed25519",
                        "verifyKey": account_pk.value
                    }
                    }
                },
                "policy": {
                    "validTo": "202605",
                    "createdAt": "202505",
                    "revealedAttributes": {}
                },
                "credId": credentialTransaction.unsignedCdi.credId,
                "revocationThreshold": 2,
                
                }
            }
            }
        },
        "credNumber": credIndex.value,
        "identityIndex": selectedIdentityIndex.value,
        "status": "in-progress"
    })


    localStorage.setItem('identity-credentials', JSON.stringify(identityCredentials, (key, value) =>typeof value === "bigint" ? Number(value) : value));

    return {
        credentialTransaction, accountAddress
    }
}  

/**
 * Submit New Credential Transaction
 */
const signSubmitAccountCrednetialTx = async () => {
    try{
        showLoader.value = true
         // const  { credentialTransaction, accountAddress } = await requestAccountCrednetialTx();
    
        const credentialTransaction = cred_tx.value
        
        console.log(credentialTransaction)

        
        // Sign the create account credential transaction
        const signature = await signCredentialTransaction(credentialTransaction, account_sk.value);

        // Send the transaction to the network
        const txn = await sendCredentialDeploymentTransaction(credentialTransaction, signature);
        

        showLoader.value = false
        const transactionUrl = `${ccdscanBaseUrl}/?dcount=1&dentity=transaction&dhash=${txn.toString()}`;
        console.log('Transaction URL:', transactionUrl);
        alert('Transaction successfully submitted. Press ok to check the transaction on CCDscan');
        window.open(transactionUrl, "_blank");
        
        recoverIdentityCredentials() 
        

    }catch(e){
        showLoader.value = false
        alert('Error: ' + e.message)
    }
   
}
/////// /////// /////// /////// 

</script>
