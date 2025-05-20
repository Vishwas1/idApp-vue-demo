// app-a.js
import { SignClient } from "@walletconnect/sign-client";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import {
  IDAppSDK,
  type CreateAccountCreationRequestMessage,
  IDAppSdkWallectConnectMethods,
  type CreateAccountCreationResponse,
  type CreateAccountResponseMsgType,
  type SignedCredentialDeploymentTransaction,
  type RecoverAccountCreationRequestMessage,
} from "idapp-app-sdk";

const projectId = "8b6c46b9127ce91195745c124870244e";

export class AccountWalletWC {
  private wc_client: any
  private session: any
  private approval: any
  public uri: string = "";
  async initClient() {
    this.wc_client = await SignClient.init({
      projectId,
      metadata: {
        name: "App A",
        description: "dApp initiating connection",
        url: "phantom.com",
        icons: ["https://app-a.com/icon.png"],
      },
    });

    // events...
    this.wc_client.on("session_event", (event: any) => {
      const { event: emittedEvent } = event;
      console.log("🎉 Aaccount wallet received:" + emittedEvent.data.message)
      alert("🎉 Aaccount wallet received:" + emittedEvent.data.message);
      
      // if (emittedEvent.name === "custom_message_from_b") {
      //   console.log("🎉 App A received:", emittedEvent.data.message);
      // }
    });

  }

  async connect(chainId: string = "eip155:1") {
    try{

    
    if (!this.wc_client) throw new Error("SDK not initialized");
    // Create pairing URI
    console.log('Before connecting...')
    const { uri, approval } = await this.wc_client.connect({
      requiredNamespaces: {
        // eip155: {
        //   methods: ["custom_message"],
        //   chains: [chainId],
        //   events: [],
        // },
        concordium: {
          methods: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT],
          chains: [chainId],
          events: [IDAppSdkWallectConnectMethods.CREATE_ACCOUNT, IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT], 
        },
      },
      pairingTopic: undefined,
    });
    console.log('After connecting... uri ' +  "http://localhost:5173/wallet-connect?encodedUri=" + uri)
    this.uri  = uri
    // this.approval = approval;
    this.session = await approval(); 
    console.log('After approval...')
    console.log("Scan this URI with App B (Wallet):", uri);

   }catch(e){
      console.log(e)
    } 
  }

  // async approve(){
  //   this.session = await this.approval(); 
  //   alert("Session established:" + this.session.topic);
  // }

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


    ///// emitting event -- not requried for acccount wallet
    // const result = await this.wc_client.emit({
    //   topic: this.session.topic,
    //   chainId: chainId,
    //   event: {
    //     name: method,
    //     data: { message },
    //   },
    // });
    return result
  }
}

// const accountWallet = new AccountWalletWC();

// async function createConnection(){
//   await accountWallet.initClient()
//   await accountWallet.connect(IDAppSDK.chainId)
// }

export class AccountWallet {
  accountWallet: AccountWalletWC
  constructor(acwallet: AccountWalletWC) {
    this.accountWallet = acwallet
  }

  async createCCDAccount() {
    try{

    // STEP1: generate SEED

    // STEP2: generate public/private key pair
    const seed = generateMnemonic(wordlist, 256)
    const wallet = IDAppSDK.generateAccountWithSeedPhrase(seed, 'Testnet', 0) //ConcordiumHdWallet.fromSeedPhrase(seed, 'Testnet')
    const public_key = wallet.publicKey //wallet.getAccountPublicKey(0, 0, 0).toString('hex')
    // STEP3: prepare account creation request
    const new_account_request: CreateAccountCreationRequestMessage =
      IDAppSDK.getCreateAccountCreationRequest(public_key, "I want to create a new Concordium account");
    // console.log(JSON.stringify(new_account_request, null, 2));


    // STEP4: send request to IDApp
    console.log('Sending account creation request with public_key ' + public_key)
    const create_acc_resp: CreateAccountCreationResponse = await this.accountWallet.request(
      IDAppSdkWallectConnectMethods.CREATE_ACCOUNT,
      IDAppSDK.chainId,
      new_account_request)

    if (create_acc_resp.status == "success") {
      const resp: CreateAccountResponseMsgType = create_acc_resp.message as CreateAccountResponseMsgType;
      console.log('Recieved account creation response account_address ' + resp.accountAddress)

      console.log('IDAppSDK.signCredentialTransaction ...')
      const signedCreddepTx: SignedCredentialDeploymentTransaction = await IDAppSDK.signCredentialTransaction(resp.serializedCredentialDeploymentTransaction, wallet.signingKey);


      console.log('IDAppSDK.submitCCDTransaction ...')
      const txHash = await IDAppSDK.submitCCDTransaction(signedCreddepTx.credentialDeploymentTransaction, signedCreddepTx.signature, 'Testnet')

      return { account_address: resp.accountAddress, public_key, txHash }


    } else {
      throw new Error("")

    }
    }catch(e){
      console.log(e)
    }

  }


  async recoverCCDAccount(public_key: string) {
    // STEP1: Fetch user's public key
    // const public_key = gblPublicKey; // dummy public key

    // STEP2: prepare account recovery request
    const account_recovery_request: RecoverAccountCreationRequestMessage = IDAppSDK.getRecoverAccountRecoveryRequest(public_key);

    // STEP3: send request to IDApp
    console.log('Sending account recovery request with public_key ' + public_key)
    const recover_acc_resp: any = await this.accountWallet.request(IDAppSdkWallectConnectMethods.RECOVER_ACCOUNT, IDAppSDK.chainId, account_recovery_request)
    if (recover_acc_resp.status == "success") {
      console.log('Recieved account recovery response address ' + recover_acc_resp.account.account_address)
      return { account_address: recover_acc_resp.account.account_address }
    } else {
      throw new Error("")
    }
  }
}





// function callAfterSec(func: any, sec: number){
//   return new Promise((resolve) => {
//     setTimeout(async () => {
//       const result  = await func()
//       resolve(result)
//     }, sec * 1000);
//   })
// }

// async function test(){
//   await createConnection()
//   const result:any = await callAfterSec(createCCDAccount, 10)
//   setTimeout(async () => {
//      const result1=  await recoverCCDAccount(result['public_key'])
//     //  console.log(result1)
//   }, 2 * 1000);
// }

// test()


