<template>
  <UContainer>
    <UCard>
      <div class="p-4 space-y-4">
       <h2 class="text-xl font-bold mb-4">ZKP Verification - Scan Merchant QR</h2>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
        <div v-if="status" class="text-green-600 text-sm">{{ status }}</div>

        <div class="space-y-2">
          <label class="block text-sm font-medium">Wallet URI</label>
          <div class="flex gap-2">
            <UInput
              v-model="walletUri"
              placeholder="wc:..."
              class="flex-1"
              size="sm"
              :disabled="!isInitialized"
            />
            <UButton
              color="primary"
              size="sm"
              :disabled="!canPair"
              :loading="isPairing"
              @click="pairWithUri"
            >
              {{ isPairing ? "Pairing..." : "Pair" }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from "vue";
import type { SessionTypes, SignClientTypes } from "@walletconnect/types";
import { ConcordiumIDAppPoup, IDAppSdkWallectConnectMethods, ConcordiumIDAppSDK } from "@concordium/id-app-sdk";

type SignClientInstance = Awaited<
  ReturnType<typeof import("@walletconnect/sign-client").SignClient.init>
>;

// Constants
const PROJECT_ID = "8b6c46b9127ce91195745c124870244e";
const CHAIN_ID =  ConcordiumIDAppSDK.chainId.Testnet; // "ccd:4221332d34e1694168c2a0c0b3fd0f27";
const METHOD_VP = IDAppSdkWallectConnectMethods.REQUEST_VP_V1;  //"request_verifiable_presentation_v1";

// State
const walletUri = ref("");
const isPairing = ref(false);
const isInitialized = ref(false);
const error = ref<string | null>(null);
const status = ref<string | null>(null);
const signClient = shallowRef<SignClientInstance | null>(null);
const idAppSession = shallowRef<SessionTypes.Struct | null>(null);
const showGenerateProofPopup = ref(false);

// Helper to set status with color
function setStatus(message: string, color: "green" | "red") {
  if (color === "red") {
    error.value = message;
    status.value = null;
  } else {
    status.value = message;
    error.value = null;
  }
}

// Computed
const canPair = computed(
  () => isInitialized.value && walletUri.value.trim() && !isPairing.value,
);

// Initialize SignClient lazily on mount
onMounted(async () => {
  try {
    const { SignClient } = await import("@walletconnect/sign-client");
    signClient.value = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: "Account Wallet",
        description: "Account Wallet for Concordium",
        url: "https://example.com",
        icons: [],
      },
    });

    setupSessionRequestHandler();
    isInitialized.value = true;
  } catch (e) {
    error.value = "Failed to initialize WalletConnect";
    console.error("SignClient init error:", e);
  }
});

onUnmounted(() => {
  // Cleanup: disconnect active sessions if needed
  signClient.value = null;
});

/**
 * Setup handler for incoming session requests from websites
 */
function setupSessionRequestHandler() {
  if (!signClient.value) return;

  // Handle session proposals (required for pairing)
  signClient.value.on("session_proposal", async (proposal) => {
    console.log("Received session proposal:", proposal);

    try {
      const { id, params } = proposal;
      const { requiredNamespaces, optionalNamespaces } = params;

      // Build namespaces response based on required/optional namespaces
      const namespaces: Record<
        string,
        { accounts: string[]; methods: string[]; events: string[] }
      > = {};

      // Handle required namespaces
      for (const [key, value] of Object.entries(requiredNamespaces || {})) {
        namespaces[key] = {
          accounts: value.chains?.map((chain) => `${chain}:account`) || [],
          methods: value.methods || [],
          events: value.events || [],
        };
      }

      // Handle optional namespaces
      for (const [key, value] of Object.entries(optionalNamespaces || {})) {
        if (!namespaces[key]) {
          namespaces[key] = {
            accounts: value.chains?.map((chain) => `${chain}:account`) || [],
            methods: value.methods || [],
            events: value.events || [],
          };
        }
      }

      const session = await signClient.value!.approve({ id, namespaces });
      console.log("Session approved:", session);
      status.value = "Session approved";
    } catch (e) {
      console.error("Failed to approve session:", e);
      error.value =
        e instanceof Error ? e.message : "Failed to approve session";
    }
  });

  signClient.value.on(
    "session_request",
    async (event: SignClientTypes.EventArguments["session_request"]) => {
      const { topic, params, id } = event;
      const { request } = params;

      if (request.method !== METHOD_VP) return;

      console.log(
        "Received Identity Request from Website. Bridging to IDApp...",
      );

      try {
        // Get or create IDApp session
        const session = idAppSession.value ?? (await connectToIDApp());
        if (!session) throw new Error("Failed to connect to IDApp");

        // Forward request to IDApp
        const idAppResponse = await signClient.value!.request({
          topic: session.topic,
          chainId: CHAIN_ID,
          request: {
            method: METHOD_VP,
            params: request.params,
          },
        });

        // Send proof back to Website
        await signClient.value!.respond({
          topic,
          response: { id, result: idAppResponse, jsonrpc: "2.0" },
        });

        console.log("Proof successfully bridged to Website.");
        ConcordiumIDAppPoup.closePopup();
        status.value = "Proof successfully sent";
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "User rejected or IDApp error";
        await signClient.value!.respond({
          topic,
          response: {
            id,
            error: { code: 5000, message: errorMessage },
            jsonrpc: "2.0",
          },
        });
        error.value = errorMessage;
      }
    },
  );
}

/**
 * Pair with a wallet using the provided URI
 */
async function pairWithUri() {
  if (!signClient.value || !walletUri.value.trim()) return;

  isPairing.value = true;
  error.value = null;
  status.value = null;

  try {
    await signClient.value.pair({ uri: walletUri.value.trim() });
    status.value = "Pairing successful";
    walletUri.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Pairing failed";
    console.error("Pairing error:", e);
  } finally {
    isPairing.value = false;
  }
}

/**
 * Connect to IDApp via WalletConnect
 */
async function connectToIDApp(): Promise<SessionTypes.Struct | null> {
  if (!signClient.value) return null;

  try {
    const { uri, approval } = await signClient.value.connect({
      requiredNamespaces: {
        ccd: {
          methods: [METHOD_VP],
          chains: [CHAIN_ID],
          events: [],
        },
      },
    });

    if (uri) {
      console.log("Opening IDApp with URI:", uri);
      ConcordiumIDAppPoup.invokeIdAppDeepLinkPopup({
        walletConnectUri: uri,
        actionType: "generate-proof",
      });
    }

    const session = await approval();
    idAppSession.value = session;
    await showGenerateProofDialog();
    return session;
  } catch (e) {
    console.error("IDApp connection error:", e);
    return null;
  }
}

/**
 * Show generate proof dialog after IDApp session is approved
 */
async function showGenerateProofDialog() {
  showGenerateProofPopup.value = true;
  setStatus("Session approved! Ready to generate proof.", "green");

  if (signClient.value && idAppSession.value) {
    const sessionTopic = idAppSession.value.topic;
    if (!sessionTopic) {
      setStatus("No ID App session found", "red");
      return;
    }

    ConcordiumIDAppPoup.invokeIdAppActionsPopup({
      onGenerateProof: async () => {
        await generateProof();
      },
      walletConnectSessionTopic: sessionTopic,
    });
  }
}

/**
 * Generate proof by sending request to IDApp
 */
async function generateProof() {
  if (!signClient.value || !idAppSession.value) {
    setStatus("No IDApp session available", "red");
    return;
  }

  try {
    setStatus("Generating proof...", "green");
    const response = await signClient.value.request({
      topic: idAppSession.value.topic,
      chainId: CHAIN_ID,
      request: {
        method: METHOD_VP,
        params: {},
      },
    });
    console.log("Proof generated:", response);
    setStatus("Proof generated successfully!", "green");
  } catch (e) {
    console.error("Generate proof error:", e);
    setStatus(
      e instanceof Error ? e.message : "Failed to generate proof",
      "red",
    );
  }
}
</script>
