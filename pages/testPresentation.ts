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
} from '@concordium/web-sdk';
import _JB from 'json-bigint';


import IdentityObject from '../id-object.json';
import IdpList from '../idp-testnet.json';
import presentationRequest from '../presentation-request.json'


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
