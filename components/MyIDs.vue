<template>
    <UContainer class="py-1" >
        <h3 class="text-xl font-bold">Your IDs ({{ idLength  }})</h3>
        <div class="flex p-1" style="max-height: 400px;  overflow-x: auto">
        <UCard
            v-for="(item, index) in items"
            :key="index"
            class="border border-orange-300"
            style="margin-bottom: 2px; min-width: 270px; margin-left: 5px; background-color: #363232;"
        >
            <p>{{ item.title }}</p>
            <ul class="border-t border-grey-300 p-1">
                <li v-for="attribute in Object.keys(item.description)" v-key="attribute">
                    <b style="color: green;">{{ attribute}}</b> :  {{ item.description[attribute]}}
                </li>
            </ul>
            <!-- <code>{{ item.description }}</code> -->
        </UCard>
    </div>
    </UContainer>
  </template>
  
  <script setup lang="ts">
  
import { onMounted, ref } from 'vue'
const items = ref([]);
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
onMounted(() => {
    
    console.log("Mounted of myIDs")
    let idObjects = localStorage.getItem('identity-objects')
    console.log("Mounted of myIDs")
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
                title: idObject.attributeList.chosenAttributes.idDocNo,
                description: idObject.attributeList.chosenAttributes
            }
        })
        console.log("items.value", items.value)
    } else {
        items.value = []
    }  
})


  
  </script>