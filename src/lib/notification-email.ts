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

export interface CancellationEmailInput {
  orderNumber: string;
  customerName: string;
  orderUrl: string;
  refundAmount: number | null;
}

export interface RefundEmailInput {
  orderNumber: string;
  customerName: string;
  orderUrl: string;
  refundAmount: number;
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

export function buildReadyForPickupEmail(
  input: OrderConfirmationEmailInput,
): TransactionalEmail {
  const pickupDate = formatPickupDate(input.pickupDate);

  return {
    subject: `Order ${input.orderNumber} is ready for pickup`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `Your TsokoLitaw order ${input.orderNumber} is ready for pickup.`,
      "",
      `Pickup date: ${pickupDate}`,
      `Pickup time: ${input.pickupWindow}`,
      `Pickup location: ${input.pickupLocation}`,
      "",
      `View your order: ${input.orderUrl}`,
      "",
      "Please bring your order number and collect your order within the scheduled pickup window.",
      "",
      "TsokoLitaw",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en"><body style="margin:0;background:#faf5ee;color:#4b240d;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px">
    <div style="background:#fffdf9;border:1px solid #eadccc;border-radius:20px;padding:32px">
      <p style="margin:0 0 8px;font-size:14px">TsokoLitaw</p>
      <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:32px">Ready for pickup</h1>
      <p style="line-height:1.6">Hi ${escapeHtml(input.customerName)}, your order <strong>${escapeHtml(input.orderNumber)}</strong> is ready.</p>
      <div style="margin-top:24px;border-radius:14px;background:#f7ede1;padding:18px;line-height:1.7">
        <strong>Date:</strong> ${escapeHtml(pickupDate)}<br>
        <strong>Time:</strong> ${escapeHtml(input.pickupWindow)}<br>
        <strong>Location:</strong> ${escapeHtml(input.pickupLocation)}
      </div>
      <p style="margin:24px 0 0;line-height:1.6">Please bring your order number and collect your order within the scheduled pickup window.</p>
      <p style="margin:28px 0 0"><a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;border-radius:999px;background:#542b0d;color:#fff;padding:13px 22px;text-decoration:none;font-weight:bold">View order details</a></p>
    </div>
  </div>
</body></html>`,
  };
}

export function buildOrderCancelledEmail(
  input: CancellationEmailInput,
): TransactionalEmail {
  const refundMessage = input.refundAmount === null
    ? "No payment was collected, so no refund is needed."
    : `A full refund of ${php.format(input.refundAmount)} has been requested to the original payment method. We’ll email you when its status changes.`;

  return {
    subject: `Order ${input.orderNumber} cancelled`,
    text: [
      `Hi ${input.customerName},`, "",
      `Your TsokoLitaw order ${input.orderNumber} has been cancelled.`,
      refundMessage, "",
      `View your order: ${input.orderUrl}`, "", "TsokoLitaw",
    ].join("\n"),
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#faf5ee;color:#4b240d;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#fffdf9;border:1px solid #eadccc;border-radius:20px;padding:32px"><p style="margin:0 0 8px;font-size:14px">TsokoLitaw</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:32px">Order cancelled</h1><p style="line-height:1.6">Hi ${escapeHtml(input.customerName)}, your order <strong>${escapeHtml(input.orderNumber)}</strong> has been cancelled.</p><p style="border-radius:14px;background:#f7ede1;padding:18px;line-height:1.6">${escapeHtml(refundMessage)}</p><p style="margin:28px 0 0"><a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;border-radius:999px;background:#542b0d;color:#fff;padding:13px 22px;text-decoration:none;font-weight:bold">View order details</a></p></div></div></body></html>`,
  };
}

function buildRefundEmail(
  input: RefundEmailInput,
  content: { subject: string; heading: string; message: string; action: string },
): TransactionalEmail {
  return {
    subject: `${content.subject} — ${input.orderNumber}`,
    text: [
      `Hi ${input.customerName},`, "", content.message,
      `Refund amount: ${php.format(input.refundAmount)}`, "",
      `${content.action}: ${input.orderUrl}`, "", "TsokoLitaw",
    ].join("\n"),
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#faf5ee;color:#4b240d;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#fffdf9;border:1px solid #eadccc;border-radius:20px;padding:32px"><p style="margin:0 0 8px;font-size:14px">TsokoLitaw</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:32px">${escapeHtml(content.heading)}</h1><p style="line-height:1.6">Hi ${escapeHtml(input.customerName)}, ${escapeHtml(content.message)}</p><p style="border-radius:14px;background:#f7ede1;padding:18px;font-size:18px"><strong>Refund amount: ${escapeHtml(php.format(input.refundAmount))}</strong></p><p style="margin:28px 0 0"><a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;border-radius:999px;background:#542b0d;color:#fff;padding:13px 22px;text-decoration:none;font-weight:bold">${escapeHtml(content.action)}</a></p></div></div></body></html>`,
  };
}

export function buildRefundProcessingEmail(input: RefundEmailInput) {
  return buildRefundEmail(input, {
    subject: "Refund processing",
    heading: "Your refund is processing",
    message: `PayMongo is processing the refund for order ${input.orderNumber} to the original payment method.`,
    action: "View refund status",
  });
}

export function buildRefundCompletedEmail(input: RefundEmailInput) {
  return buildRefundEmail(input, {
    subject: "Refund completed",
    heading: "Your refund is complete",
    message: `PayMongo confirmed the refund for order ${input.orderNumber}. The time it appears in your account can depend on your payment provider.`,
    action: "View order details",
  });
}

export function buildRefundFailedEmail(input: RefundEmailInput) {
  return buildRefundEmail(input, {
    subject: "Refund needs attention",
    heading: "We need your refund details",
    message: `The automatic refund for order ${input.orderNumber} could not be completed. Sign in and use the secure refund form on your order page. Do not send account details by email.`,
    action: "Open secure refund form",
  });
}
