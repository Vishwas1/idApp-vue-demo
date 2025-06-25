// app-a.js
import { SignClient } from "@walletconnect/sign-client";
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
  ConcordiumIDAppPoup,
  type SerializedCredentialDeploymentDetails,
  type CreateAccountResponseMsgType,
  type SignedCredentialDeploymentTransaction,
} from "id-app-sdk";
import type { CredentialDeploymentTransaction, HexString } from "@concordium/web-sdk";

const projectId = "8b6c46b9127ce91195745c124870244e";

export class AccountWalletWC {
  private wc_client: any
  public session: any = null
  private approval: any
  public uri: string = "";
  
  async initClient() {
    this.wc_client = await SignClient.init({
      projectId,
      metadata: {
        name: "App A",
        description: "dApp initiating connection",
        url: "localhost:3000",
        icons: ["https://app-a.com/icon.png"],
      },
    });

    // events...
    this.wc_client.on("session_event", (event: any) => {
      const { event: emittedEvent } = event;
      console.log("🎉 Aaccount wallet received:" + emittedEvent.data.message);
      alert("🎉 Aaccount wallet received:" + emittedEvent.data.message);

      // if (emittedEvent.name === "custom_message_from_b") {
      //   console.log("🎉 App A received:", emittedEvent.data.message);
      // }
    });
  }

  async connect(chainId: string = "eip155:1") {
    try {
      if (!this.wc_client) throw new Error("SDK not initialized");

      // Create pairing URI
      console.log("Before connecting...");

      const pendingRequest = this.wc_client.getPendingSessionRequests();
      console.log("Pending requests: ", pendingRequest);

      if (pendingRequest.length > 0) {
        console.log("Pending requests found, rejecting them...");
        for (const request of pendingRequest) {
          await this.wc_client.reject({
            topic: request.topic,
            reason: new Error("Pending request rejected"),
          });
        }
      }
      // do same for session
      const existingSessions = this.wc_client.session.getAll();
      console.log("Existing sessions: ", existingSessions);
      if (existingSessions.length > 0) {
        console.log("Existing sessions found, disconnecting them...");
        for (const session of existingSessions) {
          await this.wc_client.disconnect({
            topic: session.topic,
            reason: new Error("Existing session disconnected"),
          });
        }
      }
      // same for session requests
      console.log(this.wc_client.proposal);

      // Create a new session
      console.log("Connecting to wallet...");
      const { uri, approval } = await this.wc_client.connect({
        requiredNamespaces: {
          concordium: {
            methods: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT],
            chains: [chainId],
            events: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT],
          },
        },
        pairingTopic: undefined,
      });
      this.uri = uri



      // if (this.uri) {
      //   console.log({pairing: this.wc_client.pairing})
      //   const pairing = this.wc_client.pairing.getPairings().find((p: any) => p.uri === uri);
      //   console.log("Expiry:", pairing?.expiry); // in seconds since epoch
      // }



      console.log("Wallet connect URI: ", uri);
      console.log("Waiting for approval...");
      approval().then((x: unknown) => {
        console.log("Session approved:", x);
        this.session = x
        console.log(this.session.getAll())
        ConcordiumIDAppPoup.closePopup()
      });
      return uri
    } catch (e) {
      console.log(e)
    }
  }

  disconnection(){
    if (!this.wc_client) throw new Error("SDK not initialized");

    if (!this.session) throw new Error("No session found, please connect");

    // Disconnect the session
    this.wc_client.disconnect({
      topic: this.session.topic,
      reason: new Error("User disconnected"),
    });
    this.session = null;
  }
  async request(method: string = "custom_message", chainId: string = "eip155:1", message: any) {
    if (!this.wc_client) throw new Error("SDK not initialized");

    if (!this.session) throw new Error("No session found, please connect");

    // Send a custom message
    const result = await this.wc_client.request({
      topic: this.session.topic,
      chainId: chainId,
      request: {
        method: method,
        params: { message },
      },
    });
    return result
  }
}

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
      const create_acc_resp: CreateAccountCreationResponse = await this.accountWallet.request(
        IDAppSdkWallectConnectMethods.CREATE_ACCOUNT,
        ConcordiumIDAppSDK.chainId,
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
    const recover_acc_resp: RecoverAccountResponse = await this.accountWallet.request(IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT, ConcordiumIDAppSDK.chainId, account_recovery_request)
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


