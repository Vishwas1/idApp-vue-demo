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

        <UButton class="mt-4" @click="payPlt">Pay {{ amount }} 0xbogac</UButton>
        <div>PLT TransactionHas: {{ pltTransactionHash }}</div>

        <br />
         <div class="mt-2">
          <strong>Request:</strong>
          <pre class="bg-gray-100 p-2 rounded text-sm">{{
            JSON.stringify(verifyPaymentRequest, null, 2)
          }}</pre>
        </div>
        <UButton type="success" @click="verify">Verify</UButton>
       

        <div class="mt-2">
          <strong>Response:</strong>
          <pre>{{ paymentVerificationResult }}</pre>
        </div>
        <br />
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { WalletConnectProvider, WalletProvider } from "../wallet-connect";
import {
  serializeUpdateContractParameters,
  AccountTransactionType,
  CcdAmount,
  toBuffer,
  CredentialRegistrationId,
  Parameter,
  Energy,
  AccountAddress,
  ConcordiumGRPCWebClient,
  serializeAccountTransactionPayload,
} from "@concordium/web-sdk";
import { encode } from "js-base64";
import {
  Cbor,
  CborMemo,
  TokenId,
  TokenAmount as TokenAmountPlt,
} from "@concordium/web-sdk/plt";
const selectedWalletType = ref<"browser" | "mobile" | null>(null);
const connectedAccount = ref("");
const activeProvider = ref<WalletProvider | null>(null);
const proofRequest = ref({});
const proofRequestJson = ref({});
const zk_proof = ref({});
const verifed = ref(false);
const amount = 1;
const challenge = ref<Record<string, any>>({});
const challengeRequest = ref<Record<string, any>>({});
const paymentVerificationResult = ref({});
const verifyPaymentRequest = ref<Record<string, any>>({});
const pltTransactionHash = ref("");

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
    context: "Payment",
    contextDetails: {
      amount: "1",
      purpose: "Testing payment flow",
      tokenSymbol: "0xbogac",
    },
  };
  challengeRequest.value = body;
  const resp = await fetch(`http://localhost:3006/api/v1/challenge`, {
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

async function payPlt() {
  try {
    let provider = window.concordium;
    const signatureInput = challenge.value.signatureInput;
    // const { challenge, statement } = challenge.value;
    signatureInput.payload.tokenSymbol = TokenId.fromString(
      signatureInput.payload.tokenSymbol
    );
    signatureInput.payload.operations = Cbor.encode(
      signatureInput.payload.operations.map((op) => ({
        transfer: {
          amount: TokenAmountPlt.fromJSON({
            value: parseTokenAmount(op.transfer.amount.value).toString(),
            decimals: op.transfer.amount.decimal,
          }),
          recipient: AccountAddress.fromBase58(op.transfer.recipient),
          memo: op.transfer.memo
            ? CborMemo.fromString(op.transfer.memo)
            : undefined,
        },
      }))
    );

    const result = await provider.sendTransaction(
      signatureInput.walletAddress,
      signatureInput.accountTransactionType,
      signatureInput.payload
    );
    pltTransactionHash.value = result;
  } catch (err) {
    console.error("Proof generation failed:", err);
  }
}

async function verify() {
  const accessToken = localStorage.getItem("accessToken");
  const body = { txHash: pltTransactionHash.value };
  verifyPaymentRequest.value = body;
  try {
    const resp = await fetch(`http://localhost:3006/api/v1/verify/tx-hash`, {
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
      paymentVerificationResult.value = json;
    }
  } catch (e) {
    verifed.value = false;
    throw new Error(e.message);
  }
}
function parseTokenAmount(amount: string, decimals = 0): bigint {
  const sanitizedAmount = removeNumberGrouping(amount);
  const parts = sanitizedAmount.split(".");
  const integerPart = parts[0] || "0";
  const fractionPart = parts[1]
    ? parts[1].padEnd(decimals, "0")
    : "".padEnd(decimals, "0");
  const combined = integerPart + fractionPart;
  return BigInt(combined);
}
const removeNumberGrouping = (amount: string) => amount.replace(/,/g, "");
</script>
