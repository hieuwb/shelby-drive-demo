export function hexToString(hex: string) {
  // If already a regular string (not hex), return as is
  if (!hex.startsWith('0x')) {
    return hex;
  }
  
  try {
    return Buffer.from(hex.replace(/^0x/, ""), "hex").toString("utf8");
  } catch (error) {
    console.warn('Failed to decode hex string:', hex);
    return hex; // Return original if decode fails
  }
}

export function stringToHex(str: string) {
  return "0x" + Buffer.from(str, "utf8").toString("hex");
}
