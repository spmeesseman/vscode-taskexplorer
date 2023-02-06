
import { createHash, randomBytes, randomUUID } from "crypto";
export const getNonce = () => randomBytes(16).toString("base64");
export const md5 = (data: string | Uint8Array, encoding: "base64" | "hex" = "base64") =>  createHash("md5").update(data).digest(encoding);
export const uuid = () => randomUUID();
