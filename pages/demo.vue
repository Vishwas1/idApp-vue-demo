<template>
    <UContainer>
        <UCard>
            
            <UContainer v-if="!identityObjectProxy">
                <h1> CREATE IDENTITY</h1>
                <br>
                <UContainer>
                    <h4>
                        IDP Seed:
                    </h4>
                    <UTextarea v-model="seed" />
                    <UButton type="success" @click="generateSeed">Generate</UButton>  
                    <!-- <UButton :disabled="isSeed" type="success" @click="revocerSeed">Recover</UButton> -->

                    <h4 v-if="ipList.length > 0">
                    Select IDP:
                    </h4>
                    <!-- <div v-for="idp in ipList" v-bind:key="idp.ipInfo.ipIdentity" class="flex items-center gap-2">
                        <UCard> {{ idp.ipInfo.ipDescription.name }}</UCard>
                    </div> -->
                    <USelect :v-model="ipListSelected"
                        :options="ipList.map((idp, idx) => { return { label: idp.ipInfo.ipDescription.name, value: idx } })"
                        label="Select Identity Provider" />

                    
                    <UButton  :disabled="!isSeed" label="Create Identity" @click="createIdentity" />  
                    <UButton  :disabled="!isSeed" label="Recover Identity" @click="recoverIDApp" />
                </UContainer>
            </UContainer>

            <UContainer v-if="identityObjectProxy">
                <h1> YOUR IDENTITY</h1>
                <br>
                <UContainer>
                    <h3>Identity</h3>
                    <pre>{{ identityObjectProxy?.attributeList?.chosenAttributes }}</pre>
                </UContainer>
            </UContainer>

            <!-- <UContainer v-if="identityObjectProxy">
                <h3>Identity</h3>
                <pre>{{ identityObjectProxy?.attributeList?.chosenAttributes }}</pre>
                <h3>AccountAddress</h3>
                <pre>{{ accountAddressProxy }}</pre>
                <UButton  :disabled="!isSeed" label="Create Account With Identity"
                    @click="requestAccountCrednetialTx" />
            </UContainer> -->

            <UContainer v-if="identityObjectProxy">
                <br>
                <h1> CREATE ACCOUNT</h1>
                <br>
                <UContainer>
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
                    
                    <UButton type="success" @click="requestAccountCrednetialTx">Request Cred Tx</UButton> 
                    <h4>
                        Account Credential Tx:
                    </h4>
                    <pre>{{ cred_tx }}</pre>

                    <UButton type="success" @click="signSubmitAccountCrednetialTx">Submit Tx</UButton> 
                    <br>
                    AccountAddress: <UInput v-model="account_address" placeholder="Account Address" />
                    <!-- <small><a :href="tx_url" target="_blank">{{ tx_url }}</a></small> -->
                </UContainer>
            </UContainer>
        </UCard>
    </UContainer>
</template>


<script setup lang="ts">


import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ConcordiumHdWallet, ConcordiumGRPCWebClient, TransactionExpiry, type IdentityProvider, type CredentialInputNoSeed, type CryptographicParameters, type IdentityRequestWithKeysInput, type IdObjectRequestV1, type Versioned, createIdentityRequestWithKeys, type IdentityObjectV1, createCredentialTransactionNoSeed, createIdentityRecoveryRequestWithKeys, type IdentityRecoveryRequestWithKeysInput, type IdRecoveryRequest, CredentialRegistrationId, signCredentialTransaction, getAccountAddress } from '@concordium/web-sdk'
import { IdentityProviderIdentityStatus, type IdentityTokenContainer } from '~/types';
import { createCredentialDeploymentKeysAndRandomness, getAccountSigningKey, getCredentialId, getCryptographicParameters, getDefaultTransactionExpiry, getRedirectUri, loop, sendCredentialDeploymentTransaction, sendIdentityRecoveryRequest } from '~/utils';
import { identityIndex } from '~/constants';

const network = 'Testnet';
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

// const worker = new Worker(new URL('workers/identity.worker.js', 'http://localhost:3000'));
const nodeAddress = 'https://grpc.testnet.concordium.com';
const nodePort = 20000;
// Base URL for the wallet proxy.
const walletProxyBaseUrl = 'https://wallet-proxy.testnet.concordium.com';
// Base URL for CCDscan. This is used to link to a submitted transaction.
const ccdscanBaseUrl = 'https://testnet.ccdscan.io';
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

/// ID Wallet
const generateSeed = async () => {

    clearStorage()
    const mnemonic = generateMnemonic(wordlist, 256);
    localStorage.setItem('seed-phrase', mnemonic);
    seed.value = mnemonic


    const ip_info = await getIdentityProviders()
    localStorage.setItem('ip-info', JSON.stringify(ip_info))
    ipList.value = ip_info

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
    const ip_info = await getIdentityProviders()
    ipList.value = ip_info
    localStorage.setItem('ip-info', JSON.stringify(ip_info))
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
watch(() => route.fullPath, () => {
    seed.value = localStorage.getItem('seed-phrase') || ''
    isSeed.value = seed.value.length > 0
    if (isSeed.value) {
        revocerSeed()
    }
    // Parse the query parameters every time the route changes
    queryParams.value = Object.fromEntries(new URLSearchParams(route.fullPath).entries())
    if (queryParams.value["/demo#code_uri"]) {
        identityObjectUrl.value = queryParams.value["/demo#code_uri"]
        fetchIdentity(identityObjectUrl.value).then((identityObject) => {
            console.log('Identity Object:', identityObject);
            localStorage.setItem('identity-object', JSON.stringify(identityObject));
            identityObjectProxy.value = identityObject
            // Handle the identity object as needed
        }).catch((error) => {
            console.error('Error fetching identity object:', error);
        });
    }

}, { immediate: true })

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
    if(localStorage.getItem('identity-index') == null){
        localStorage.setItem('identity-index', '0')
    }
    const index = parseInt(localStorage.getItem('identity-index') || '0')
    localStorage.setItem('identity-index', (index).toString())
    return index
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

        loading.value = false
        const wallet = ConcordiumHdWallet.fromSeedPhrase(seed.value, network);
        const identityProviderIndex = selectedIdentityProvider.value.ipInfo.ipIdentity
        
        
        const identityIndex = getLatestIdentityIndex()

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
            window.open(url,"_self");
        } else {
            window.alert('An error occurred during the identity creation.');
        }
    } catch (e) {
        console.log(e);


    }
}

const recoverIDApp = async (public_key) => {
    recoverIdentity()
    recoverIdentityCredentials()
}

// Recover from IDP
const recoverIdentity = async () => {
    loading.value = false
    const identityProviderIndex = selectedIdentityProvider.value.ipInfo.ipIdentity
    const identityIndex = 0 /// 0...infinity
    const cryptographicParameters = await getCryptographicParameters()
    
    // ID wallet (from id seed)
    const wallet = ConcordiumHdWallet.fromSeedPhrase(seed.value, network);
    const idCredSec = wallet.getIdCredSec(identityProviderIndex, identityIndex).toString('hex');
    const identityRequestInput: IdentityRecoveryRequestWithKeysInput = {
        idCredSec,
        ipInfo: selectedIdentityProvider.value.ipInfo,
        globalContext: cryptographicParameters,
        timestamp: Math.floor(Date.now() / 1000),
    };
    const identityRecoveryRequest: Versioned<IdRecoveryRequest> = createIdentityRecoveryRequestWithKeys(identityRequestInput)
    const url = await sendIdentityRecoveryRequest(identityRecoveryRequest, selectedIdentityProvider.value.metadata.recoveryStart);
    const response = await fetch(url);
    if (response.ok) {
        const identity = await response.json();
        localStorage.setItem('identity-object', JSON.stringify(identity.value));
        identityObjectProxy.value = identity.value
    }
}

// Recover form blockhain
const recoverIdentityCredentials = async () => {
    loading.value = false
    const credNumber = 0; /// 0...20
    const cryptographicParameters = await getCryptographicParameters()
    const credId = getCredentialId(seed.value, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, credNumber);
    const accountInfo = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
    console.log(accountInfo)
    accountAddressProxy.value = accountInfo.accountAddress
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
