<template>
    <UContainer class="py-1" >
        <h3 class="text-xl font-bold">Your ID Credentials ({{ idcLength  }})</h3>
        <div class="flex p-1" style="max-height: 400px;  overflow-x: auto">
        <UCard
            v-for="(item, index) in items"
            :key="index"
            :class="item.status == 'confirmed'? 'border border-green-500' : 'border border-gray-500'"
            style="margin-bottom: 2px; min-width: 350px; margin-left: 5px; background-color: #363232;"
        >

        <b :style="item.status == 'confirmed' ? 'color: green;' : 'color:grey'">{{  getShorten(item.title) }}</b>
        <ul class="border-t border-grey-300 p-1">
            <li><b :style="item.status == 'confirmed' ? 'color: yellowgreen;' : 'color: grey'">PublicKey:</b> {{ getShorten(item.description) }}</li>
            <li><b :style="item.status == 'confirmed' ? 'color: yellowgreen;' : 'color: grey'">CredNumber:</b> {{ item.credNumber }}</li>
            <li><b :style="item.status == 'confirmed' ? 'color: yellowgreen;' : 'color: grey'">IdentityIndex:</b> {{ item.identityIndex }}</li>
            <li><b :style="item.status == 'confirmed' ? 'color: yellowgreen;' : 'color: grey'">Status:</b> {{ item.status }}</li>
        </ul>
            <!-- <ul class="border-t border-grey-300 p-1">
                <li v-for="attribute in Object.keys(item.description)" v-key="attribute">
                    <b style="color: green;">{{ attribute}}</b> :  {{ item.description[attribute]}}
                </li>
            </ul> -->
            
        </UCard>
    </div>
    </UContainer>
  </template>
  
  <script setup lang="ts">
  
import { onMounted, ref } from 'vue'
const items = ref([]);
const idcLength = computed(() => {
    const idObjectStr = localStorage.getItem('identity-credentials')
    let idObjects = [];
    
    if(idObjectStr){
        idObjects = JSON.parse(idObjectStr)
    } else {
        idObjects = []
    }
    console.log(idObjects.length)
    return idObjects.length
})


// Short the entire string and return the shortened string with dots in middle
const getShorten = (str: string) => {
    if (str.length > 20) {
        return str.substring(0, 10) + '...' + str.substring(str.length - 10);
    }
    return str;

}
onMounted(() => {
    
    console.log("Mounted of mycredentials")
    let idObjects = localStorage.getItem('identity-credentials')
    console.log("Mounted of mycredentials")
    // let idObjects = localStorage.getItem('identity-objects')  
    if(idObjects){
        idObjects = JSON.parse(idObjects)
        console.log("idObjects", idObjects)
        // if(!idObjects?.length === 0){
        //     idObjects = []
        // }

        if(!idObjects && idObjects?.length === 0){
            return
        }
        
        items.value = idObjects.map((idObject) => {
            return {
                title: idObject.accountAddress,
                description: idObject.accountCredentials[0].value.contents.credentialPublicKeys.keys[0].verifyKey,
                credNumber: idObject.credNumber,
                identityIndex: idObject.identityIndex,
                status: idObject.status
            }
        })
        console.log("items.value", items.value)
    } else {
        items.value = []
    }  
})


  
  </script>