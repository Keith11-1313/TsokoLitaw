export interface OrderConfirmationEmailInput {
  orderNumber: string;
  customerName: string;
  total: number;
  pickupDate: string;
  pickupWindow: string;
  pickupLocation: string;
  orderUrl: string;
  items: readonly {
    name: string;
    quantity: number;
    coatings: readonly string[];
    addon: string | null;
  }[];
}

export interface TransactionalEmail {
  subject: string;
  text: string;
  html: string;
}

const php = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function formatPickupDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function buildOrderConfirmationEmail(
  input: OrderConfirmationEmailInput,
): TransactionalEmail {
  const pickupDate = formatPickupDate(input.pickupDate);
  const itemLines = input.items.map((item) => {
    const details = [...item.coatings, ...(item.addon ? [item.addon] : [])];
    return `${item.name} × ${item.quantity}${details.length ? ` — ${details.join(", ")}` : ""}`;
  });
  const htmlItems = itemLines
    .map((line) => `<li style="margin:0 0 8px">${escapeHtml(line)}</li>`)
    .join("");

  return {
    subject: `Order ${input.orderNumber} confirmed`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `Your TsokoLitaw order ${input.orderNumber} is confirmed and paid.`,
      "",
      "Order:",
      ...itemLines.map((line) => `- ${line}`),
      `Total: ${php.format(input.total)}`,
      "",
      `Pickup date: ${pickupDate}`,
      `Pickup time: ${input.pickupWindow}`,
      `Pickup location: ${input.pickupLocation}`,
      "",
      `View your order: ${input.orderUrl}`,
      "",
      "Please keep this email for pickup. This order may contain peanuts or other nuts, dairy, coconut, sesame, chocolate ingredients, or cookie ingredients.",
      "",
      "TsokoLitaw",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en"><body style="margin:0;background:#faf5ee;color:#4b240d;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px">
    <div style="background:#fffdf9;border:1px solid #eadccc;border-radius:20px;padding:32px">
      <p style="margin:0 0 8px;font-size:14px">TsokoLitaw</p>
      <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:32px">Order confirmed</h1>
      <p style="line-height:1.6">Hi ${escapeHtml(input.customerName)}, your order <strong>${escapeHtml(input.orderNumber)}</strong> is confirmed and paid.</p>
      <h2 style="margin-top:28px;font-family:Georgia,serif;font-size:22px">Your order</h2>
      <ul style="padding-left:20px;line-height:1.5">${htmlItems}</ul>
      <p style="font-size:18px"><strong>Total: ${escapeHtml(php.format(input.total))}</strong></p>
      <h2 style="margin-top:28px;font-family:Georgia,serif;font-size:22px">Campus pickup</h2>
      <p style="line-height:1.7"><strong>Date:</strong> ${escapeHtml(pickupDate)}<br><strong>Time:</strong> ${escapeHtml(input.pickupWindow)}<br><strong>Location:</strong> ${escapeHtml(input.pickupLocation)}</p>
      <p style="margin:28px 0"><a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;border-radius:999px;background:#542b0d;color:#fff;padding:13px 22px;text-decoration:none;font-weight:bold">View order details</a></p>
      <p style="margin-top:28px;border-radius:12px;background:#fff3cd;padding:14px;font-size:13px;line-height:1.5">Please keep this email for pickup. Products may contain or come into contact with peanuts or other nuts, dairy, coconut, sesame, chocolate ingredients, and cookie ingredients.</p>
    </div>
  </div>
</body></html>`,
  };
}
