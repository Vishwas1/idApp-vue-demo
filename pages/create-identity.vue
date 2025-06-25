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
                <USelect v-model="ipListSelected"
                    :options="ipList.map((idp, idx) => { return { label: idp.ipInfo.ipDescription.name, value: idx } })"
                    label="Select Identity Provider" />

                <UButton label="Create Identity" @click="createIdentity" :disabled="showLoader" />
                /
                <UButton label="Recover Identity" @click="recoverIDApp" :disabled="showLoader" />
            </UCard>
            <!-- <UCard style="width: 38%;">
                <h1 class="text-2xl font-bold">Your IDs ({{ idLength  }})</h1>
                <MyIds/>
            </UCard>     -->
        </div>
    </UContainer>
</template>







<script setup lang="ts">
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ConcordiumHdWallet, ConcordiumGRPCWebClient, type IdentityProvider, type IdentityRequestWithKeysInput, type IdObjectRequestV1, type Versioned, createIdentityRequestWithKeys,  createIdentityRecoveryRequestWithKeys, type IdentityRecoveryRequestWithKeysInput, type IdRecoveryRequest, CredentialRegistrationId } from '@concordium/web-sdk'
import { getCredentialId, getCryptographicParameters, getRedirectUri,  sendIdentityRecoveryRequest } from '~/utils';
import { computed } from 'vue';

const showLoader = useState('showLoader')
const network = 'Testnet';
const route = useRoute()
const seed = ref('')
const isSeed = ref(false)
const loading = ref(false)
const ipList = ref<IdentityProviderWithMetadata[]>([])
const ipListSelected = ref(0)

const nodeAddress = 'https://grpc.testnet.concordium.com';
const nodePort = 20000;
const walletProxyBaseUrl = 'https://wallet-proxy.testnet.concordium.com';

const client = new ConcordiumGRPCWebClient(nodeAddress, nodePort);

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
}

const getIdentityProviders = async (): Promise<IdentityProviderWithMetadata[]> => {
    const response = await fetch(walletProxyBaseUrl + '/v1/ip_info');
    return response.json();
}

const selectedIdentityProvider: ComputedRef<IdentityProviderWithMetadata> = computed(() => {
    return ipList.value[ipListSelected.value]
})

const idLength = computed(() => {
    const idObjectStr = localStorage.getItem('identity-objects')
    let idObjects = [];

    if (idObjectStr) {
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    return idObjects.length
})

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
            window.open(url, "_blank");
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
}, { immediate: true })

const recoverIDApp = async (public_key) => {
    showLoader.value = true
    revocerSeed();

    const a = recoverIdentity()
    const b = recoverIdentityCredentials()
    Promise.all([a, b]).then(() => {
        showLoader.value = false
        window.location.reload()
    }).catch((e) => {
        console.error(e)
        showLoader.value = false
    })

    // await recoverIdentity()
    // await recoverIdentityCredentials()
    // showLoader.value = false
    // window.location.reload()
}

// Recover from IDP
const recoverIdentity = async () => {
    loading.value = false
    const identityProviderIndex = selectedIdentityProvider.value.ipInfo.ipIdentity


    // const identityIndex = 0 /// 0...infinity
    const cryptographicParameters = await getCryptographicParameters()
    let identityObjects = []

    const wallet = ConcordiumHdWallet.fromSeedPhrase(seed.value, network);

    for (let identityIndex = 0; identityIndex <= 20; identityIndex++) {

        // ID wallet (from id seed)
        const idCredSec = wallet.getIdCredSec(identityProviderIndex, identityIndex).toString('hex');
        const identityRequestInput: IdentityRecoveryRequestWithKeysInput = {
            idCredSec,
            ipInfo: selectedIdentityProvider.value.ipInfo,
            globalContext: cryptographicParameters,
            timestamp: Math.floor(Date.now() / 1000),
        };
        const identityRecoveryRequest: Versioned<IdRecoveryRequest> = createIdentityRecoveryRequestWithKeys(identityRequestInput)
        try {
            const url = await sendIdentityRecoveryRequest(identityRecoveryRequest, selectedIdentityProvider.value.metadata.recoveryStart);

            console.log(url)
            const response = await fetch(url);
            if (response.ok) {
                const identity = await response.json();
                identityObjects.push(identity.value)
                //identityObjectProxy.value = identity.value
            }
        } catch (e) {
            console.error(e.message)
            console.log('continuing... identityIndex = ' + identityIndex)
        }

    }


    localStorage.setItem('identity-objects', JSON.stringify(identityObjects, (key, value) => typeof value === "bigint" ? Number(value) : value));




}

const recoverIdentityCredentials = async () => {

    try {
        const idSeed = seed.value
        const cryptographicParameters = await getCryptographicParameters()
        let identityCredentials = []
        
        for (let i = 0; i < 20; i++) {
            const credId = getCredentialId(idSeed, selectedIdentityProvider.value.ipInfo.ipIdentity, cryptographicParameters, i);
            try {
                const accountInfo: any = await client.getAccountInfo(CredentialRegistrationId.fromHexString(credId));
                accountInfo['credNumber'] = i;
                accountInfo['identityIndex'] = 0; //hardcoded for now
                accountInfo['status'] = 'confirmed'
                identityCredentials.push(accountInfo)
            } catch (e) {
                console.error(e)
            }
            // accountAddressProxy.value = accountInfo.accountAddress
        }
        localStorage.setItem('identity-credentials', JSON.stringify(identityCredentials, (key, value) => typeof value === "bigint" ? Number(value) : value));
    } catch (e) {
        console.error(e)
    }

}

</script>
<style scoped>
.left-card {
    width: 70%;
}

.right-card {
    width: 30%;
}
</style>
