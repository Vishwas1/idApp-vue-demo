<template>
    <UContainer>
        <!-- <UCard  v-if="ifAccountSuccess" class="flex flex-col items-center justify-center">
            <UIcon name="hugeicons:checkmark-circle-03" class="size-12" style="color: green" />
            <h1>Identity Creation Successful!</h1>
        </UCard>
        <UCard  v-else-if="!ifIdCreationInProgress && !ifAccountSuccess" class="flex flex-col items-center justify-center">
            <UIcon name="material-symbols:chat-error-outline-rounded" style="color: red" class="size-12"/>
            <h1>Identity Creation Failed!</h1>
        </UCard> -->
    </UContainer>
</template>

<script setup lang="ts">
import type { IdentityObjectV1 } from '@concordium/web-sdk';
import { IdentityProviderIdentityStatus, type IdentityTokenContainer } from '~/types';
import {  loop  } from '~/utils';
const queryParams = ref<Record<string, string>>({})
const route = useRoute()
const ifAccountSuccess = ref(false)
const ifIdCreationInProgress = ref(true)
const fetchIdentity = async (identityObjectUrl: string): Promise<IdentityObjectV1> => {
    const intervalMs = 5000;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise( async (resolve, reject) => {
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

onMounted(() => {
    // Parse the query parameters every time the route changes
    queryParams.value = Object.fromEntries(new URLSearchParams(route.fullPath).entries())
    console.log("queryParams", queryParams.value)
    console.log("queryParams", queryParams.value["/idp-callback#code_uri"])
    console.log("queryParams", queryParams.value["/idp-callback/#code_uri"])
    if (queryParams.value["/idp-callback#code_uri"] || queryParams.value["/idp-callback/#code_uri"]) {
        ifIdCreationInProgress.value = true
        const idObjectUrl = queryParams.value["/idp-callback#code_uri"] || queryParams.value["/idp-callback/#code_uri"]
        
        if(!idObjectUrl){
            throw new Error("No identity object URL found in the query parameters.");
        }
        
        fetchIdentity(idObjectUrl).then((identityObject) => {
            let idObjects = localStorage.getItem('identity-objects')
            if(!idObjects){
                idObjects = []
            } else {
                idObjects = JSON.parse(idObjects)
            }
            
            idObjects.unshift(identityObject)

            localStorage.setItem('identity-objects', JSON.stringify(idObjects));
            ifAccountSuccess.value = true
            // setTimeout(()=> {
            //     // Redirect to the home page after 5 seconds
            //     window.location.href = '/create-identity';
            // }, 5000);
            window.close()
            ifIdCreationInProgress.value = false

        }).catch((error) => {
            ifAccountSuccess.value = false
            ifIdCreationInProgress.value = false
            console.error('Error fetching identity object:', error);
        });
    }
})

</script>