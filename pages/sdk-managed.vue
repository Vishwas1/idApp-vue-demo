<template>
  <UContainer>
    <UCard>
      <div class="container mx-auto p-4">
        <button
          @click="connectWalletSDKManaged()"
          :class="[
            'px-6 py-2 rounded-lg font-medium transition-colors border',
            isToggled
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50',
          ]"
        >
          {{ connected ? "Connected" : (isToggled ? "Connecting..." : "Connect SDK Wallet") }}
        </button>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { ConcordiumVerificationWebUI } from '@concordium/verification-web-ui';
import '@concordium/verification-web-ui/styles';
import { useChallengePresentation } from "~/composables/useChallengePresentation";

const isToggled = ref(false);
const connected = ref(false);
const sdk = ref<ConcordiumVerificationWebUI | null>(null);

// Initialize challenge presentation composable
const { requestChallengeFromBackend, verifyPresentationProof } = useChallengePresentation(sdk);

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
  sdk.value = new ConcordiumVerificationWebUI({
    network: "testnet",
    // New API: projectId and metadata at top level
    projectId: "60b3730563f0be9f7ed3776d813f6498",
    metadata: {
      name: "Concordium Merchant SDK",
      description: "Merchant dApp using Concordium ID verification",
      url: window.location.origin,
      icons: [`${window.location.origin}/Concordium.png`],
    },
  });
};

// Step 2: Send presentation request to SDK
const sendPresentationRequest = async (challengeData: any, sessionData: any) => {
  if (!challengeData) {
    throw new Error("No challenge data available");
  }
  
  // In SDK-managed mode, don't pass sessionTopic - let SDK use its internal session
  await sdk.value?.sendPresentationRequest(
    challengeData?.presentationRequest,
    sessionData?.topic,
  );
};

// Orchestrate the challenge and presentation request flow
const handleChallengeAndPresentationRequest = async (sessionData: any) => {
  try {
    console.log(
      "handleChallengeAndPresentationRequest called with sessionData:",
      sessionData,
    );

    const challengeData = await requestChallengeFromBackend();
    await sendPresentationRequest(challengeData, sessionData);
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
      await handleChallengeAndPresentationRequest(data);
      break;

    case "session_approved":
      connected.value = true;
      console.log("Session approved!", data);
      // New session approved, wait a moment for SDK to store session, then request challenge and presentation
      await new Promise((resolve) => setTimeout(resolve, 500));
      await handleChallengeAndPresentationRequest(data);
      break;

    case "presentation_received":
      console.log("Presentation received:", data);
      // Step 3: Verify the ZKP proof
      await verifyPresentationProof(data);
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
  window.addEventListener("verification-web-ui-event", handleSDKEvent);
});

onBeforeUnmount(() => {
  // Clean up event listener
  window.removeEventListener("verification-web-ui-event", handleSDKEvent);
});
</script>
