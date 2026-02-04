import { ref } from 'vue';
import type { SessionTypes } from '@walletconnect/types';
import { createApiService } from '~/services/api.service';
import type { ChallengeResponse, VerificationResult } from '~/services/api.service';

export const useVerification = () => {
  const apiService = createApiService('testnet');
  const isVerifying = ref(false);
  const verificationError = ref<string | null>(null);

  /**
   * Step 1: Request challenge from backend
   * @param context - Verification context (e.g., 'IDProofVerificationByIdapp')
   * @param network - Network to use ('mainnet' | 'testnet')
   * @param age - Minimum age requirement
   * @param operator - Comparison operator ('gte' | 'lte' | 'eq')
   * @returns Challenge data from backend
   */
  const requestChallenge = async (
    context: string = 'IDProofVerificationByIdapp',
    network: string = 'testnet',
    age: number = 18,
    operator: 'gte' | 'lte' | 'eq' = 'gte'
  ): Promise<ChallengeResponse> => {
    try {
      verificationError.value = null;
      
      const challengeData = await apiService.initializeChallenge({
        context,
        network,
        contextDetails: {
          age,
          operator,
          proofType: ['AgeProof'],
        },
      });

      console.log('Challenge requested:', challengeData);
      return challengeData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request challenge';
      verificationError.value = errorMessage;
      throw new Error(errorMessage);
    }
  };

  /**
   * Step 2: Request verifiable presentation from wallet via WalletConnect
   * @param walletConnect - WalletConnect instance
   * @param challengeData - Challenge data from backend
   * @param sessionTopic - WalletConnect session topic
   * @param chainId - Chain ID (e.g., 'ccd:testnet' or 'ccd:mainnet')
   * @returns Verifiable presentation proof from wallet
   */
  const requestVerifiablePresentation = async (
    walletConnect: any,
    challengeData: ChallengeResponse,
    sessionTopic: string,
    chainId: string
  ): Promise<any> => {
    try {
      verificationError.value = null;

      if (!walletConnect) {
        throw new Error('WalletConnect not initialized');
      }

      const proof = await walletConnect.requestVerifiablePresentation(
        challengeData,
        sessionTopic,
        chainId
      );

      console.log('Verifiable presentation received:', proof);
      return proof;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request verifiable presentation';
      verificationError.value = errorMessage;
      throw new Error(errorMessage);
    }
  };

  /**
   * Step 3: Verify the proof with backend
   * @param proof - Verifiable presentation proof from wallet
   * @param network - Network used ('mainnet' | 'testnet')
   * @returns Verification result from backend
   */
  const verifyProof = async (
    proof: any,
    network: string = 'testnet'
  ): Promise<VerificationResult> => {
    try {
      verificationError.value = null;

      const result = await apiService.verifyPresentation({
        presentation: {
          presentationContext: proof?.verifiablePresentationJson?.presentationContext,
          proof: proof?.verifiablePresentationJson?.proof,
          type: proof?.verifiablePresentationJson?.type,
          verifiableCredential: proof?.verifiablePresentationJson?.verifiableCredential,
        },
        network,
      });

      console.log('Verification result:', result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify proof';
      verificationError.value = errorMessage;
      throw new Error(errorMessage);
    }
  };

  /**
   * Complete verification flow: challenge → presentation → verify
   * @param walletConnect - WalletConnect instance
   * @param session - WalletConnect session
   * @param chainId - Chain ID
   * @param options - Verification options
   * @returns Verification result
   */
  const performFullVerification = async (
    walletConnect: any,
    session: SessionTypes.Struct,
    chainId: string,
    options: {
      context?: string;
      network?: string;
      age?: number;
      operator?: 'gte' | 'lte' | 'eq';
    } = {}
  ): Promise<VerificationResult> => {
    isVerifying.value = true;
    verificationError.value = null;

    try {
      // Step 1: Request challenge
      const challengeData = await requestChallenge(
        options.context || 'IDProofVerificationByIdapp',
        options.network || 'testnet',
        options.age || 18,
        options.operator || 'gte'
      );

      // Step 2: Request verifiable presentation
      const proof = await requestVerifiablePresentation(
        walletConnect,
        challengeData,
        session.topic,
        chainId
      );

      // Step 3: Verify the proof
      const result = await verifyProof(proof, options.network || 'testnet');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      verificationError.value = errorMessage;
      throw new Error(errorMessage);
    } finally {
      isVerifying.value = false;
    }
  };

  return {
    // Individual step functions
    requestChallenge,
    requestVerifiablePresentation,
    verifyProof,
    
    // Complete flow
    performFullVerification,
    
    // State
    isVerifying,
    verificationError,
  };
};
