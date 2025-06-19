<template>
    <UContainer>

          <div class="flex flex-col gap-2">
              <UCard style="width: 100%;">
               <h4>
            challenge:
        </h4>
        <UTextarea v-model="challenge" />
        <UButton type="success" @click="generateChallenge">Generate</UButton> 
        <br>
        <br>
        <h4>Select ZK Statements:</h4>
        <div class="flex flex-col gap-2">
          <div v-for="(statement, index) in ZK_STATEMENTS" :key="index">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :value="index"
                v-model="selectedStatementIndexes"
              />
              <span>{{ formatStatement(statement) }}</span>
            </label>
          </div>
        </div>
          <UButton type="success" @click="generateProofRequest">GenerateProofRequest</UButton> 
          <h4>
              Proof Request:
          </h4>
          <pre>{{ proofRequestJson }}</pre>
          <br>
        <div>ConnectedAccount: {{ connectedAccount }}</div>
          <div class="flex items-center gap-2">
          <UButton @click="connectWallet">ConnectBrowserWallet</UButton>
          <UButton @click="handleMobileConnect">ConnectMobileWallet</UButton>
          </div>
          <br>
        <UButton type="success" @click="generateZkProof">Request Zk Proof</UButton> 
          <h4>
            Zk Proof:
        </h4>
        <div style="max-height: 200px; overflow-y: auto;">
            <pre>{{ zk_proof }}</pre>
        </div>
        
          <br>
          <br>
       <UButton type="success" @click="verify">Verify Presentation</UButton> 
       <br>
    <div>verified: {{ verifed }}</div>
         <pre>{{ presentationVerificationResult }}</pre>   
    </UCard>
      </div>
    </UContainer>
</template>

<script setup lang="ts">
import { RpcError, VerifiablePresentation } from '@concordium/web-sdk/types';
import {   ref, computed } from 'vue';
import {ZK_STATEMENTS} from '../constants.ts'
import {  WalletConnectProvider, WalletProvider } from '../wallet-connect';
const selectedWalletType = ref<'browser' | 'mobile' | null>(null);
const zk_proof = ref({})
const verifed= ref(false)
const connectedAccount=ref('')
const proofRequest = ref({})
const proofRequestJson= ref({})
const nodeAddress = 'https://grpc.testnet.concordium.com';
const nodePort = 20000;
const presentationVerificationResult= ref({})
const activeProvider = ref<WalletProvider | null>(null);
const challenge= ref('');
const selectedStatementIndexes = ref<number[]>([])

   const selectedStatements = computed(() => {
        return selectedStatementIndexes.value.map(i => ZK_STATEMENTS[i])
      })
   const credentialStatement = computed(() => ({
      idQualifier: {
        type: "cred",
        issuers: [0, 1, 2, 3, 4, 5, 6, 7],
      },
      statement: selectedStatements.value,
    }))

    
    function toHex(buffer: Uint8Array): string {
      return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }


/**
 * * Generate a challenge
 */

  const generateChallenge= ()=>{
      const challengeBuffer = new Uint8Array(32);
      crypto.getRandomValues(challengeBuffer);
      const challenges = toHex(challengeBuffer);
      challenge.value=challenges
  }

/**
 * * Generate a proof Request
 */

  const  generateProofRequest = async () => {
     console.log(credentialStatement)
      proofRequest.value = {challenge:challenge.value,statement:[credentialStatement.value] }
      proofRequestJson.value= JSON.stringify(proofRequest.value)
  }

/**
 * * Connect Browser wallet a proof Request
 */

  async function connectWallet() {
      if (!window.concordium) {
        alert('Concordium Browser Wallet not found. Please install it.');
        return;
      }
      selectedWalletType.value='browser'
     try 
     {
      const accounts = await window.concordium.connect();
      connectedAccount.value = accounts;
     } catch (err) {
      console.error('Wallet connection error:', err);
    }
  }


/**
* * Generate Zk-proof
*/

  async function generateZkProof() {
    try {
        let provider
        if( selectedWalletType.value=='browser'){
          provider= window.concordium
        }else{
        provider=activeProvider.value
        }
        const {challenge,statement}= proofRequest.value
        const proof = await provider.requestVerifiablePresentation(challenge, statement);
        zk_proof.value=proof
        console.log(proof, 'zk proof');
    } catch (err) {
      console.error('Proof generation failed:', err);
    }
  }

/**
* * Handle  Mobile wallet connection 
*/

    const handleMobileConnect = async () => {
      try {
        console.log('Getting provider instance...');
        const provider = await WalletConnectProvider.getInstance();
        await connectProvider(provider);
      } catch (e) {
        console.error('Error during mobile wallet connect:', e);
      }
    };
/**
* * Connect Mobile wallet
*/

    const connectProvider = async (provider: WalletProvider) => {
      try {
        const walletProvider = await provider.connect();
        selectedWalletType.value='mobile'
        activeProvider.value=provider    
        connectedAccount.value=walletProvider[0]
      } catch (error) {
        console.error('Error connecting provider:', error);
      }
    };

/**
* * Verify zk-proof
*/
    async function verify(){
      const presentationToVerify=zk_proof.value
      try{

         const resp= await fetch(`http://localhost:3001/v0/verify`,{
          method:'POST',
          headers:{
          'Content-Type': 'application/json',
                },
          body: presentationToVerify.toString(),
        })

        if(!resp.ok){
          throw new Error('Presentation not verified')
        }else
        {
          const json= await resp.json()
          presentationVerificationResult.value=json
          console.log(json,'json')
          if(json.credentialStatements &&json.credentialStatements.length>0){
            verifed.value= true
          }else{
            verifed.value= false
          }
        }
      }catch(e){
        verifed.value= false
        throw new Error(e.message)
      }
    }


    function formatStatement(statement: any): string {
      switch (statement.type) {
        case "RevealAttribute":
          return `Reveal: ${statement.attributeTag}`
        case "AttributeInRange":
          return `Range: ${statement.attributeTag} (${statement.lower} - ${statement.upper})`
        case "AttributeNotInSet":
          return `Exclude: ${statement.attributeTag} [${statement.set.join(", ")}]`
        default:
          return JSON.stringify(statement)
      }
   }
</script>
