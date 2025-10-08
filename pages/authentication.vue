<template>
  <UContainer>
    <div class="flex flex-col gap-2">
      <UCard style="width: 100%">
          <div class="mt-2">
          <strong>Request:</strong>
          <pre class="bg-gray-100 p-2 rounded text-sm">{{
            JSON.stringify(challengeRequest, null, 2)
          }}</pre>
        </div>
        <div class="flex items-center gap-2">
          <UButton @click="generateChallenge">Generate Challenge</UButton>
        </div>
        <div class="mt-2">
          <strong>Response:</strong>
          <pre class="bg-gray-100 p-2 rounded text-sm">{{
            JSON.stringify(challenge, null, 2)
          }}</pre>
        </div>

        <UButton class="mt-4" @click="sign">Sign In</UButton>
        <div v-if="connectedAccount" class="mt-2 text-sm text-gray-600">
          Connected Wallet:
          <span class="font-mono text-black">{{ connectedAccount }}</span>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { WalletConnectProvider, WalletProvider } from "../wallet-connect";
const selectedWalletType = ref<"browser" | "mobile" | null>(null);
const connectedAccount = ref("");
const activeProvider = ref<WalletProvider | null>(null);

const challenge = ref<Record<string, any>>({});
const challengeRequest = ref<Record<string, any>>({});

import { Buffer } from "buffer";

/**
 * Connect Browser Wallet
 */
async function connectWallet() {
  if (!window.concordium) {
    alert("Concordium Browser Wallet not found. Please install it.");
    return;
  }
  selectedWalletType.value = "browser";
  try {
    const accounts = await window.concordium.connect();
    connectedAccount.value = accounts;
  } catch (err) {
    console.error("Wallet connection error:", err);
  }
}

/**
 * Connect Mobile Wallet
 */
const handleMobileConnect = async () => {
  try {
    const provider = await WalletConnectProvider.getInstance();
    await connectProvider(provider);
  } catch (e) {
    console.error("Error during mobile wallet connect:", e);
  }
};

const connectProvider = async (provider: WalletProvider) => {
  try {
    const walletProvider = await provider.connect();
    selectedWalletType.value = "mobile";
    activeProvider.value = provider;
    connectedAccount.value = walletProvider[0];
  } catch (error) {
    console.error("Error connecting provider:", error);
  }
};

/**
 * Generate Challenge
 */
async function generateChallenge() {
  const body = { context: "Login" };
  challengeRequest.value = body;
  const resp = await fetch(`http://ai-plugin.nanocorp.io:3006/api/v1/challenge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": "concordium_secret",
    },
    body: JSON.stringify({
      context: "Login",
      network: "devnet",
    }),
  });
  if (!resp.ok) {
    throw new Error("Unable to generate challenge");
  } else {
    const json = await resp.json();
    challenge.value = json;
  }
}

/**
 * Sign the Challenge
 */
async function sign() {
  const challengeText = challenge.value?.signatureInput?.challenge;
  if (!challengeText) {
    alert("No challenge available to sign.");
    return;
  }

  // Connect if needed
  if (!connectedAccount.value) {
    await connectWallet();
    if (!connectedAccount.value) {
      alert("Wallet not connected.");
      return;
    }
  }

  try {
    const signature = await window.concordium.signMessage(
      connectedAccount.value,
      challengeText
    );

    const signedData = {
      walletAddress: connectedAccount.value,
      signature,
      challenge: challengeText,
    };
    localStorage.setItem("connectedWallet", JSON.stringify(signedData));
    await generateAccessToken();
  } catch (err) {
    console.error("Signing failed:", err);
    alert("Signing failed. Check console.");
  }
}

async function generateAccessToken() {
  const walletInfo = JSON.parse(
    localStorage.getItem("connectedWallet") || "{}"
  );

  if (
    !walletInfo.walletAddress ||
    !walletInfo.signature ||
    !walletInfo.challenge
  ) {
    console.error("Missing wallet info in localStorage");
    return;
  }
  let signature = walletInfo?.signature;

  if (typeof signature === "object" && signature !== null && "0" in signature) {
    signature = signature[0];

    if (
      typeof signature === "object" &&
      signature !== null &&
      "0" in signature
    ) {
      signature = signature[0]; // ✅ final string value
    }
  }
  const resp = await fetch(`http://ai-plugin.nanocorp.io:3006/api/v1/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": "concordium_secret",
    },
    body: JSON.stringify({
      walletAddress: walletInfo.walletAddress,
      signature: signature,
      challenge: walletInfo.challenge,
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    console.error("Failed to authenticate:", error);
    return;
  }

  const result = await resp.json();
  localStorage.setItem("accessToken", result.accessToken);
}
</script>
