import { useVerification } from "~/composables/useVerification";
import type { Ref } from "vue";

export const useChallengePresentation = (sdk: Ref<any>) => {
  const { requestChallenge, verifyProof } = useVerification();

  // Step 1: Request challenge from backend
  const requestChallengeFromBackend = async () => {
    const challengeData = await requestChallenge(
      "IDProofVerificationByIdapp",
      "testnet",
      18,
      "gte",
    );
    console.log("Challenge data received:", challengeData);
    return challengeData;
  };

  // Step 3: Verify presentation proof
  const verifyPresentationProof = async (data: any) => {
    const isValid = await verifyProof(data, "testnet");
    console.log("Proof validity:", isValid);

    // If valid, show success state
    if (isValid.verified) {
      console.log("Proof is valid!");
      await sdk.value?.showSuccessState();
      // Auto-close modal after 2 seconds
      // setTimeout(() => sdk.value?.closeModal(), 2000);
    } else {
      console.error("Verification failed:", isValid);
      sdk.value?.closeModal();
    }

    return isValid;
  };

  return {
    requestChallengeFromBackend,
    verifyPresentationProof,
  };
};
