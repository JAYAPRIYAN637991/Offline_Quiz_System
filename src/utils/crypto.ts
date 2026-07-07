/**
 * Cryptographic utility for securing exam questions and logs offline.
 * Uses the Web Crypto API for high-performance, secure AES-GCM encryption/decryption.
 */

const DEFAULT_SECRET = "exam-consolidation-passphrase-2026";

/**
 * Derives a CryptoKey from a human-readable passphrase.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string of data using AES-256-GCM.
 * Returns a base64 encoded string containing the salt, iv, and ciphertext.
 */
export async function encryptData(plaintext: string, secret: string = DEFAULT_SECRET): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const key = await deriveKey(secret, salt);
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encoder.encode(plaintext)
    );

    // Combine salt, iv, and ciphertext into a single array
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    // Convert to Base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts a combined base64 encrypted payload back into a string.
 */
export async function decryptData(ciphertextBase64: string, secret: string = DEFAULT_SECRET): Promise<string> {
  try {
    const decoder = new TextDecoder();
    
    // Decode Base64
    const binaryString = atob(ciphertextBase64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    const key = await deriveKey(secret, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed. Invalid passcode or tampered file.", error);
    throw new Error("Invalid decryption key or corrupted package");
  }
}

/**
 * Generates an integrity checksum (SHA-256) of an object
 * to verify that offline databases/configs haven't been tampered with.
 */
export async function generateIntegrityHash(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  const dataBuffer = encoder.encode(serialized);
  
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
