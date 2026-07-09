/**
 * Encryption and decryption helpers to secure payload credentials (XOR Hex-Cipher)
 */

const PAYLOAD_KEY = "devtrack-payload-key-1092";

export function encryptPayload(data: any): string {
  const plainText = JSON.stringify(data);
  let hex = "";
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i) ^ PAYLOAD_KEY.charCodeAt(i % PAYLOAD_KEY.length);
    // Convert to 4-digit hex to support all unicode/special characters securely
    hex += ("0000" + charCode.toString(16)).slice(-4);
  }
  return hex;
}

export function decryptPayload(hex: string): any {
  try {
    let plainText = "";
    for (let i = 0; i < hex.length; i += 4) {
      const charCode = parseInt(hex.substring(i, i + 4), 16);
      const plainCharCode = charCode ^ PAYLOAD_KEY.charCodeAt((i / 4) % PAYLOAD_KEY.length);
      plainText += String.fromCharCode(plainCharCode);
    }
    return JSON.parse(plainText);
  } catch (err) {
    console.error("Payload decryption error:", err);
    return null;
  }
}
