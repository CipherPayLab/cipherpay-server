export interface CipherPayMessage {
  recipientKey: string;
  senderKey?: string;
  kind: "note-transfer" | "note-deposit" | "note-message";
  ciphertext: string; // base64
  contentHash: string; // Poseidon(recipientKey, ciphertext)
  createdAt?: string;
}
