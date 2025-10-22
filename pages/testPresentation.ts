/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  GivenContext,
  IdentityObjectV1,
  IdentityProvider,
  CommitmentInput,
  DIDString,
  SpecifiedCredentialStatement,
  CredentialStatement} from '@concordium/web-sdk';
import {
  VerifiablePresentationV1,
  createIdentityDID,
  ConcordiumHdWallet,
  createIdentityCommitmentInputWithHdWallet,
  ConcordiumGRPCWebClient,
  VerifiablePresentationRequestV1,
  sha256,
} from '@concordium/web-sdk';
import _JB from 'json-bigint';


import IdentityObject from '../id-object.json';
import IdpList from '../idp-testnet.json';
import presentationRequest from '../presentation-request.json'

const JSONBig = _JB({ useNativeBigInt: true, alwaysParseAsBig: true });

export async function computeAnchorHash(
  context: unknown,
  credentialStatements: unknown
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const contextBytes = encoder.encode(JSONBig.stringify(context));
  const statementsBytes = encoder.encode(JSONBig.stringify(credentialStatements));

  // Sequential update simulation using Web Crypto API
  // Concatenate manually, as subtle.digest doesn't support incremental updates
  const combined = new Uint8Array(contextBytes.length + statementsBytes.length);
  combined.set(contextBytes, 0);
  combined.set(statementsBytes, contextBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return new Uint8Array(hashBuffer);
}

const testnet  = {
  genesisHash: '4221332d34e1694168c2a0c0b3fd0f273809612cb13d000d5c2e00e85f50f796',
  name: 'Concordium Testnet',
  walletProxyBaseUrl: 'https://wallet-proxy.testnet.concordium.com',
  grpcPort: 20000,
  grpcUrl: 'https://grpc.testnet.concordium.com',
  ccdScanUrl: 'https://testnet.ccdscan.io/',
}

export class TestConcordiumService {
  
  async getPresentation(): Promise<VerifiablePresentationV1.Type> {    

    if(!presentationRequest){
        throw new Error('Presentation request file not found');
    }

    const vpr = VerifiablePresentationRequestV1.fromJSON(presentationRequest as VerifiablePresentationRequestV1.JSON)
    
    if (!IdpList) {
      throw new Error('IDP Testnet file not found');
    }

    const contextValues: GivenContext[] = [
      { label: 'ResourceID', context: 'connection-id-001' },
    ];
    const client = new ConcordiumGRPCWebClient(testnet.grpcUrl, testnet.grpcPort);
    const idObject: IdentityObjectV1 = IdentityObject.idObject.value;
    const identityProvider: IdentityProvider = IdpList?.find(
      (x) => x.ipInfo.ipIdentity == IdentityObject.providerIndex,
    ) as IdentityProvider;
    const identityIndex = IdentityObject.index;
    const seed =
      'wrong cloth thank upgrade fee harsh pumpkin future letter artefact end home upon camp curious quality report hope stamp voyage chalk youth review average';
    const wallet: ConcordiumHdWallet = ConcordiumHdWallet.fromSeedPhrase(
      seed,
      'Testnet',
    );

    const selectedCredentialIds: DIDString[] = [
      createIdentityDID('Testnet', IdentityObject.providerIndex, identityIndex),
    ];

    console.log(selectedCredentialIds);

    const statements: SpecifiedCredentialStatement[] = selectedCredentialIds.map((id, i) => ({
      id,
      statement: presentationRequest.credentialStatements[i]?.statement,
    })) as SpecifiedCredentialStatement[];

    const inputs: CommitmentInput[] = [
      createIdentityCommitmentInputWithHdWallet(
        idObject,
        identityProvider,
        identityIndex,
        wallet,
      ),
    ];
 

    const presentation = await VerifiablePresentationV1.createFromAnchor(
      client,
      vpr,
      statements,
      inputs,
      contextValues,
    );
 

    console.log('Presentation created:', presentation);

    return presentation;
  }
}
