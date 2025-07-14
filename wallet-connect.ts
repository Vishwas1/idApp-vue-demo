// import WalletConnect from "@walletconnect/legacy-client";
import { ConcordiumIDAppPoup, IDAppSdkWallectConnectMethods } from "id-app-sdk";

import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

// // Create a connector
// const connector = new WalletConnect({
//   bridge: "https://bridge.walletconnect.org", // Required
//   qrcodeModal: QRCodeModal,
// });

// // Check if connection is already established
// if (!connector.connected) {
//   // create new session
//   connector.createSession();
// }

// // Subscribe to connection events
// connector.on("connect", (error, payload) => {
//   if (error) {
//     throw error;
//   }

//   // Get provided accounts and chainId
//   const { accounts, chainId } = payload.params[0];
// });

// connector.on("session_update", (error, payload) => {
//   if (error) {
//     throw error;
//   }

//   // Get updated accounts and chainId
//   const { accounts, chainId } = payload.params[0];
// });

// connector.on("disconnect", (error, payload) => {
//   if (error) {
//     throw error;
//   }

//   // Delete connector
// });



export class AccountWalletWC {
  private wc_client: WalletConnect | null = null;
  public session: any = null;
  public uri: string = "";

  async initClient() {
    this.wc_client = new WalletConnect({
      bridge: "https://b.bridge.walletconnect.org", 
    });
    console.log("🔗 Initializing WalletConnect client... URI = " + this.wc_client.uri);
    console.log(this.wc_client.uri)

    this.uri = this.wc_client.uri || "";
    if (!this.wc_client.connected) {
      // create new session
      this.wc_client.createSession();
    }

    this.wc_client.on("connect", (error, payload) => {
      if (error) {
        console.error("❌ Connection error:", error);
        throw error
      };

      console.log("🔗 Connected to WalletConnect .. payload "+ JSON.stringify(payload));
        //   const { accounts, chainId } = payload.params[0];
        //   this.session = { accounts, chainId };

        //   console.log("🔗 Connected:", accounts, chainId);
        //   ConcordiumIDAppPoup.closePopup();
    });

    this.wc_client.on("session_update", (error, payload) => {
      if (error) throw error;

      const { accounts, chainId } = payload.params[0];
      this.session = { accounts, chainId };

      console.log("🔁 Session updated:", accounts, chainId);
    });

    this.wc_client.on("disconnect", (error) => {
      if (error) throw error;

      console.log("❌ Disconnected");
      this.session = null;
    });

    this.wc_client.on("call_request", (error, payload) => {
      if (error) throw error;

      console.log("📩 Custom message received:", payload.params);
      alert("📩 Received message: " + JSON.stringify(payload.params));
    });
  }

  async connect() {
    if (!this.wc_client) throw new Error("WalletConnect not initialized");

    if (!this.wc_client.connected) {
      await this.wc_client.createSession();
    } else {
      this.session = {
        accounts: this.wc_client.accounts,
        chainId: this.wc_client.chainId,
      };
      console.log("🔄 Already connected:", this.session);
    }

    this.uri = this.wc_client.uri || "";
    console.log("🔗 Initializing WalletConnect session... URI = " + this.wc_client.uri);
    console.log(this.wc_client.uri)
    return this.uri;
  }

  async request(method: string, message: any) {
    if (!this.wc_client || !this.wc_client.connected) {
      throw new Error("Wallet not connected");
    }

    const result = await this.wc_client.sendCustomRequest({
      method,
      params: [message],
    });

    return result;
  }

  async disconnection() {
    if (!this.wc_client) throw new Error("WalletConnect not initialized");
    if (!this.wc_client.connected) throw new Error("Not connected");

    await this.wc_client.killSession();
    this.session = null;
  }
}