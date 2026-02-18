<template>
  <UContainer>
    <UCard>
      <div class="container mx-auto p-4">
        <h2 class="text-xl font-bold mb-4">ZKP Verification - Scan Merchant QR</h2>

        <!-- Connection Status -->
        <div class="mb-4 flex items-center gap-2">
          <div 
            :class="[
              'w-3 h-3 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            ]"
          ></div>
          <span class="text-sm font-medium">
            {{ isConnected ? 'Connected' : 'Not Connected' }}
          </span>
          <span v-if="activeSessions.length > 0" class="text-xs text-gray-500">
            ({{ activeSessions.length }} session{{ activeSessions.length > 1 ? 's' : '' }})
          </span>
          <UButton 
            v-if="isConnected"
            @click="toggleNetwork" 
            color="green" 
            size="xs"
            class="ml-2"
          >
            Open ID App
          </UButton>
        </div>

        <!-- Manual URI Input -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Enter Merchant WalletConnect URI manually:</label>
          <div class="flex gap-2">
            <UInput
              v-model="manualUri"
              placeholder="wc:..."
              class="flex-1"
              size="sm"
            />
            <UButton 
              @click="useManualUri" 
              color="primary" 
              size="sm"
              :disabled="!manualUri"
            >
              Start Verification
            </UButton>
          </div>
        </div>

        <UDivider class="my-4" />

        <!-- Scan QR Button -->
        <UButton
          v-if="!isScanning"
          @click="startScanner"
          icon="i-heroicons-camera"
          color="primary"
          size="sm"
        >
          Scan Merchant QR Code
        </UButton>

        <!-- Stop Scanning Button -->
        <UButton
          v-if="isScanning"
          @click="stopScanner"
          icon="i-heroicons-x-mark"
          color="red"
          size="sm"
        >
          Stop Scanning
        </UButton>

        <!-- QR Scanner using vue-qrcode-reader -->
        <div v-if="isScanning" class="mt-4 w-full max-w-md mx-auto qr-container">
          <QrcodeStream
            :constraints="cameraConstraints"
            @detect="onDetect"
            @error="onError"
            @camera-on="onCameraReady"
          >
            <div class="qr-overlay">
              <div class="qr-frame"></div>
            </div>
          </QrcodeStream>
        </div>

        <!-- Status Messages -->
        <div v-if="statusMessage" class="mt-4">
          <UAlert :color="statusType" :title="statusMessage" />
        </div>

        <!-- ZKP Flow Progress -->
        <div v-if="zkpFlowStage !== 'idle'" class="mt-4">
          <UCard>
            <template #header>
              <h3 class="font-semibold">ZKP Verification Flow</h3>
            </template>
            
            <!-- Flow Steps -->
            <div class="space-y-3">
              <!-- Step 1: Merchant QR Scanned -->
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white">1</div>
                <span class="text-green-600 font-medium">
                  Scan Merchant QR Code
                </span>
                <span class="text-green-500">✓</span>
              </div>
              
              <!-- Step 2: Paired with Merchant -->
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  ['merchant-paired', 'request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'bg-green-500 text-white' 
                    : zkpFlowStage === 'merchant-scanned' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                ]">2</div>
                <span :class="[
                  ['merchant-paired', 'request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'text-green-600 font-medium' 
                    : zkpFlowStage === 'merchant-scanned' ? 'text-blue-600 font-medium' : 'text-gray-500'
                ]">
                  {{ zkpFlowStage === 'merchant-scanned' ? 'Pairing with Merchant...' : 'Paired with Merchant' }}
                </span>
                <span v-if="['merchant-paired', 'request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage)" class="text-green-500">✓</span>
              </div>
              
              <!-- Step 3: Request Received -->
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  ['request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'bg-green-500 text-white' 
                    : zkpFlowStage === 'merchant-paired' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                ]">3</div>
                <span :class="[
                  ['request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'text-green-600 font-medium' 
                    : zkpFlowStage === 'merchant-paired' ? 'text-blue-600 font-medium' : 'text-gray-500'
                ]">
                  {{ zkpFlowStage === 'merchant-paired' ? 'Waiting for Request...' : 'Request Received' }}
                </span>
                <span v-if="['request-received', 'id-app-connecting', 'session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage)" class="text-green-500">✓</span>
              </div>
              
              <!-- Step 4: ID App Connection -->
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  ['session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'bg-green-500 text-white' 
                    : zkpFlowStage === 'id-app-connecting' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                ]">4</div>
                <span :class="[
                  ['session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage) 
                    ? 'text-green-600 font-medium' 
                    : zkpFlowStage === 'id-app-connecting' ? 'text-blue-600 font-medium' : 'text-gray-500'
                ]">
                  {{ zkpFlowStage === 'id-app-connecting' ? 'Connecting to ID App...' : 'ID App Session Approved' }}
                </span>
                <span v-if="['session-approved', 'generating-proof', 'proof-sent'].includes(zkpFlowStage)" class="text-green-500">✓</span>
              </div>
              
              <!-- Step 5: Generate Proof -->
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  zkpFlowStage === 'proof-sent' 
                    ? 'bg-green-500 text-white' 
                    : zkpFlowStage === 'generating-proof' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                ]">5</div>
                <span :class="[
                  zkpFlowStage === 'proof-sent' 
                    ? 'text-green-600 font-medium' 
                    : zkpFlowStage === 'generating-proof' ? 'text-blue-600 font-medium' : 'text-gray-500'
                ]">
                  {{ zkpFlowStage === 'generating-proof' ? 'Generating Proof...' : 'Generate & Send Proof' }}
                </span>
                <span v-if="zkpFlowStage === 'proof-sent'" class="text-green-500">✓</span>
              </div>
            </div>
            
            <!-- Generate Proof Button (shown when session is approved) - now handled by popup -->
            <div v-if="zkpFlowStage === 'session-approved'" class="mt-4">
              <UAlert color="yellow" title="Action Required" description="Use the ID App popup to generate your proof." />
            </div>
            
            <!-- Reset Button -->
            <div v-if="zkpFlowStage === 'proof-sent'" class="mt-4">
              <UAlert color="green" title="Success!" description="Proof has been verified and sent to the merchant." />
              <UButton 
                @click="resetZkpFlow" 
                color="gray" 
                size="sm"
                class="w-full mt-2"
              >
                Start New Verification
              </UButton>
            </div>
            
            <!-- Cancel Button -->
            <div v-if="zkpFlowStage !== 'proof-sent'" class="mt-4">
              <UButton 
                @click="resetZkpFlow" 
                color="gray" 
                size="xs"
                variant="outline"
              >
                Cancel
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- Scanned URI Display -->
        <div v-if="scannedUri" class="mt-4">
          <UCard>
            <template #header>
              <h3 class="font-semibold">WalletConnect URI</h3>
            </template>
            <p class="text-sm break-all">{{ scannedUri }}</p>
            <template #footer>
              <div class="flex gap-2">
                <UButton @click="pairWallet" color="green" size="sm" :loading="isPairing">
                  Pair Wallet
                </UButton>
                <UButton @click="clearScannedUri" color="gray" size="sm"> Clear </UButton>
              </div>
            </template>
          </UCard>
        </div>

        <!-- Pairing Result -->
        <div v-if="pairingResult" class="mt-4">
          <UAlert
            color="green"
            title="Pairing Status"
            :description="pairingResult"
          />
        </div>

        <!-- Pending Proposal -->
        <div v-if="pendingProposal" class="mt-4">
          <UAlert
            color="yellow"
            title="Processing Session Proposal..."
            description="Auto-approving incoming session request"
          />
        </div>

        <!-- Active Sessions -->
        <div v-if="activeSessions.length > 0" class="mt-4">
          <UCard>
            <template #header>
              <h3 class="font-semibold">Active Sessions</h3>
            </template>
            <div class="space-y-2">
              <div 
                v-for="session in activeSessions" 
                :key="session.topic"
                class="p-2 border rounded flex justify-between items-center"
              >
                <div>
                  <p class="text-sm font-medium">{{ session.peer?.metadata?.name || 'Unknown' }}</p>
                  <p class="text-xs text-gray-500">Topic: {{ session.topic.slice(0, 20) }}...</p>
                </div>
                <UButton 
                  @click="disconnectSession(session.topic)" 
                  color="red" 
                  size="xs"
                  variant="outline"
                >
                  Disconnect
                </UButton>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Active Pairings -->
        <div v-if="activePairings.length > 0" class="mt-4">
          <UCard>
            <template #header>
              <div class="flex justify-between items-center">
                <h3 class="font-semibold">Active Pairings</h3>
                <UButton @click="clearAllPairings" color="red" size="xs">Clear All</UButton>
              </div>
            </template>
            <div class="space-y-2">
              <div 
                v-for="pairing in activePairings" 
                :key="pairing.topic"
                class="p-2 border rounded"
              >
                <p class="text-sm font-medium">{{ pairing.peerMetadata?.name || 'Pending...' }}</p>
                <p class="text-xs text-gray-500">Topic: {{ pairing.topic.slice(0, 20) }}...</p>
                <p class="text-xs" :class="pairing.active ? 'text-green-500' : 'text-yellow-500'">
                  {{ pairing.active ? 'Active' : 'Inactive' }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { QrcodeStream } from "vue-qrcode-reader";
import SignClient from "@walletconnect/sign-client";
import { AccountWallet, AccountWalletWC } from '~/account-wallet';
import { ConcordiumIDAppSDK, ConcordiumIDAppPoup } from "@concordium/id-app-sdk";
import type { Network } from '@concordium/web-sdk';

const isScanning = ref(false);
const scannedUri = ref("");
const manualUri = ref("");
const statusMessage = ref("");
const statusType = ref<"primary" | "red" | "green" | "yellow">("primary");
const isPairing = ref(false);
const pairingResult = ref("");
const activeSessions = ref<any[]>([]);
const activePairings = ref<any[]>([]);
const pendingProposal = ref<any>(null);
const showLoader = useState('showLoader');

// ========== MERCHANT CONNECTION (signClient for merchant <-> this app) ==========
let merchantSignClient: InstanceType<typeof SignClient> | null = null;
const MERCHANT_PROJECT_ID = "8b6c46b9127ce91195745c124870244e"; // Merchant connection project ID

// ========== ID APP CONNECTION (AccountWalletWC for this app <-> ID App) ==========
const idAppWalletConnect = ref<AccountWalletWC>();
const acWallet = ref<AccountWallet>();
const network: Network = 'Testnet';

// ZKP Flow state variables
const zkpFlowStage = ref<'idle' | 'merchant-scanned' | 'merchant-paired' | 'request-received' | 'id-app-connecting' | 'session-approved' | 'generating-proof' | 'proof-sent'>('idle');
const merchantRequest = ref<any>(null);
const merchantWcUri = ref<string>("");
const merchantPresentationRequest = ref<any>(null);
const merchantSessionTopic = ref<string>("");
const merchantRequestId = ref<number | null>(null);
const generatedProof = ref<any>(null);
const showGenerateProofPopup = ref(false);

// Connection status (shows merchant sessions)
const isConnected = computed(() => activeSessions.value.length > 0);

// Camera constraints - prefer back camera
const cameraConstraints = {
  facingMode: "environment",
};

// Update merchant sessions list
const updateMerchantSessions = () => {
  if (merchantSignClient) {
    activeSessions.value = merchantSignClient.session.getAll();
    activePairings.value = merchantSignClient.pairing.getAll();
  }
};

// ========== ID APP CONNECTION METHODS ==========

// Initialize AccountWalletWC for ID App connection
const initIdAppConnection = async () => {
  if (!idAppWalletConnect.value) {
    idAppWalletConnect.value = new AccountWalletWC();
    await idAppWalletConnect.value.initClient();
    acWallet.value = new AccountWallet(idAppWalletConnect.value);
  }
};

// Connect to ID App via WalletConnect
const connectIdApp = async () => {
  if (!idAppWalletConnect.value) {
    console.error('[ID_APP] WalletConnect client is not initialized');
    ConcordiumIDAppPoup.closePopup();
    return;
  }
  await idAppWalletConnect.value.connect(ConcordiumIDAppSDK.chainId.Testnet);
};

// Toggle network and show popup (for manual ID App connection)
const toggleNetwork = async () => {
  
  await initIdAppConnection();
  
  if (!idAppWalletConnect.value) {
    return;
  }
  
  const sessions = idAppWalletConnect.value.getListOfSessions();
  
  if (sessions.length === 0) {
    showLoader.value = true;
    await connectIdApp();
    showLoader.value = false;

    if (!idAppWalletConnect.value.uri) {
      setStatus("Could not connect to wallet connect server", "red");
      return;
    }
    
    ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
      walletConnectUri: idAppWalletConnect.value.uri,
      actionType: "generate-proof",
    });
    
    return;
  }

  // If session exists, show actions popup
  ConcordiumIDAppPoup.invokeIdAppActionsPopup({
    generateProof: async () => {
      await generateProof();
    },
    walletConnectSessionTopic: sessions[0]?.topic
  });
};

// ========== ZKP FLOW METHODS ==========

// Step 1: Handle merchant QR code scan - pair with merchant
const handleMerchantQRScan = async (merchantUri: string) => {
  zkpFlowStage.value = 'merchant-scanned';
  merchantWcUri.value = merchantUri;
  
  try {
    // Store the merchant WC URI
    merchantRequest.value = { uri: merchantUri };
    setStatus("Pairing with merchant...", "primary");
    
    // Initialize Merchant SignClient if not already done
    if (!merchantSignClient) {
      await initMerchantSignClient();
    }
    
    if (!merchantSignClient) {
      throw new Error("Merchant WalletConnect SignClient not initialized");
    }
    
    // Pair with the merchant using their QR code URI
    isPairing.value = true;
    
    const pairingTopic = await merchantSignClient.pair({ uri: merchantUri });
    
    pairingResult.value = `Pairing established! Waiting for session proposal...`;
    setStatus("Pairing established! Waiting for merchant session...", "green");
    
    // Update pairings list
    updateMerchantSessions();
    isPairing.value = false;
    
    // Now wait for session_proposal event (handled by initMerchantSignClient event listener)
    // After session approval, wait for session_request with presentation request
    
  } catch (error: any) {
    console.error("[MERCHANT] Error pairing with merchant:", error);
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes("Pairing already exists")) {
      setStatus("Pairing already exists! Waiting for session...", "yellow");
    } else {
      setStatus(`Pairing failed: ${errorMsg}`, "red");
      zkpFlowStage.value = 'idle';
    }
    isPairing.value = false;
  }
};

// Step 2: Connect to ID App (show QR code popup) - SEPARATE from merchant
const connectToIdApp = async () => {
  zkpFlowStage.value = 'id-app-connecting';
  
  await initIdAppConnection();
  
  if (!idAppWalletConnect.value) {
    setStatus("Failed to initialize ID App connection", "red");
    zkpFlowStage.value = 'request-received'; // Go back to previous state
    return;
  }
  
  // Set up callback for session approval
  idAppWalletConnect.value.onSessionApproved = async (session) => {
    zkpFlowStage.value = 'session-approved';
    ConcordiumIDAppPoup.closePopup();
    
    // Show the generateProof popup
    await showGenerateProofDialog();
  };
  
  const existingSession = idAppWalletConnect.value.getMostNewSession();
  
  if (existingSession) {
    zkpFlowStage.value = 'session-approved';
    // Show the generateProof popup directly
    await showGenerateProofDialog();
  } else {
    // No existing session, need to connect
    showLoader.value = true;
    await connectIdApp();
    showLoader.value = false;
    
    if (!idAppWalletConnect.value.uri) {
      setStatus("Could not connect to ID App server", "red");
      zkpFlowStage.value = 'request-received';
      return;
    }
    
    ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
      walletConnectUri: idAppWalletConnect.value.uri,
      actionType: "generate-proof",
    });
  }
};

// Step 3: Show the generateProof popup
const showGenerateProofDialog = async () => {
  showGenerateProofPopup.value = true;
  setStatus("Session approved! Ready to generate proof.", "green");
  
  // Show the ID App actions popup with generateProof method
  if (idAppWalletConnect.value) {
    const sessionTopic = idAppWalletConnect.value.getListOfSessions()[0]?.topic;
    if (!sessionTopic) {
      setStatus("No ID App session found", "red");
      return;
    }
    
    
    ConcordiumIDAppPoup.invokeIdAppActionsPopup({
      generateProof: async () => {
        await generateProof();
      },
      walletConnectSessionTopic: sessionTopic
    });
  }
};

// Step 4: Generate proof using ID App and send to merchant
const generateProof = async () => {
  zkpFlowStage.value = 'generating-proof';
  setStatus("Generating proof...", "primary");
  
  try {
    if (!idAppWalletConnect.value) {
      throw new Error("ID App WalletConnect client not initialized");
    }
    
    const idAppSession = idAppWalletConnect.value.getMostNewSession();
    if (!idAppSession) {
      throw new Error("No active ID App session found");
    }
    
    // Use the merchant's presentation request that was received via session_request
    if (!merchantPresentationRequest.value) {
      throw new Error("No presentation request from merchant");
    }
    
    console.log("[ID_APP] Merchant presentation request:", merchantPresentationRequest.value);
    
    // Request verifiable presentation from ID App using merchant's request
    const chainId = "ccd:4221332d34e1694168c2a0c0b3fd0f27"; // testnet chainId
    
    let proof;
    try {
      proof = await idAppWalletConnect.value.request(
        "request_verifiable_presentation_v1",
        chainId,
        {
          ...merchantPresentationRequest.value,
          metadata: {
            appName: "ZKP App",
            description: "ZKP verification request",
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
        }
      );
      console.log("[ID_APP] Proof response from ID App:", proof);
    } catch (requestError) {
      console.error("[ID_APP] ID App request failed:", requestError);
      throw requestError;
    }
    
    if (!proof) {
      throw new Error("No proof received from ID App");
    }
    
    console.log("[ID_APP] Proof object:", proof);
    generatedProof.value = proof;
    
    // Send proof back to merchant
    console.log("[MERCHANT] Merchant session topic:", merchantSessionTopic.value);
    console.log("[MERCHANT] Merchant request ID:", merchantRequestId.value);
    console.log("[MERCHANT] Merchant SignClient exists:", !!merchantSignClient);
    
    try {
      await sendProofToMerchant(proof);
    } catch (sendError) {
      console.error("[MERCHANT] sendProofToMerchant error:", sendError);
      throw sendError;
    }
    
  } catch (error) {
    console.error("[ID_APP] Error generating proof:", error);
    setStatus(`Failed to generate proof: ${error}`, "red");
    zkpFlowStage.value = 'session-approved';
  }
};

// Step 5: Send the generated proof to merchant (using merchantSignClient)
const sendProofToMerchant = async (proof: any) => {
  
  console.log("[MERCHANT] sendProofToMerchant called with proof:", proof);
  console.log("[MERCHANT] merchantSignClient:", merchantSignClient);
  console.log("[MERCHANT] merchantSessionTopic.value:", merchantSessionTopic.value);
  console.log("[MERCHANT] merchantRequestId.value:", merchantRequestId.value);
  
  try {
    // Check all required values
    if (!merchantSignClient) {
      throw new Error("merchantSignClient is not initialized");
    }
    
    if (!merchantSessionTopic.value) {
      throw new Error("merchantSessionTopic is empty");
    }
    
    if (merchantRequestId.value === null) {
      throw new Error("merchantRequestId is null");
    }
    
    
    const responsePayload = {
      topic: merchantSessionTopic.value,
      response: {
        id: merchantRequestId.value,
        jsonrpc: "2.0",
        result: proof
      }
    };
    
    console.log("[MERCHANT] About to call merchantSignClient.respond() with:", JSON.stringify(responsePayload, null, 2));
    
    await merchantSignClient.respond(responsePayload);
    
    console.log("[MERCHANT] merchantSignClient.respond() completed successfully!");
    
    zkpFlowStage.value = 'proof-sent';
    setStatus("Proof generated and sent to merchant successfully!", "green");
    showGenerateProofPopup.value = false;
    ConcordiumIDAppPoup.closePopup();
    
    // Reset flow after success
    setTimeout(() => {
      resetZkpFlow();
    }, 3000);
    
  } catch (error) {
    console.error("[MERCHANT] Error sending proof to merchant:", error);
    setStatus(`Failed to send proof: ${error}`, "red");
    zkpFlowStage.value = 'session-approved';
  }
};

// Reset the ZKP flow
const resetZkpFlow = () => {
  zkpFlowStage.value = 'idle';
  merchantRequest.value = null;
  merchantWcUri.value = "";
  merchantPresentationRequest.value = null;
  merchantSessionTopic.value = "";
  merchantRequestId.value = null;
  generatedProof.value = null;
  showGenerateProofPopup.value = false;
};

// ========== END ZKP FLOW METHODS ==========

// ========== MERCHANT SIGNCLIENT INITIALIZATION ==========

// Initialize WalletConnect SignClient for MERCHANT connection
const initMerchantSignClient = async () => {
  try {
    
    merchantSignClient = await SignClient.init({
      projectId: MERCHANT_PROJECT_ID,
      metadata: {
        name: "ZKP Wallet App",
        description: "ZKP Wallet Application connecting to Merchant",
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });
    console.log("[MERCHANT] WalletConnect SignClient initialized");

    // Debug: Log ALL events from the core
    merchantSignClient.core.on("*", (event: any) => {
      console.log("[MERCHANT] Core event *:", event);
    });

    // Set up MERCHANT event listeners
    merchantSignClient.on("session_event", (event: any) => {
      console.log("[MERCHANT] Session event:", event);
      updateMerchantSessions();
    });

    merchantSignClient.on("session_update", (event: any) => {
      console.log("[MERCHANT] Session update:", event);
      updateMerchantSessions();
    });

    merchantSignClient.on("session_delete", (event: any) => {
      console.log("[MERCHANT] Session delete:", event);
      updateMerchantSessions();
    });

    merchantSignClient.on("session_expire", (event: any) => {
      console.log("[MERCHANT] Session expire:", event);
      updateMerchantSessions();
    });

    // Handle session_request from MERCHANT (this is the presentation request!)
    merchantSignClient.on("session_request", async (event: any) => {
      console.log("[MERCHANT] *** SESSION REQUEST RECEIVED FROM MERCHANT ***", event);
      const { topic, params, id } = event;
      const { request } = params;
      
      console.log("[MERCHANT] Request method:", request.method);
      console.log("[MERCHANT] Request params:", request.params);
      console.log("[MERCHANT] Session topic:", topic);
      console.log("[MERCHANT] Request ID:", id);
      
      // Check if this is a presentation request
      if (request.method === "request_verifiable_presentation_v1" || request.method === "concordium_request_verifiable_presentation") {
        zkpFlowStage.value = 'request-received';
        merchantPresentationRequest.value = request.params;
        merchantSessionTopic.value = topic;
        merchantRequestId.value = id;
        
        console.log("[MERCHANT] Stored presentation request:", merchantPresentationRequest.value);
        console.log("[MERCHANT] Stored session topic:", merchantSessionTopic.value);
        console.log("[MERCHANT] Stored request ID:", merchantRequestId.value);
        
        setStatus("Presentation request received! Connecting to ID App...", "green");
        
        // Now connect to ID App to generate the proof
        // await connectToIdApp();
      } else {
      }
    });

    // Handle session_proposal from MERCHANT
    merchantSignClient.on("session_proposal", async (event: any) => {
      console.log("[MERCHANT] Session proposal received:", event);
      pendingProposal.value = event;
      
      // Auto-approve the session proposal
      try {
        const { id, params } = event;
        const { requiredNamespaces, optionalNamespaces } = params;
        
        console.log("[MERCHANT] Required namespaces:", requiredNamespaces);
        console.log("[MERCHANT] Optional namespaces:", optionalNamespaces);
        
        // Build namespaces response (approve all requested)
        const namespaces: Record<string, any> = {};
        
        // Handle required namespaces
        if (requiredNamespaces) {
          for (const [key, value] of Object.entries(requiredNamespaces as Record<string, any>)) {
            namespaces[key] = {
              accounts: value.chains?.map((chain: string) => `${chain}:dummy_account`) || [],
              methods: value.methods || [],
              events: value.events || [],
            };
          }
        }
        
        // Handle optional namespaces
        if (optionalNamespaces) {
          for (const [key, value] of Object.entries(optionalNamespaces as Record<string, any>)) {
            if (!namespaces[key]) {
              namespaces[key] = {
                accounts: value.chains?.map((chain: string) => `${chain}:dummy_account`) || [],
                methods: value.methods || [],
                events: value.events || [],
              };
            }
          }
        }

        console.log("[MERCHANT] Approving with namespaces:", namespaces);

        const { acknowledged } = await merchantSignClient!.approve({
          id,
          namespaces,
        });
        
        const ackResult = await acknowledged();
        console.log("[MERCHANT] Session acknowledged result:", ackResult);
        console.log("[MERCHANT] Session topic:", ackResult?.topic);
        
        // Get the full session details
        const approvedSession = merchantSignClient!.session.get(ackResult?.topic);
        console.log("[MERCHANT] Approved session details:", approvedSession);
        console.log("[MERCHANT] Session namespaces:", approvedSession?.namespaces);
        
        zkpFlowStage.value = 'merchant-paired';
        setStatus("Paired with merchant! Waiting for presentation request...", "green");
        updateMerchantSessions();
        pendingProposal.value = null;
        
        // Wait for the merchant to send presentation request via session_request event
      } catch (err) {
        console.error("[MERCHANT] Failed to approve session:", err);
        setStatus(`Failed to approve: ${err}`, "red");
        pendingProposal.value = null;
      }
    });

    // Load existing merchant sessions
    updateMerchantSessions();
    
    // Check for existing merchant pairings
    const pairings = merchantSignClient.pairing.getAll();
    if (pairings.length > 0) {
    }
  } catch (error) {
    console.error("[MERCHANT] Failed to initialize SignClient:", error);
    setStatus("Failed to initialize Merchant WalletConnect", "red");
  }
};

const setStatus = (
  message: string,
  type: "primary" | "red" | "green" | "yellow" = "primary",
) => {
  statusMessage.value = message;
  statusType.value = type;
};

// Use manual URI
const useManualUri = () => {
  if (manualUri.value.startsWith("wc:")) {
    scannedUri.value = manualUri.value;
    const uri = manualUri.value;
    manualUri.value = "";
    setStatus("Merchant URI entered! Processing...", "green");
    
    // Trigger the ZKP flow with manual merchant URI
    handleMerchantQRScan(uri);
  } else {
    setStatus("Invalid WalletConnect URI. Must start with 'wc:'", "red");
  }
};

const startScanner = () => {
  isScanning.value = true;
  setStatus("Starting camera...", "primary");
};

const stopScanner = () => {
  isScanning.value = false;
  setStatus("", "primary");
};

const onCameraReady = () => {
  setStatus("Scanning for QR code...", "primary");
};

const onDetect = (detectedCodes: Array<{ rawValue: string }>) => {
  if (detectedCodes.length > 0 && detectedCodes[0]) {
    const decodedText = detectedCodes[0].rawValue;
    console.log("QR Code scanned:", decodedText);

    // Check if it's a WalletConnect URI (from merchant)
    if (decodedText.startsWith("wc:")) {
      scannedUri.value = decodedText;
      setStatus("Merchant QR code detected! Processing...", "green");
      stopScanner();
      
      // Trigger the ZKP flow with merchant QR
      handleMerchantQRScan(decodedText);
    } else {
      setStatus("Not a WalletConnect QR code. Keep scanning...", "yellow");
    }
  }
};

const onError = (error: Error) => {
  console.error("Camera error:", error);
  setStatus(`Camera error: ${error.message}`, "red");
  isScanning.value = false;
};

const pairWallet = async () => {
  if (!scannedUri.value) {
    setStatus("No URI to pair", "red");
    return;
  }

  if (!merchantSignClient) {
    await initMerchantSignClient();
  }

  if (!merchantSignClient) {
    setStatus("Merchant WalletConnect client not initialized", "red");
    return;
  }

  isPairing.value = true;
  setStatus("Pairing...", "primary");

  try {
    // The pair() method establishes the pairing
    // After pairing, we should receive a session_proposal event
    const pairingTopic = await merchantSignClient.pair({ uri: scannedUri.value });
    
    pairingResult.value = `Pairing established! Waiting for session proposal...`;
    setStatus("Pairing established! Waiting for session...", "green");
    scannedUri.value = "";
    
    // Update pairings list
    const pairings = merchantSignClient.pairing.getAll();
    
    updateMerchantSessions();
  } catch (error: any) {
    console.error("[MERCHANT] Pairing failed:", error);
    const errorMsg = error?.message || String(error);
    setStatus(`Pairing failed: ${errorMsg}`, "red");
    
    // Check for specific errors
    if (errorMsg.includes("Pairing already exists")) {
      setStatus("This pairing already exists!", "yellow");
    }
  } finally {
    isPairing.value = false;
  }
};

// Disconnect a merchant session
const disconnectSession = async (topic: string) => {
  if (!merchantSignClient) return;
  
  try {
    await merchantSignClient.disconnect({
      topic,
      reason: { code: 6000, message: "User disconnected" },
    });
    updateMerchantSessions();
    setStatus("Session disconnected", "green");
  } catch (error) {
    console.error("[MERCHANT] Disconnect failed:", error);
    setStatus(`Disconnect failed: ${error}`, "red");
  }
};

const clearScannedUri = () => {
  scannedUri.value = "";
  pairingResult.value = "";
  setStatus("", "primary");
};

// Clear all merchant pairings and sessions
const clearAllPairings = async () => {
  if (!merchantSignClient) return;
  
  try {
    
    // Disconnect all sessions
    const sessions = merchantSignClient.session.getAll();
    for (const session of sessions) {
      try {
        await merchantSignClient.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User cleared all connections" },
        });
      } catch (e) {
        console.log(`[MERCHANT] Failed to disconnect session ${session.topic}:`, e);
      }
    }
    
    // Delete all pairings
    const pairings = merchantSignClient.pairing.getAll();
    for (const pairing of pairings) {
      try {
        await merchantSignClient.core.pairing.disconnect({ topic: pairing.topic });
      } catch (e) {
        console.log(`[MERCHANT] Failed to delete pairing ${pairing.topic}:`, e);
      }
    }
    
    updateMerchantSessions();
    setStatus("All merchant pairings and sessions cleared", "green");
  } catch (error) {
    console.error("[MERCHANT] Failed to clear pairings:", error);
    setStatus(`Failed to clear: ${error}`, "red");
  }
};

onMounted(async () => {
  
  // Initialize Merchant SignClient (for merchant <-> this app)
  await initMerchantSignClient();
  
  // Initialize ID App connection (for this app <-> ID App)
  await initIdAppConnection();
  
});
</script>

<style scoped>
.qr-container {
  position: relative;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  min-height: 300px;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.qr-frame {
  width: 200px;
  height: 200px;
  border: 3px solid #3b82f6;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
}
</style>
