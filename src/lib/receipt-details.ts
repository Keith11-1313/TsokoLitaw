// Conservative hints only. Never derive approval from OCR or default an amount to the order total.
const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function normalizedDateTime(
  yearText: string,
  monthValue: number,
  dayText: string,
  hourText: string,
  minuteText: string,
  meridiem?: string,
) {
  const year = Number(yearText);
  const day = Number(dayText);
  const minute = Number(minuteText);
  let hour = Number(hourText);
  const period = meridiem?.toUpperCase();
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour < 12) hour += 12;
  const date = new Date(Date.UTC(year, monthValue - 1, day, hour, minute));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthValue - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  )
    return "";
  return `${yearText.padStart(4, "0")}-${String(monthValue).padStart(2, "0")}-${dayText.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minuteText.padStart(2, "0")}`;
}

function extractPaidAt(text: string) {
  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})[ T]+(\d{1,2}):(\d{2})\b/);
  if (iso) return normalizedDateTime(iso[1], Number(iso[2]), iso[3], iso[4], iso[5]);

  const monthFirst = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(\d{4})(?:\s+at)?\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i,
  );
  if (monthFirst)
    return normalizedDateTime(
      monthFirst[3],
      MONTHS[monthFirst[1].slice(0, 3).toLowerCase()],
      monthFirst[2],
      monthFirst[4],
      monthFirst[5],
      monthFirst[6],
    );

  const dayFirst = text.match(
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})(?:\s+at|,)?\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i,
  );
  return dayFirst
    ? normalizedDateTime(
        dayFirst[3],
        MONTHS[dayFirst[2].slice(0, 3).toLowerCase()],
        dayFirst[1],
        dayFirst[4],
        dayFirst[5],
        dayFirst[6],
      )
    : "";
}

function extractReference(text: string) {
  const line = text.match(
    /(?:reference\s*(?:number|no\.?)?|ref\.?\s*(?:number|no\.?)?|transaction\s*(?:number|no\.?|id))\s*[:#]?\s*([^\r\n]{6,100})/i,
  )?.[1];
  if (!line) return "";
  const beforeDate = line.split(
    /\s+(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|Date\b)/i,
  )[0];
  const tokens = beforeDate.match(/[A-Z0-9]+/gi) ?? [];
  if (tokens.length === 2 && tokens[0].length >= 6 && tokens[1].length === 1) tokens.pop();
  return tokens.join("").toUpperCase().slice(0, 64);
}

function extractAmount(text: string) {
  const value = text.match(
    /(?:total\s+amount\s+sent|transfer\s+amount|amount\s+sent|amount)\s*:?\s*(?:PHP|₱|P|£|\$)?\s*(-?[\d,]+\.\d{2})/i,
  )?.[1];
  if (!value || value.startsWith("-")) return "";
  return value.replace(/,/g, "");
}

function extractRecipient(text: string) {
  const explicitlyLabeled = text.match(
    /(?:^|\n)\s*(?:sent to|recipient|account name|to)\b\s*:?\s*([^\r\n]{2,100})/i,
  )?.[1];
  if (explicitlyLabeled) return explicitlyLabeled.trim();
  return (
    text
      .match(/(?:^|\n)\s*([A-Z][A-Z .•*'-]{1,99})\s*\n\s*\+63[^\n]*\n\s*Sent via GCash/im)?.[1]
      ?.trim() ?? ""
  );
}

export function getReceiptReadWarning(text: string) {
  return /\bbuy\s+load\s+transaction\b/i.test(text)
    ? "This appears to be a load-purchase receipt, not a completed payment transfer. Upload the transfer receipt for this order."
    : "";
}

export function extractReceiptDetails(text: string) {
  return {
    reference: extractReference(text),
    amount: extractAmount(text),
    recipient: extractRecipient(text),
    paidAt: extractPaidAt(text),
  };
}
