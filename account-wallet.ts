// app-a.js
import { SignClient } from "@walletconnect/sign-client";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import {
  ConcordiumIDAppSDK,
  type CreateAccountCreationRequestMessage,
  IDAppSdkWallectConnectMethods,
  type CreateAccountCreationResponse,
  type CreateAccountResponseMsgType,
  type SignedCredentialDeploymentTransaction,
  type RecoverAccountCreationRequestMessage,
  Status,
  type RecoverAccountResponse,
  type RecoverAccountMsgType,
} from "id-app-sdk";

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
      console.log("🎉 Aaccount wallet received:" + emittedEvent.data.message)
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
      console.log('Before connecting...')
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
      console.log('After connecting... uri ' + "http://localhost:5173/wallet-connect?encodedUri=" + uri)
      this.uri = uri
      approval().then((x: unknown) => {
        this.session = x
      });
      console.log('After approval...  uri ' + "http://localhost:5173/wallet-connect?encodedUri=" + uri)

    } catch (e) {
      console.log(e)
    }
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
  constructor(acwallet: AccountWalletWC) {
    this.accountWallet = acwallet
  }

  async createCCDAccount() {
    try {

      const seed = generateMnemonic(wordlist, 256)
      const wallet = ConcordiumIDAppSDK.generateAccountWithSeedPhrase(seed, 'Testnet', 0)
      const public_key = wallet.publicKey
      localStorage.setItem('pk', public_key)
      
      const new_account_request: CreateAccountCreationRequestMessage =
        ConcordiumIDAppSDK.getCreateAccountCreationRequest(public_key, "I want to create a new Concordium account");
      
      console.log('Sending account creation request with public_key ' + public_key)
      const create_acc_resp: CreateAccountCreationResponse = await this.accountWallet.request(
        IDAppSdkWallectConnectMethods.CREATE_ACCOUNT,
        ConcordiumIDAppSDK.chainId,
        new_account_request)

      if (create_acc_resp.status == Status.SUCCESS) {
        const resp: CreateAccountResponseMsgType = create_acc_resp.message as CreateAccountResponseMsgType;
        console.log('Recieved account creation response account_address ' + resp.accountAddress)

        console.log('ConcordiumIDAppSDK.signCredentialTransaction ...')
        const signedCreddepTx: SignedCredentialDeploymentTransaction = await ConcordiumIDAppSDK.signCredentialTransaction(resp.serializedCredentialDeploymentTransaction, wallet.signingKey);

        console.log('ConcordiumIDAppSDK.submitCCDTransaction ...')
        const txHash = await ConcordiumIDAppSDK.submitCCDTransaction(signedCreddepTx.credentialDeploymentTransaction, signedCreddepTx.signature, 'Testnet')
        console.log({ txHash: txHash.toString() })

        return { account_address: resp.accountAddress, public_key, txHash }
      } else {
        throw new Error("")
      }
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
      throw new Error("") ///// 
    }
  }
}


