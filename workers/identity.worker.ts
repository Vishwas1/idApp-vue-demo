import type { IdentityRequestWithKeysInput} from '@concordium/web-sdk';
import { createIdentityRequestWithKeys } from '@concordium/web-sdk';

self.onmessage = (e: MessageEvent<IdentityRequestWithKeysInput>) => {
    console.log(e);
    
    const identityRequest = createIdentityRequestWithKeys(e.data);
    self.postMessage(identityRequest);
};



