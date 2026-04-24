export async function alertDeals(deals) {
  if (deals.length === 0) return;
  process.stdout.write("\x07");
  console.log(formatDeals(deals));

  await Promise.all([
    sendTelegram(deals),
    sendDiscord(deals)
  ]);
}

export function formatDeals(deals) {
  return deals.map((deal) => [
    `[${deal.tag}] ${deal.title}`,
    `${money(deal.cost.landedCop)} COP puesto | ${deal.source} | ${deal.condition}`,
    deal.url
  ].join("\n")).join("\n\n");
}

async function sendTelegram(deals) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatDeals(deals),
      disable_web_page_preview: true
    })
  });
}

async function sendDiscord(deals) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: formatDeals(deals).slice(0, 1900) })
  });
}

function money(value) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
}
