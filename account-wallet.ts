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
} from "@concordium/id-app-sdk";
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
        name: "3P Account Wallet",
        description: "dApp initiating connection",
        url: "http://localhost:3000",
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


    this.wc_client.on('session_authenticate', (data: any) => {
      console.log('session_authenticate:', data)
    })

    this.wc_client.on('session_delete', (data: any) => {
      console.log('session_delete:', data)
      // this.removeAccountDataAndRedirect()
      // this.signClient?.session.delete(data.topic, {
      //   code: 1000,
      //   message: 'User disconnected',
      // })
      alert(`Session was deleted from idapp, topic = ` + data.topic)
      window.location.reload()
    })

    this.wc_client.on('session_request_expire', (data: any) => {
      console.log('session_request_expire:', data)
      alert('Session Request Expired, topic ' + data.topic)
      window.location.reload()
    })

    this.printPairing()
    this.printSessions()
  }

  getListOfPairing(){
    return this.wc_client.pairing.getAll()
  }

  getListOfSessions(){
    return this.wc_client.session.getAll()
  }

  getMostNewSession(){
    const sessions = this.getListOfSessions()
    if(sessions && sessions.length > 0){
      const now = Math.floor(Date.now() / 1000); // current time in UNIX seconds
      // Filter out expired sessions
      const validSessions = sessions.filter((session: any) => session.expiry > now);
      if (validSessions.length === 0) return null;
      validSessions.sort((a: any, b: any) => b.expiry - a.expiry); //sort by expiry time latest ex
      return validSessions[0]
    } else {
      return null
    }
  }

  async connect(chainId: string = "eip155:1") {
    try {
      if (!this.wc_client) throw new Error("SDK not initialized");

      // Create pairing URI
      console.log("Before connecting...");

      const pendingRequest = this.wc_client.getPendingSessionRequests();
      console.log("Pending requests: ", pendingRequest);

      this.printSessions()
      const existingPairing = this.printPairing()
      
      // Create a new session if not exists 
      console.log("Connecting to wallet...");
      const { uri, approval } = await this.wc_client.connect({
        optionalNamespace: {
          concordium: {
            methods: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT],
            chains: [chainId],
            events: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT],
          },
        },
        pairingTopic: undefined//existingPairing?.topic,
      });
      this.uri = uri
      console.log("Wallet connect URI: ", uri);
      console.log("Waiting for approval...");
      approval().then((x: unknown) => {
        console.log("Session approved:", x);        
        this.session = x
        console.log('Session expires at:', this.formatExpiryIST(this.session.expiry));
        this.printPairing()
        this.printSessions()
        ConcordiumIDAppPoup.closePopup()
      });
      return uri
    } catch (e) {
      console.log(e)
    }
  }

  print(sessionOrPair: any, type: string ='Session'){
    if(sessionOrPair){
      console.log({
        type,
        topic: sessionOrPair.topic, 
        expiry: this.formatExpiryIST(sessionOrPair.expiry)
      })
    }
  }
  async printSessions(){
    const existingSessions = this.wc_client.session.getAll();
      console.log("Existing sessions: ", existingSessions);
      if (existingSessions.length > 0) {
        console.log("Existing sessions found, lenght  " + existingSessions.length);
        for (const session of existingSessions) {
          this.print(session, 'Session')
        }

        console.log(existingSessions[0])
      }
  }
  printPairing(){
    const pairings = this.wc_client.pairing.getAll();
      const existingPairing = pairings.find((p:any) => p?.active);
      if(existingPairing){
        console.log('Pairing expires at:', this.formatExpiryIST(existingPairing.expiry));
        this.print(existingPairing, 'Pair')
      } else {
        console.log('no pairing found...')
      }

      return existingPairing
  }

  formatExpiryIST = (expiryUnixSeconds: number) => {
  const date = new Date(expiryUnixSeconds * 1000); // convert to milliseconds
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

  disconnection(topic: string = this.session.topic){
    if (!this.wc_client) throw new Error("SDK not initialized");
    console.log({topic})
    return this.wc_client.disconnect({
      topic: topic,
      reason: new Error("User disconnected"),
    });
  }

  async disconnectall(){
    const existingSessions = this.getListOfSessions()
      if (existingSessions.length > 0) {
        console.log("Existing sessions found, disconnecting them...");
        for (const session of existingSessions) {
          console.log('disconnecting... ' + session.topic) 
          await this.disconnection(session.topic)
        }
      } else {
        console.log('No session found to disconnect...')
      }
  }
  async request(method: string = "custom_message", chainId: string = "eip155:1", message: any) {
    if (!this.wc_client) throw new Error("SDK not initialized");

    if (!this.session) {
      this.session = this.getMostNewSession()
      console.log('Retrived sessions being used... ' + this.session.topic)
    }

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
    // this.seed = generateMnemonic(wordlist, 256)
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
    // try {
      localStorage.removeItem('pk')
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
    // } catch (e) {
    //   console.log(e)
    //   alert('Error in account creation: ' + e.message)
    //   window.location.reload()
    // }
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
      // throw new Error("Could not reciever recovery response") ///// 
      return recover_acc_resp
    }
  }
}


