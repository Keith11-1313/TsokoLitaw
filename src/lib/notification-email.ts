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
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function formatPickupDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

interface EmailShellContent {
  preheader: string;
  eyebrow: string;
  heading: string;
  body: string;
}

function renderEmailShell({ preheader, eyebrow, heading, body }: EmailShellContent) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(heading)}</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-page { padding:16px 8px !important; }
      .email-header, .email-body, .email-footer { padding-left:22px !important; padding-right:22px !important; }
    }
  </style>
</head>
<body style="margin:0;background:#faf5ee;color:#361e0a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#faf5ee">
    <tr>
      <td class="email-page" align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid #e9dfd3;border-radius:12px;background:#fffdf9;border-collapse:separate;overflow:hidden">
          <tr>
            <td class="email-header" style="padding:24px 32px;border-bottom:1px solid #e9dfd3">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;line-height:1.2;color:#4a2c11">TsokoLitaw</p>
              <p style="margin:5px 0 0;font-size:12px;line-height:1.4;color:#785e43">Campus pickup · UCC Congressional Campus</p>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding:32px">
              <p style="margin:0 0 10px;font-size:11px;font-weight:bold;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;color:#785e43">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;line-height:1.2;color:#361e0a">${escapeHtml(heading)}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:20px 32px;border-top:1px solid #e9dfd3;background:#f5ece3">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#60462e">This is a transactional email about your TsokoLitaw order.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderAction(url: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0">
  <tr>
    <td style="border-radius:8px;background:#4a2c11">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;color:#fffdf9;font-size:14px;font-weight:bold;line-height:1.4;text-decoration:none">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function renderPickupDetails(date: string, time: string, location: string) {
  const rows = [
    ["Date", date],
    ["Time", time],
    ["Location", location],
  ];

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:14px;border-top:1px solid #e9dfd3">
  ${rows
    .map(
      ([label, value]) => `<tr>
    <td style="width:88px;padding:11px 12px 11px 0;border-bottom:1px solid #e9dfd3;font-size:12px;font-weight:bold;line-height:1.5;color:#785e43;vertical-align:top">${label}</td>
    <td style="padding:11px 0;border-bottom:1px solid #e9dfd3;font-size:14px;line-height:1.5;color:#361e0a;vertical-align:top">${escapeHtml(value)}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

function renderNotice(message: string) {
  return `<p style="margin:24px 0 0;padding:14px 16px;border-left:3px solid #4a2c11;background:#f5ece3;font-size:13px;line-height:1.6;color:#60462e">${escapeHtml(message)}</p>`;
}

export function buildOrderConfirmationEmail(
  input: OrderConfirmationEmailInput,
): TransactionalEmail {
  const pickupDate = formatPickupDate(input.pickupDate);
  const itemLines = input.items.map((item) => {
    const details = [...item.coatings, ...(item.addon ? [item.addon] : [])];
    return `${item.name} × ${item.quantity}${details.length ? ` — ${details.join(", ")}` : ""}`;
  });
  const htmlItems = input.items
    .map((item) => {
      const details = [...item.coatings, ...(item.addon ? [item.addon] : [])];
      return `<tr>
  <td style="padding:13px 0;border-bottom:1px solid #e9dfd3">
    <p style="margin:0;font-size:14px;font-weight:bold;line-height:1.5;color:#361e0a">${escapeHtml(item.name)} × ${item.quantity}</p>
    ${details.length ? `<p style="margin:3px 0 0;font-size:12px;line-height:1.5;color:#60462e">${escapeHtml(details.join(" · "))}</p>` : ""}
  </td>
</tr>`;
    })
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
    html: renderEmailShell({
      preheader: `Order ${input.orderNumber} is confirmed and paid.`,
      eyebrow: `Order ${input.orderNumber}`,
      heading: "Order confirmed",
      body: `<p style="margin:0;font-size:15px;line-height:1.7;color:#361e0a">Hi ${escapeHtml(input.customerName)}, your order is confirmed and paid.</p>
<h2 style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;line-height:1.3;color:#361e0a">Order items</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:8px;border-top:1px solid #e9dfd3">${htmlItems}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:14px">
  <tr>
    <td style="font-size:13px;font-weight:bold;letter-spacing:0.8px;text-transform:uppercase;color:#785e43">Total</td>
    <td align="right" style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#361e0a">${escapeHtml(php.format(input.total))}</td>
  </tr>
</table>
<h2 style="margin:30px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;line-height:1.3;color:#361e0a">Campus pickup</h2>
${renderPickupDetails(pickupDate, input.pickupWindow, input.pickupLocation)}
${renderAction(input.orderUrl, "View order details")}
${renderNotice("Please keep this email for pickup. Products may contain or come into contact with peanuts or other nuts, dairy, coconut, sesame, chocolate ingredients, and cookie ingredients.")}`,
    }),
  };
}

export function buildReadyForPickupEmail(input: OrderConfirmationEmailInput): TransactionalEmail {
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
    html: renderEmailShell({
      preheader: `Order ${input.orderNumber} is ready for pickup.`,
      eyebrow: `Order ${input.orderNumber}`,
      heading: "Ready for pickup",
      body: `<p style="margin:0;font-size:15px;line-height:1.7;color:#361e0a">Hi ${escapeHtml(input.customerName)}, your order is ready.</p>
<h2 style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;line-height:1.3;color:#361e0a">Pickup details</h2>
${renderPickupDetails(pickupDate, input.pickupWindow, input.pickupLocation)}
${renderNotice("Please bring your order number and collect your order within the scheduled pickup window.")}
${renderAction(input.orderUrl, "View order details")}`,
    }),
  };
}

export function buildOrderCancelledEmail(input: CancellationEmailInput): TransactionalEmail {
  const refundMessage =
    input.refundAmount === null
      ? "No payment was collected, so no refund is needed."
      : `A full refund of ${php.format(input.refundAmount)} has been requested to the original payment method. We’ll email you when its status changes.`;

  return {
    subject: `Order ${input.orderNumber} cancelled`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `Your TsokoLitaw order ${input.orderNumber} has been cancelled.`,
      refundMessage,
      "",
      `View your order: ${input.orderUrl}`,
      "",
      "TsokoLitaw",
    ].join("\n"),
    html: renderEmailShell({
      preheader: `Order ${input.orderNumber} has been cancelled.`,
      eyebrow: `Order ${input.orderNumber}`,
      heading: "Order cancelled",
      body: `<p style="margin:0;font-size:15px;line-height:1.7;color:#361e0a">Hi ${escapeHtml(input.customerName)}, your order has been cancelled.</p>
${renderNotice(refundMessage)}
${renderAction(input.orderUrl, "View order details")}`,
    }),
  };
}

function buildRefundEmail(
  input: RefundEmailInput,
  content: { subject: string; heading: string; message: string; action: string },
): TransactionalEmail {
  return {
    subject: `${content.subject} — ${input.orderNumber}`,
    text: [
      `Hi ${input.customerName},`,
      "",
      content.message,
      `Refund amount: ${php.format(input.refundAmount)}`,
      "",
      `${content.action}: ${input.orderUrl}`,
      "",
      "TsokoLitaw",
    ].join("\n"),
    html: renderEmailShell({
      preheader: `${content.heading} for order ${input.orderNumber}.`,
      eyebrow: `Order ${input.orderNumber}`,
      heading: content.heading,
      body: `<p style="margin:0;font-size:15px;line-height:1.7;color:#361e0a">Hi ${escapeHtml(input.customerName)}, ${escapeHtml(content.message)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:24px;border-top:1px solid #e9dfd3;border-bottom:1px solid #e9dfd3">
  <tr>
    <td style="padding:16px 0;font-size:13px;font-weight:bold;color:#60462e">Refund amount</td>
    <td align="right" style="padding:16px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#361e0a">${escapeHtml(php.format(input.refundAmount))}</td>
  </tr>
</table>
${renderAction(input.orderUrl, content.action)}`,
    }),
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
