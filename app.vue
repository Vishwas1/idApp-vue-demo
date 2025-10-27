<script setup lang="ts">
import { NuxtPage } from '#components';
import { TestConcordiumService } from './pages/testPresentation';

const testP = new TestConcordiumService()
const showLoader = useState('showLoader', () => false)


onMounted(() => {
    
    console.log('Inside app.vue onmounted');
    testP.getPresentation().then(() => {
        console.log('Presentation process completed');
    }).catch((error) => {
        console.log(error)
        console.error('Error during presentation process:', error);
    })

    
})

const clearStore = () => {
    localStorage.removeItem('identity-objects')
    localStorage.removeItem('identity-credentials')
    localStorage.removeItem('seed-phrase')
    localStorage.removeItem('account-seed-phrase')
    localStorage.removeItem('pk')
    window.location.reload()    
}

</script>


<template>
        <div class="flex flex-col min-h-screen">
            <header class="bg-gray-800 text-white p-3">
                <h1 class="text-xl" style="float: left">3P ACCOUNT WALLET - DEMO</h1>
                <UButton @click="clearStore" style="float: right">Clear All</UButton> 
            </header>
            <UProgress
                v-show="showLoader"
                animation="carousel"
                />
           
            
            <main class="flex-grow">
                <div class="flex items-center gap-1">
                        <UCard style="width: 100%;">
                                <NavBar/>
                                <NuxtPage />
                        </UCard>
                </div>
            </main>
            
            <footer class="bg-gray-800 text-white p-4">
                <p>&copy; 2025 Split ID Demo</p>
            </footer>
        </div>
        
        

</template>
