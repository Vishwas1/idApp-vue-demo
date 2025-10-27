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
  CredentialStatement,
  CredentialStatements,
  verifyAtomicStatements,
  AtomicStatementV2,
} from '@concordium/web-sdk';
import {
  VerifiablePresentationV1,
  createIdentityDID,
  ConcordiumHdWallet,
  createIdentityCommitmentInputWithHdWallet,
  ConcordiumGRPCWebClient,
  VerifiablePresentationRequestV1,
  canProveCredentialStatement,
  isAccountCredentialStatement,
  isIdentityCredentialStatement,
  canProveAtomicStatement,
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

    
    const vpr: VerifiablePresentationRequestV1.Type = VerifiablePresentationRequestV1.fromJSON(presentationRequest as VerifiablePresentationRequestV1.JSON)
    const credentialStatements: CredentialStatements = vpr.credentialStatements;
    
    credentialStatements.forEach(credStatement => {
      // this gives cumulative result 
      const cumulativeResult  = canProveCredentialStatement(credStatement, IdentityObject.idObject.value.attributeList.chosenAttributes)
      console.log('Cumulative check results of ALL Atomic Statements  = ' + cumulativeResult)

      if(!cumulativeResult){
        console.log('One or more criteia did not match')
        const atomicCredentialStatements: AtomicStatementV2[] = credStatement.statement;
        // This is gives results for each atomic statement, returns true/false 
        atomicCredentialStatements.forEach(atomicStatement => {
          console.log('Check each for ' + atomicStatement.type + ' = ' + canProveAtomicStatement(atomicStatement, IdentityObject.idObject.value.attributeList.chosenAttributes))
        })  
      }
    })
    
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
      'throw action salad convince north kit zero rude mango whip dinner situate remove maple oval draw diesel envelope inmate laptop hill visa magic stand';
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
 

    console.log('Presentation created:', JSON.stringify(presentation, null, 2));

    return presentation;
  }
}
