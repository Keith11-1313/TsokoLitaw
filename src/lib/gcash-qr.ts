/** EMV QR payload handling. Preserve recipient fields; change only amount and CRC. */
export function qrChecksum(value: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function readGcashQr(base: string) {
  if (base.length < 50 || base.length > 1024 || /[^\x20-\x7e]/.test(base))
    throw new Error("Invalid base QR.");
  const fields = new Map<string, string>();
  for (let index = 0; index < base.length;) {
    const header = base.slice(index, index + 4);
    if (!/^\d{4}$/.test(header)) throw new Error("Invalid QR field.");
    const tag = header.slice(0, 2);
    const length = Number(header.slice(2));
    const value = base.slice(index + 4, index + 4 + length);
    if (!length || value.length !== length || fields.has(tag))
      throw new Error("Invalid QR field length.");
    fields.set(tag, value);
    index += 4 + length;
  }
  if (
    fields.get("00") !== "01" ||
    fields.get("53") !== "608" ||
    fields.get("58") !== "PH" ||
    !fields.has("27") ||
    !fields.has("54") ||
    !fields.has("59") ||
    !base.endsWith(`6304${fields.get("63")}`) ||
    qrChecksum(base.slice(0, -4)) !== fields.get("63")
  ) {
    throw new Error("The base QR is not a valid PHP recipient QR.");
  }
  return fields;
}

export function getGcashRecipientName(payload: string) {
  return readGcashQr(payload).get("59")!;
}

export function createGcashQrPayload(base: string, total: number) {
  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    total > 99999999.99 ||
    Math.abs(total * 100 - Math.round(total * 100)) > 0.00001
  ) {
    throw new Error("Invalid QR amount.");
  }
  const fields = readGcashQr(base);
  fields.set("54", total.toFixed(2));
  fields.delete("63");
  const payload =
    [...fields]
      .map(([tag, value]) => `${tag}${String(value.length).padStart(2, "0")}${value}`)
      .join("") + "6304";
  return payload + qrChecksum(payload);
}
