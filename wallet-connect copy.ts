import { SignClient } from "@walletconnect/sign-client";
import {
  IDAppSdkWallectConnectMethods,
  ConcordiumIDAppPoup,
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
      console.log("Wallet connect URI: ", uri);
      console.log("Waiting for approval...");
      approval().then((x: unknown) => {
        console.log("Session approved:", x);
        this.session = x
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
