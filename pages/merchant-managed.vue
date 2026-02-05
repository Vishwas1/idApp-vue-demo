<template>
  <div class="container mx-auto p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span>Connect SDK</span>
        <button
          @click="connectWalletMerchantProvided()"
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
import "merchant-sdk/dist/merchant-sdk.css";
import { AccountWalletWC } from "~/account-wallet";
import { useVerification } from "~/composables/useVerification";

const isToggled = ref(false);
const connected = ref(false);
const sdk = ref<ConcordiumMerchantSDK | null>(null);
const accountWalletConnect = ref<AccountWalletWC>();

// Initialize verification composable
const { requestChallenge, verifyProof } = useVerification();

// Initialize SDK once
const initSDK = (walletConnectURI?: string) => {
  if (!sdk.value) {
    sdk.value = new ConcordiumMerchantSDK({
      network: "testnet",
      // walletConnectUri: walletConnectURI,
    });
  }
};

const connectWalletMerchantProvided = async () => {
  isToggled.value = !isToggled.value;

  if (!isToggled.value) {
    return;
  }

  try {
    // Initialize merchant-managed WalletConnect client
    accountWalletConnect.value = new AccountWalletWC();

    // Set up callback for when session is approved
    accountWalletConnect.value.onSessionApproved = async (session) => {
      console.log("Session approved callback triggered:", session);
      connected.value = true;
      await sdk.value?.showModal("processing");
      await handleChallengeAndPresentation(session);
    };

    await accountWalletConnect.value.initClient();

    // Check if there's already an active session
    const existingSession = accountWalletConnect.value.getMostNewSession();

    if (existingSession) {
      console.log("Found existing session:", existingSession);
      connected.value = true;
      await sdk.value?.showModal("processing");
      // Request challenge and presentation for existing session
      await handleChallengeAndPresentation(existingSession);
    } else {
      // No existing session, need to connect
      const wcUri = await accountWalletConnect.value.connect("ccd:testnet");

      if (wcUri) {
        // Initialize SDK with the WC URI and render modals
        initSDK(wcUri);
        await sdk.value?.renderUIModals();
        // Wait for session to be established (will be handled by presentation_received event)
      }
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    isToggled.value = false;
  }
};

// Reusable function to handle challenge request and presentation
const handleChallengeAndPresentation = async (sessionData: any) => {
  try {
    // Step 1: Request challenge from backend
    const challengeData = await requestChallenge(
      "IDProofVerificationByIdapp",
      "testnet",
      18,
      "gte",
    );
    console.log("Challenge data received:", challengeData);

    if (challengeData && accountWalletConnect.value) {
      // Step 2: Send presentation request through merchant's WalletConnect client
      const session = accountWalletConnect.value.getMostNewSession();
      if (session) {
        // In merchant-managed mode, you send the request through your own WC client
        console.log("Sending presentation request via merchant WC client");

        const chainId = "ccd:4221332d34e1694168c2a0c0b3fd0f27"; // testnet chainId
        const proof = await accountWalletConnect.value.request(
          "request_verifiable_presentation_v1",
          chainId,
          challengeData.presentationRequest,
        );

        console.log("Presentation response received:", proof);

        // Verify the ZKP proof with backend
        const verificationResult = await verifyProof(proof, "testnet");
        console.log("Proof validity:", verificationResult);

        // If valid, show success state
        if (verificationResult.verified) {
          console.log("Proof is valid!");
          await sdk.value?.showSuccessState();

          // Auto-close modal after 2 seconds
          setTimeout(() => sdk.value?.closeModal(), 2000);
        } else {
          console.error("Verification failed:", verificationResult);
          sdk.value?.closeModal();
        }
      }
    }
  } catch (error) {
    console.error("Error in challenge/presentation flow:", error);
    sdk.value?.closeModal();
  }
};

// Handle SDK events using window event listener
const handleSDKEvent = async (event: any) => {
  const { type, data } = event.detail;

  console.log("SDK Event:", type, data);

  switch (type) {
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
