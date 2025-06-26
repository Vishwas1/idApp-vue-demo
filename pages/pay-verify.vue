<template>
  <UContainer>
    <div class="flex flex-col gap-2">
      <UCard style="width: 100%">
        <div class="flex items-center gap-2">
          <UButton @click="connectWallet">ConnectBrowserWallet</UButton>
          <UButton @click="handleMobileConnect">ConnectMobileWallet</UButton>
        </div>
        <div>ConnectedAccount: {{ connectedAccount }}</div>
        <h4>Enter WalletAddress:</h4>
        <div class="flex items-center gap-2">
          <UInput
            v-model="receiverWalletAddress"
            placeholder="Receiver walletAddress"
            class="flex-1"
          />
        </div>
        <h4>Enter Amount:</h4>
        <div class="flex items-center gap-2">
          <UInput
            v-model="amount"
            placeholder="Enter amount to pay"
            class="flex-1"
          />
        </div>
        <label for="memo">Enter Memo</label>
        <textarea
          id="memo"
          v-model="rawMemo"
          rows="4"
          placeholder="Enter memo (plain text or JSON)"
          class="w-full p-2 border border-gray-300 rounded"
        ></textarea>
        <br />
        <UButton type="success" @click="simpleCCDTransfer">Pay CCD </UButton>
        <div>CCD TransactionHas: {{ ccdTransactionHash }}</div>
        <UButton type="success" @click="PLTTransfer">Pay PLT</UButton>
        <div>PLT TransactionHas: {{ pltTransactionHash }}</div>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
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
import {
  Cbor,
  CborMemo,
  TokenId,
  TokenAmount as TokenAmountPlt,
} from "@concordium/web-sdk/plt";
import { ref } from "vue";
import { WalletConnectProvider, WalletProvider } from "../wallet-connect";
const selectedWalletType = ref<"browser" | "mobile" | null>(null);
const connectedAccount = ref("");
const activeProvider = ref<WalletProvider | null>(null);
const receiverWalletAddress = ref("");
const amount = ref("");
const ccdTransactionHash = ref("");
const pltTransactionHash = ref("");
const rawMemo = ref("");
import { Buffer } from "buffer";
/**
 * * Connect Browser wallet a proof Request
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
 * * Handle  Mobile wallet connection
 */

const handleMobileConnect = async () => {
  try {
    console.log("Getting provider instance...");
    const provider = await WalletConnectProvider.getInstance();
    await connectProvider(provider);
  } catch (e) {
    console.error("Error during mobile wallet connect:", e);
  }
};
/**
 * * Connect Mobile wallet
 */

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
 * * Genertae simple ccd transfer
 */

async function simpleCCDTransfer() {
  let memoInput = rawMemo.value?.trim();
  let memoString: string;
  let payload;
  let type;
  if (memoInput) {
    try {
      // If valid JSON, stringify it (to ensure formatting) then encode
      const parsed = JSON.parse(memoInput);
      memoString = JSON.stringify(parsed);
    } catch {
      // If not JSON, treat it as a plain string
      memoString = memoInput;
    }
    const encodedMemo = encode(memoString);
    payload = {
      amount: CcdAmount.fromMicroCcd(amount.value ? amount.value : 0),
      toAddress: AccountAddress.fromBase58(receiverWalletAddress.value),
      memo: encodedMemo,
    };
    type = AccountTransactionType.TransferWithMemo;
  } else {
    payload = {
      amount: CcdAmount.fromMicroCcd(amount.value ? amount.value : 0),
      toAddress: AccountAddress.fromBase58(receiverWalletAddress.value),
    };
    type = AccountTransactionType.Transfer;
  }
  let provider;
  if (selectedWalletType.value == "browser") {
    console.log("inside browser");
    provider = window.concordium;
    console.log(provider);
  } else {
    provider = activeProvider.value;
  }
  console.log(payload);
  const result = await provider.sendTransaction(
    connectedAccount.value,
    type,
    payload
  );
  console.log(result, "result");
  ccdTransactionHash.value = result;
}

async function PLTTransfer() {
  let memoInput = rawMemo.value?.trim();
  let payload;
  const decimal = 6;
  const ops = [
    {
      transfer: {
        amount: TokenAmountPlt.fromJSON({
          value: parseTokenAmount(amount.value, decimal).toString(),
          decimals: decimal,
        }),
        recipient: AccountAddress.fromBase58(receiverWalletAddress.value),
        memo: memoInput ? CborMemo.fromString(memoInput) : undefined,
      },
    },
  ];
  payload = {
    tokenSymbol: TokenId.fromString("0xbogac"),
    operations: Cbor.encode(ops),
  };

  let provider;
  if (selectedWalletType.value == "browser") {
    provider = window.concordium;
  } else {
    provider = activeProvider.value;
  }
  const result = await provider.sendTransaction(
    connectedAccount.value,
    AccountTransactionType.TokenHolder,
    payload
  );
  console.log(result);
  pltTransactionHash.value = result;
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
