import type { Network, AtomicStatementV2 } from '@concordium/web-sdk';

export const network: Network = 'Testnet';

// Local storage keys
export const seedPhraseKey = 'seed-phrase';
export const selectedIdentityProviderKey = 'selected-identity-provider';
export const identityObjectKey = 'identity-object';

// The indices of the identity and the credential deployed on the account.
// These are static in this example as we only create a single identity and
// a single credential.
export const identityIndex = 0;
export const credNumber = 0;

// Connection parameters that determine the node that the wallet
// connects to.
export const nodeAddress = 'https://grpc.testnet.concordium.com';
export const nodePort = 20000;

// Base URL for the wallet proxy.
export const walletProxyBaseUrl = 'https://wallet-proxy.testnet.concordium.com';

// Base URL for CCDscan. This is used to link to a submitted transaction.
export const ccdscanBaseUrl = 'https://testnet.ccdscan.io';

// Context string for and generating ZK proofs
export const CONTEXT_STRING = "CONCORDIUM_COMPLIANT_REWARD_DISTRIBUTION_DAPP";

// ZK statements for the verifiable presentation
export const ZK_STATEMENTS = [
    {
        type: "RevealAttribute",
        attributeTag: "nationalIdNo",
    },
    {
        type: "RevealAttribute",
        attributeTag: "nationality",
    },
    {
        type: "AttributeInRange",
        attributeTag: "dob",
        lower: "18000101",
        upper: "20060802",  // Ensures user is over 18 years old
    },
    {
        type: "AttributeNotInSet",
        attributeTag: "countryOfResidence",
        set: ["US", "KP", "RU"],  // Not from USA, North Korea, or Russia
    },
] as AtomicStatementV2[];
export const RECENT_BLOCK_DURATION = 10n;
