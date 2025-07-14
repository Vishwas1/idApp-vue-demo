// app-a.js
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import {
  ConcordiumIDAppSDK,
  type CreateAccountCreationRequestMessage,
  IDAppSdkWallectConnectMethods,
  type CreateAccountCreationResponse,
  type RecoverAccountCreationRequestMessage,
  Status,
  type RecoverAccountResponse,
  type RecoverAccountMsgType,
  type SerializedCredentialDeploymentDetails,
} from "id-app-sdk";
import type { CredentialDeploymentTransaction, HexString } from "@concordium/web-sdk";
import type { AccountWalletWC } from "./wallet-connect";

export class AccountWallet {
  accountWallet: AccountWalletWC
  seed: string
  constructor(acwallet: AccountWalletWC, seed?: string) {
    this.accountWallet = acwallet
    this.seed = seed? seed : generateMnemonic(wordlist, 256)
  }


  getWallet(){
    // const seed = generateMnemonic(wordlist, 256)
    const wallet = ConcordiumIDAppSDK.generateAccountWithSeedPhrase(this.seed, 'Testnet', 0)
    return wallet
  }

  async signTransaction(serializedCredentialDeploymentTransaction: SerializedCredentialDeploymentDetails){
    const wallet = this.getWallet()
    return await ConcordiumIDAppSDK.signCredentialTransaction(serializedCredentialDeploymentTransaction, wallet.signingKey);
  }

  async submitTransaction(credentialDeploymentTransaction: CredentialDeploymentTransaction, signature: HexString){
    // eslint-disable @typescript-eslint/no-explicit-any //
    return await ConcordiumIDAppSDK.submitCCDTransaction(credentialDeploymentTransaction, signature, 'Testnet')
  }

  async createCCDAccount(): Promise<{create_acc_resp?: CreateAccountCreationResponse, public_key?: string, account_address?:string, txHash?:string } | undefined> {
    try {

      const wallet = this.getWallet()
      const public_key = wallet.publicKey
      localStorage.setItem('pk', public_key)
      
      const new_account_request: CreateAccountCreationRequestMessage =
        ConcordiumIDAppSDK.getCreateAccountCreationRequest(public_key, "I want to create a new Concordium account");
      
      console.log('Sending account creation request with public_key ' + public_key)
      // const create_acc_resp: CreateAccountCreationResponse = await this.accountWallet.request(
      //   IDAppSdkWallectConnectMethods.CREATE_ACCOUNT,
      //   ConcordiumIDAppSDK.chainId,
      //   new_account_request)
        const create_acc_resp: CreateAccountCreationResponse = await this.accountWallet.request(
        IDAppSdkWallectConnectMethods.CREATE_ACCOUNT,
        new_account_request)

      return {create_acc_resp, public_key}

      // if (create_acc_resp.status == Status.SUCCESS) {
      //   const resp: CreateAccountResponseMsgType = create_acc_resp.message as CreateAccountResponseMsgType;
      //   console.log('Recieved account creation response account_address ' + resp.accountAddress)

      //   console.log('ConcordiumIDAppSDK.signCredentialTransaction ...')
      //   const signedCreddepTx: SignedCredentialDeploymentTransaction = await ConcordiumIDAppSDK.signCredentialTransaction(resp.serializedCredentialDeploymentTransaction, wallet.signingKey);

      //   console.log('ConcordiumIDAppSDK.submitCCDTransaction ...')
      //   const txHash = await ConcordiumIDAppSDK.submitCCDTransaction(signedCreddepTx.credentialDeploymentTransaction, signedCreddepTx.signature, 'Testnet')
      //   console.log({ txHash: txHash.toString() })

      //   return { account_address: resp.accountAddress, public_key, txHash }
      // } else {
      //   throw new Error("")
      // }
    } catch (e) {
      console.log(e)
    }
  }

  async recoverCCDAccount(public_key: string) {
    const account_recovery_request: RecoverAccountCreationRequestMessage = ConcordiumIDAppSDK.getRecoverAccountRecoveryRequest(public_key);
    console.log('Sending account recovery request with public_key ' + public_key)
    // const recover_acc_resp: RecoverAccountResponse = await this.accountWallet.request(IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT, ConcordiumIDAppSDK.chainId, account_recovery_request)
    const recover_acc_resp: RecoverAccountResponse = await this.accountWallet.request(IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT, account_recovery_request)
    if (recover_acc_resp.status == Status.SUCCESS) {
      const message: RecoverAccountMsgType = recover_acc_resp.message  as RecoverAccountMsgType
      console.log('Recieved account recovery response address ' + message.accountAddress)
      return { account_address: message.accountAddress }
    } else {
      console.log('Error in account recovery response: ' + recover_acc_resp.status)
      throw new Error("Could not reciever recovery response") ///// 
    }
  }
}


