<template>
    <!-- <UContainer class="d-flex w-100">
        <UCard class="card left-card mr-2">
            <h1 class="text-2xl font-bold">Create Identity</h1>
            <p class="text-gray-600">Create a new identity with the selected identity provider.</p>
            
            
        </UCard>

        <UCard class="card right-card">
            
            <h1 class="text-2xl font-bold">Create Identity</h1>
            <p class="text-gray-600">Create a new identity with the selected identity provider.</p>
            
        </UCard>

    </UContainer> -->
    <UContainer>
        <div class="flex items-center gap-0">
            <UCard style="width: 100%;">
            <!-- <UButton @click="showPopup" type="danger" class="">Open Popup</UButton> -->
                IDP Seed:

                <UTextarea v-model="seed" />
                <UButton type="success" @click="generateSeed" :disabled="showLoader">Generate</UButton> 
                <!-- <UButton :disabled="isSeed" type="success" @click="revocerSeed">Recover</UButton>-->

                <br><br>
                <h4 v-if="ipList.length > 0">
                Select an IDP:
                </h4>
                <!-- <div class="flex items-center gap-2">
                        <UCard v-for="idp in ipList" v-bind:key="idp.ipInfo.ipIdentity" @click="createIdentity(idp)" style="cursor: pointer;"> 
                            <img :src="'data:image/png;base64,'+idp.metadata.icon" style="width: 50px;height: 50px;">    {{ idp.ipInfo.ipDescription.name }}
                        </UCard>
                </div> -->
                <USelect 
                    v-model="ipListSelected"
                    :options="ipList.map((idp, idx) => { return { label: idp.ipInfo.ipDescription.name, value: idx } })"
                    label="Select Identity Provider" />

                <UButton  label="Create Identity" @click="createIdentity" :disabled="showLoader" />   
                / <UButton  label="Recover Identity" @click="recoverIDApp" :disabled="showLoader" />   
            </UCard>    
            <!-- <UCard style="width: 38%;">
                <h1 class="text-2xl font-bold">Your IDs ({{ idLength  }})</h1>
                <MyIds/>
            </UCard>     -->
        </div>
  </UContainer>
</template>


            
            
            
         

<script setup lang="ts">


import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { type Network, ConcordiumHdWallet, ConcordiumGRPCWebClient, TransactionExpiry, type IdentityProvider, type CredentialInputNoSeed, type CryptographicParameters, type IdentityRequestWithKeysInput, type IdObjectRequestV1, type Versioned, createIdentityRequestWithKeys, type IdentityObjectV1, createCredentialTransactionNoSeed, createIdentityRecoveryRequestWithKeys, type IdentityRecoveryRequestInput, createIdentityRecoveryRequest, type IdentityRecoveryRequestWithKeysInput, type IdRecoveryRequest, CredentialRegistrationId, signCredentialTransaction, getAccountAddress } from '@concordium/web-sdk'
import { IdentityProviderIdentityStatus, type IdentityTokenContainer } from '~/types';
import { createCredentialDeploymentKeysAndRandomness, getAccountSigningKey, getCredentialId, getCryptographicParameters, getDefaultTransactionExpiry, getRedirectUri, loop, sendCredentialDeploymentTransaction, sendIdentityRecoveryRequest } from '~/utils';
import { identityIndex } from '~/constants';
import { computed } from 'vue';
import MyIds from '~/components/MyIDs.vue'
// import { showPopup } from '~/idapp-sdk/idapp-sdk';



const showLoader = useState('showLoader')

const network: unknown = 'Testnet';
const route = useRoute()
const cred_tx = ref({})
const accountSeed = ref('')
const account_address = ref('')
const account_pk = ref('')
const account_pk_index = ref(0)
const account_sk = ref('')
const queryParams = ref({})
const identityObjectUrl = ref('')
const identityObjectProxy = ref(null)
const seed = ref('')
const isSeed = ref(false)
const loading = ref(false)
const ipList = ref<IdentityProviderWithMetadata[]>([])
const ipListSelected = ref(0)
const accountAddressProxy = ref({})


 const mainnet = {
  genesisHash: '9dd9ca4d19e9393877d2c44b70f89acbfc0883c2243e5eeaecc0d1cd0503f478',
  name: 'Concordium Mainnet',
  walletProxyBaseUrl: 'https://wallet-proxy.mainnet.concordium.software',
  grpcPort: 20000,
  grpcUrl: 'https://grpc.mainnet.concordium.software',
  ccdScanUrl: 'https://ccdscan.io/',
}

 const testnet  = {
  genesisHash: '4221332d34e1694168c2a0c0b3fd0f273809612cb13d000d5c2e00e85f50f796',
  name: 'Concordium Testnet',
  walletProxyBaseUrl: 'https://wallet-proxy.testnet.concordium.com',
  grpcPort: 20000,
  grpcUrl: 'https://grpc.testnet.concordium.com',
  ccdScanUrl: 'https://testnet.ccdscan.io/',
}



// const worker = new Worker(new URL('workers/identity.worker.js', 'http://localhost:3000'));
const nodeAddress = network == 'Mainnet'? mainnet.grpcUrl : testnet.grpcUrl // 'https://grpc.testnet.concordium.com';
const nodePort = network == 'Mainnet'? mainnet.grpcPort : testnet.grpcPort;
// Base URL for the wallet proxy.
const walletProxyBaseUrl = network == 'Mainnet'? mainnet.walletProxyBaseUrl : testnet.walletProxyBaseUrl;  //'https://wallet-proxy.testnet.concordium.com';
// Base URL for CCDscan. This is used to link to a submitted transaction.
const ccdscanBaseUrl = network == 'Mainnet'? mainnet.ccdScanUrl : testnet.ccdScanUrl //'https://testnet.ccdscan.io';

console.log({nodeAddress})
const client = new ConcordiumGRPCWebClient(nodeAddress, nodePort);

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

const clearStorage = () => {
    localStorage.clear()
}


onMounted(async () => {
    showLoader.value = true
    const ip_info = await getIdentityProviders()
    showLoader.value = false
    localStorage.setItem('ip-info', JSON.stringify(ip_info))
    ipList.value = ip_info
})

/// ID Wallet
const generateSeed = async () => {
    clearStorage()
    const mnemonic = generateMnemonic(wordlist, 256);
    localStorage.setItem('seed-phrase', mnemonic);
    seed.value = mnemonic
    isSeed.value = true
}


const revocerSeed = async () => {
    const mnemonic = seed.value

    const isValid = validateMnemonic(mnemonic, wordlist);
    localStorage.setItem('seed-phrase', mnemonic);
    console.log(isValid);

    if (isValid) {
        console.log('Valid seed phrase');
        isSeed.value = true
    } else {
        console.log('Invalid seed phrase');
        isSeed.value = false
    }
    // const ip_info = await getIdentityProviders()
    // ipList.value = ip_info
    // localStorage.setItem('ip-info', JSON.stringify(ip_info))
}
/////// /////// /////// /////// 

/// IDP
const getIdentityProviders = async (): Promise<IdentityProviderWithMetadata[]> => {
        const response = await fetch(walletProxyBaseUrl + '/v1/ip_info');
        return response.json();
    }

const fetchIdentity = async (identityObjectUrl: string): Promise<IdentityObjectV1> => {
    const intervalMs = 5000;
    return new Promise(async (resolve, reject) => {
        await loop(intervalMs, async () => {
            try {
                const response = (await (await fetch(identityObjectUrl)).json()) as IdentityTokenContainer;
                if (IdentityProviderIdentityStatus.Done === response.status) {
                    resolve(response.token.identityObject.value);
                    return false;
                } else if (IdentityProviderIdentityStatus.Error === response.status) {
                    reject(response.detail);
                    return false;
                } else {
                    return true;
                }
            } catch {
                return true;
            }
        });
    });
}
const selectedIdentityProvider: ComputedRef<IdentityProviderWithMetadata> = computed(() => {
    return ipList.value[ipListSelected.value]
})


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


/////// /////// /////// /////// 

/// ID App side
const determineAnonymityRevokerThreshold = (anonymityRevokerCount: number) => {
    return Math.min(anonymityRevokerCount - 1, 255);
}

const sendIdentityRequest = async (idObjectRequest: Versioned<IdObjectRequestV1>, baseUrl: string) => {
    try {
        
        const params = {
            scope: 'identity',
            response_type: 'code',
            redirect_uri: getRedirectUri(),
            state: JSON.stringify({ idObjectRequest }),
        };

        const searchParams = new URLSearchParams(params);
        const url = `${baseUrl}?${searchParams.toString()}`;
        const response = await fetch(url);

        // The identity creation protocol dictates that we will receive a redirect.
        // If we don't receive a redirect, then something went wrong at the identity
        // provider's side.
        if (!response.redirected) {
            throw new Error('The identity provider did not redirect as expected.');
        } else {
            return response.url;
        }
    } catch (e) {
        console.log(e.message);
        alert('An error occurred while sending the identity request. Maybe identity exists already. Try Recover Account');
        return null;
    } 
}

const getLatestIdentityIndex = () => {
    const idObjectStr = localStorage.getItem('identity-objects')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects.length
}

const getLatestCredentialNumber = () => {
    if(localStorage.getItem('cred-number') == null){
        localStorage.setItem('cred-number', '0')
    }
    const index = parseInt(localStorage.getItem('cred-number') || '0')
    localStorage.setItem('cred-number', (index + 1).toString())
    return index
}

const createIdentity = async () => {
    try {

        showLoader.value = true
        const wallet = ConcordiumHdWallet.fromSeedPhrase(seed.value, network);
        const identityProviderIndex = selectedIdentityProvider.value.ipInfo.ipIdentity
        
        
        const identityIndex = idLength.value // getLatestIdentityIndex()

        const idCredSec = wallet.getIdCredSec(identityProviderIndex, identityIndex).toString('hex');
        const prfKey = wallet.getPrfKey(identityProviderIndex, identityIndex).toString('hex');
        const cryptographicParameters = await client.getCryptographicParameters();
        const blindingRandomness = wallet
            .getSignatureBlindingRandomness(identityProviderIndex, identityIndex)
            .toString('hex');
        const identityRequestInput: IdentityRequestWithKeysInput = {
            arsInfos: selectedIdentityProvider.value.arsInfos,
            arThreshold: determineAnonymityRevokerThreshold(Object.keys(selectedIdentityProvider.value.arsInfos).length),
            ipInfo: selectedIdentityProvider.value.ipInfo,
            globalContext: cryptographicParameters,
            idCredSec,
            prfKey,
            blindingRandomness,
        };
        console.log("...........trying to create identity request");

        // Blocking Code must run in webworker
        const idReq: Versioned<IdObjectRequestV1> = createIdentityRequestWithKeys(identityRequestInput)
        const url = await sendIdentityRequest(idReq, selectedIdentityProvider.value.metadata.issuanceStart);
        if (url == null) {
            alert('An error occurred while sending the identity request. Maybe identity exists already. Try Recover Account');
            return;
        }
        if (!url?.includes(getRedirectUri())) {
            window.open(url,"_blank");
        } else {
            window.alert('An error occurred during the identity creation.');
        }
    } catch (e) {
        console.log(e);
    } finally {
        showLoader.value = false
    }
}

watch(() => route.fullPath, () => {
    seed.value = localStorage.getItem('seed-phrase') || ''
    isSeed.value = seed.value.length > 0
    if (isSeed.value) {
        revocerSeed()
    }
    // // Parse the query parameters every time the route changes
    // queryParams.value = Object.fromEntries(new URLSearchParams(route.fullPath).entries())
    // if (queryParams.value["/demo#code_uri"]) {
    //     identityObjectUrl.value = queryParams.value["/demo#code_uri"]
    //     fetchIdentity(identityObjectUrl.value).then((identityObject) => {
    //         console.log('Identity Object:', identityObject);
    //         localStorage.setItem('identity-object', JSON.stringify(identityObject));
    //         identityObjectProxy.value = identityObject
    //         // Handle the identity object as needed
    //     }).catch((error) => {
    //         console.error('Error fetching identity object:', error);
    //     });
    // }

}, { immediate: true })

const recoverIDApp = async (public_key) => {
    showLoader.value = true
    revocerSeed();

    const a = recoverIdentity()
    // const b = recoverIdentityCredentials()
    Promise.all([a]).then(() => {
        showLoader.value = false
        // window.location.reload()
        const t = JSON.parse(localStorage.getItem('identity-objects') || '[]')
        let m; 
        if(t.length > 0){
            m = 'Recovery successful. You can now create account with the recovered identity.'
            
        } else {
            m = 'No identity found to recover for IDP' + selectedIdentityProvider.value.metadata.support + '. Please check your seed and try again.'
        }
        console.log(m)
        alert(m)
    }).catch((e) => {
        console.error(e)
        showLoader.value = false
    })

    // await recoverIdentity()
    // await recoverIdentityCredentials()
    // showLoader.value = false
    // window.location.reload()
}


// function getSeedHex() {
//     return Buffer.from(mnemonicToSeedSync(seed.value)).toString('hex');
// }

function getSeedHex() {
  const seedBytes = mnemonicToSeedSync(seed.value); // returns Uint8Array
  return Array.from(seedBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function mnemonicToHex(mnemonic) {
  // mnemonicToSeedSync returns a Uint8Array in the browser
  const seedBytes = mnemonicToSeedSync(mnemonic);

  // convert Uint8Array → hex string
  return Array.from(seedBytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Recover from IDP
const recoverIdentity = async () => {
    loading.value = false
    const identityProviderIndex = selectedIdentityProvider.value.ipInfo.ipIdentity
    
    
    // const identityIndex = 0 /// 0...infinity
    const cryptographicParameters = await getCryptographicParameters()
    let identityObjects = []
    
    // localStorage.getItem('identity-objects')
    //     if(!identityObjects){
    //         identityObjects = []
    //     } else {
    //         identityObjects = JSON.parse(identityObjects)
    //     }
        const wallet = ConcordiumHdWallet.fromSeedPhrase(seed.value, network);
        const seedHex = mnemonicToHex(seed.value)

        console.log({
            seedHex
        })

        


        // Buffer.from(mnemonicToSeedSync(seed.value).toString('hex'))

        for(let identityIndex = 0; identityIndex <= 21; identityIndex++){

           
        
                // ID wallet (from id seed)
                //const idCredSec = wallet.getIdCredSec(identityProviderIndex, identityIndex).toString('hex');
                 
                // const identityRequestInput: IdentityRecoveryRequestWithKeysInput = {
                //     idCredSec,
                //     ipInfo: selectedIdentityProvider.value.ipInfo,
                //     globalContext: cryptographicParameters,
                //     timestamp: Math.floor(Date.now() / 1000),
                // };
                const identityRequestInput: IdentityRecoveryRequestInput = {
                    ipInfo: selectedIdentityProvider.value.ipInfo,
                    globalContext: cryptographicParameters,
                    timestamp: Math.floor(Date.now() / 1000),
                    seedAsHex: seedHex,
                    net: network, 
                    identityIndex: identityIndex,
                }

                console.log({identityRequestInput})

                console.log("...........trying to create identity recovery request for identityIndex: " + identityIndex);
                const idRecoveryRequest = createIdentityRecoveryRequest(identityRequestInput);
    
                const searchParams = new URLSearchParams({
                    state: JSON.stringify({ idRecoveryRequest }),
                });
                const url =  `${selectedIdentityProvider.value.metadata.recoveryStart}?${searchParams.toString()}`;
                
                
                // const identityRecoveryRequest: Versioned<IdRecoveryRequest> = createIdentityRecoveryRequestWithKeys(identityRequestInput)

                    


            try{
                // const url = await sendIdentityRecoveryRequest(identityRecoveryRequest, selectedIdentityProvider.value.metadata.recoveryStart);
                
                    // console.log({
                    //     identityProviderIndex, 
                    //     identityIndex,
                    //     // idCredSec,
                    //     idCredPub: idRecoveryRequest.value.idCredPub,
                    //     proof: idRecoveryRequest.value.proof,
                    //     timestap: idRecoveryRequest.value.timestamp,
                    //     callurl,
                    // })
                
                const response = await fetch(url);
                if (response.ok) {
                    const identity = await response.json();
                    identityObjects.push(identity.value)
                    //identityObjectProxy.value = identity.value
                } else {
                    console.error('Failed to recover identity:', response.statusText);
                }
            }catch(e){
                console.error(e)
                console.log('continuing... identityIndex = ' + identityIndex)
            }
            
        }


    localStorage.setItem('identity-objects', JSON.stringify(identityObjects, (key, value) =>typeof value === "bigint" ? Number(value) : value));

    
    
    
 }

// // Recover form blockhain
// const recoverIdentityCredentials = async () => {
//     loading.value = false
//     // const credNumber = 0; /// 0...20
//     const cryptographicParameters = await getCryptographicParameters()
//     let identityCredentials = localStorage.getItem('identity-credentials')
//     if(!identityCredentials){
//         identityCredentials = []
//     } else {
//         identityCredentials = JSON.parse(identityCredentials)
//     }
//     for(let i = 0; i < 20; i++){
//         const credId = getCredentialId(seed.value, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, i);
//         const accountInfo = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
//         identityCredentials.push(accountInfo)
//         // accountAddressProxy.value = accountInfo.accountAddress
//     }
// }


const recoverIdentityCredentials = async () => {
    
    try{
        const idSeed = seed.value
        // const credNumber = 0; /// 0...20
        const cryptographicParameters = await getCryptographicParameters()
        let identityCredentials = []
        //localStorage.getItem('identity-credentials')
        // if(!identityCredentials){
        //     identityCredentials = []
        // } else {
        //     identityCredentials = JSON.parse(identityCredentials)
        // }01...5...10
        for(let i = 0; i < 20; i++){
            const credId = getCredentialId(idSeed, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, i);
            console.log('Trying to recover credId: ' + credId)
            try{
                const accountInfo: any = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
                accountInfo['credNumber'] = i;
                accountInfo['identityIndex'] = i; //hardcoded for now
                accountInfo['status'] = 'confirmed'
                identityCredentials.push(accountInfo)
            }catch(e){
                console.error(e)
            }
            // accountAddressProxy.value = accountInfo.accountAddress
        }
        localStorage.setItem('identity-credentials', JSON.stringify(identityCredentials, (key, value) =>typeof value === "bigint" ? Number(value) : value));
        }catch(e){
            console.error(e)
        }
        
}

// const searchAccountAddressinLocal = (public_key, credNumber) => {
//     return {
//         accountAddressProxy
//     }
// }


const createAccountWithIdentity = async (public_key: string, credNumber: number = 0) => {
    const global = await getCryptographicParameters();
    const identityIndex = 0
    // const credNumber = 0
    const idSeed = seed.value
    
    console.log('Account Seed:', idSeed);
    console.log({credNumber})

    
    const { idCredSec, prfKey, attributeRandomness, blindingRandomness, credentialPublicKeys } =
        createCredentialDeploymentKeysAndRandomness(
            // seed.value,
            idSeed,
            network,
            selectedIdentityProvider.value.ipInfo.ipIdentity,
            identityIndex,
            credNumber,
            public_key
        );
    console.log({ idCredSec, prfKey, attributeRandomness, blindingRandomness, credentialPublicKeys });
    const credentialInput: CredentialInputNoSeed = {
        revealedAttributes: [],
        idObject: identityObjectProxy.value as unknown as IdentityObjectV1,
        globalContext: global,
        credNumber,
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
/////// /////// /////// /////// 



/// Account Wallet side

/**
 * Increment the account index
 */
const incrementAccountIndex = () => {
    account_pk_index.value = account_pk_index.value + 1
    generateAccountKeys()
}

/**
 * Generate new account seed phrase and store it in local storage
 */
const generateAccountSeed = async () => {
    const mnemonic = generateMnemonic(wordlist, 256);
    localStorage.setItem('account-seed-phrase', mnemonic);
    accountSeed.value = mnemonic
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

    return {
        credentialTransaction, accountAddress
    }
}  

/**
 * Submit New Credential Transaction
 */
const signSubmitAccountCrednetialTx = async () => {
    try{
         // const  { credentialTransaction, accountAddress } = await requestAccountCrednetialTx();
    
        const credentialTransaction = cred_tx.value
        
        console.log(credentialTransaction)

        
        // Sign the create account credential transaction
        const signature = await signCredentialTransaction(credentialTransaction, account_sk.value);

        // Send the transaction to the network
        const txn = await sendCredentialDeploymentTransaction(credentialTransaction, signature);
        

        const transactionUrl = `${ccdscanBaseUrl}/?dcount=1&dentity=transaction&dhash=${txn.toString()}`;
        console.log('Transaction URL:', transactionUrl);
        alert('Transaction successfully submitted. Press ok to check the transaction on CCDscan');
        window.open(transactionUrl, "_blank");

    }catch(e){
        alert('Error: ' + e.message)
    }
   
}
/////// /////// /////// /////// 
</script>
<style scoped>
.left-card {
  width: 70%;
}
.right-card {
  width: 30%;
}
</style>
