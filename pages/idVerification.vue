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

        <UButton class="mt-4" @click="generateZkProofPresentation"
          >Verify 18 +</UButton
        >
        <div class="mt-2">
          <strong>ZK Proof:</strong>
          <pre class="bg-gray-100 p-2 rounded text-sm">{{
            JSON.stringify(zk_proof, null, 2)
          }}</pre>
        </div>
        <br />
         <div class="mt-2">
          <strong>Request:</strong>
          <pre class="bg-gray-100 p-2 rounded text-sm">{{
            JSON.stringify(verifyZKProofRequest, null, 2)
          }}</pre>
        </div>
        <UButton type="success" @click="verify">Verify Identity</UButton>
        <div class="mt-2">
          <strong>Response:</strong>
          <pre>{{ presentationVerificationResult }}</pre>
        </div>
        <br />
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
const proofRequest = ref({});
const proofRequestJson = ref({});
const zk_proof = ref({});
const verifed = ref(false);

const challenge = ref<Record<string, any>>({});
const challengeRequest = ref<Record<string, any>>({});
const presentationVerificationResult = ref({});
const verifyZKProofRequest = ref<Record<string, any>>({});

import { Buffer } from "buffer";

/**
 * Generate Challenge
 */
async function generateChallenge() {
  const accessToken = localStorage.getItem("accessToken");
  const walletInfo = JSON.parse(
    localStorage.getItem("connectedWallet") || "{}"
  );
  console.log(accessToken);
  const body = {
    walletAddress: walletInfo.walletAddress,
    context: "IDProofVerification",
    network: "devnet",
    contextDetails: {
      age: 18,
      operator: "gte",
      proofType: "AgeProof",
    },
  };
  challengeRequest.value = body;
  const resp = await fetch(`http://ai-plugin.nanocorp.io:3006/api/v1/challenge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": "concordium_secret",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error("Unable to generate challenge");
  } else {
    const json = await resp.json();
    challenge.value = json;
  }
}

/**
 * Generate ZK proof
 */

async function generateZkProofPresentation() {
  console.log("insdie gener");
  console.log(challenge.value);

  try {
    let provider = window.concordium;
    // if (selectedWalletType.value == "browser") {
    //   provider = window.concordium;
    // } else {
    //   provider = activeProvider.value;
    // }
    console.log(provider);
    console.log(challenge.value);
    const signatureInput = challenge.value.signatureInput;
    // const { challenge, statement } = challenge.value;
    const proof = await provider.requestVerifiablePresentation(
      signatureInput.challenge,
      signatureInput.statement
    );
    zk_proof.value = proof;
    console.log(proof, "zk proof");
  } catch (err) {
    console.error("Proof generation failed:", err);
  }
}

async function verify() {
  const accessToken = localStorage.getItem("accessToken");

  const presentationToVerify = zk_proof.value;
  const body = { ...presentationToVerify, network: "devnet" };
  verifyZKProofRequest.value = presentationToVerify;
  try {
    const resp = await fetch(`http://ai-plugin.nanocorp.io:3006/api/v1/verify/id-proof`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": "concordium_secret",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error("Presentation not verified");
    } else {
      const json = await resp.json();
      presentationVerificationResult.value = json;
    }
  } catch (e) {
    verifed.value = false;
    throw new Error(e.message);
  }
}
</script>
