<template>
  <div class="container mx-auto p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span>Connect SDK</span>
        <button
          @click="connectWalletSDKManaged()"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            isToggled ? 'bg-blue-600' : 'bg-gray-300',
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              isToggled ? 'translate-x-6' : 'translate-x-1',
            ]"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { ConcordiumMerchantSDK } from "merchant-sdk";
import "merchant-sdk/dist/concordium-merchant-sdk.css";
import { useVerification } from "~/composables/useVerification";

const isToggled = ref(false);
const connected = ref(false);
const sdk = ref<ConcordiumMerchantSDK | null>(null);

// Initialize verification composable
const { requestChallenge, verifyProof } = useVerification();

const connectWalletSDKManaged = async () => {
  isToggled.value = !isToggled.value;

  if (!isToggled.value) {
    return;
  }

  if (!sdk.value) {
    initSDK();
  }

  try {
    // NEW API: renderUIModals() automatically initializes WalletConnect
    // SDK handles WalletConnect initialization, QR generation, and session management
    await sdk.value!.renderUIModals();
  } catch (error) {
    console.error("SDK-managed mode error:", error);
    isToggled.value = false;
  }
};

const initSDK = () => {
  sdk.value = new ConcordiumMerchantSDK({
    network: "testnet",
    // New API: projectId and metadata at top level
    projectId: "60b3730563f0be9f7ed3776d813f6498",
    metadata: {
      name: "Merchant SDK Demo",
      description: "Merchant dApp using Concordium ID verification",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
  });
};

// Reusable function to handle challenge request and presentation
const handleChallengeAndPresentation = async (sessionData: any) => {
  try {
    console.log("handleChallengeAndPresentation called with sessionData:", sessionData);
    
    // Step 1: Request challenge from backend
    const challengeData = await requestChallenge(
      "IDProofVerificationByIdapp",
      "testnet",
      18,
      "gte",
    );
    console.log("Challenge data received:", challengeData);

    if (challengeData) {
      // Step 2: Send presentation request to SDK
      // In SDK-managed mode, don't pass sessionTopic - let SDK use its internal session
      await sdk.value?.sendPresentationRequest(challengeData?.presentationRequest, sessionData?.topic);
    }
  } catch (error) {
    console.error("Error in challenge/presentation flow:", error);
    // sdk.value?.closeModal();
  }
};

// Handle SDK events using window event listener
const handleSDKEvent = async (event: any) => {
  const { type, data } = event.detail;

  console.log("SDK Event:", type, data);

  switch (type) {
    case "active_session":
      connected.value = true;
      console.log("Active session detected:", data);
      // Session already exists, request challenge and presentation
      await handleChallengeAndPresentation(data);
      break;

    case "session_approved":
      connected.value = true;
      console.log("Session approved!", data);
      // New session approved, wait a moment for SDK to store session, then request challenge and presentation
      await new Promise(resolve => setTimeout(resolve, 500));
      await handleChallengeAndPresentation(data);
      break;

    case "presentation_received":
      console.log("Presentation received:", data);
      // Verify the ZKP proof here
      const isValid = await verifyProof(data, "testnet");
      console.log("Proof validity:", isValid);

      // If valid, show success state
      if (isValid.verified) {
        console.log("Proof is valid!");
        await sdk.value?.showSuccessState();
      }
      // Auto-close modal after 2 seconds
      setTimeout(() => sdk.value?.closeModal(), 2000);
      break;

    case "session_disconnected":
      connected.value = false;
      isToggled.value = false;
      console.log("Session disconnected:", data);
      break;

    case "error":
      console.error("SDK Error:", data);
      isToggled.value = false;
      break;
  }
};

onMounted(() => {
  // Listen to SDK events
  window.addEventListener("concordium-merchant-sdk-event", handleSDKEvent);
});

onBeforeUnmount(() => {
  // Clean up event listener
  window.removeEventListener("concordium-merchant-sdk-event", handleSDKEvent);
});
</script>
