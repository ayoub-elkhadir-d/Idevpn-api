import { protocolNamesList, type Protocol } from "./protocols.js";

// No protocol compatibility is claimed until it is verified in the Android engine.
const verifiedProtocols = new Set<Protocol>();

export function isAndroidProtocolVerified(protocol: Protocol): boolean {
  return verifiedProtocols.has(protocol);
}

export function protocolCapabilities() {
  return protocolNamesList.map((protocol) => ({
    protocol,
    androidCompatible: isAndroidProtocolVerified(protocol),
    draftsAllowed: true,
    publishingAllowed: isAndroidProtocolVerified(protocol)
  }));
}
