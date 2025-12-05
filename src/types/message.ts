export interface CipherPayMessage {
  recipientKey: string;
  senderKey?: string;
  kind: "note-transfer" | "note-deposit" | "note-message" | "note-withdraw";
  ciphertext: string; // base64
  contentHash: string; // Poseidon(recipientKey, ciphertext)
  createdAt?: string;
}
