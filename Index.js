const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SOLANA_CA_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

function formatNum(n) {
  if (!n) return 'N/A';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

function formatAge(createdAt) {
  if (!createdAt) return 'N/A';
  const ms = Date.now() - createdAt;
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

async function getTokenInfo(ca) {
  try {
    const dex = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${ca}`, { timeout: 8000 });
    const pairs = dex.data?.pairs || [];
    if (!pairs.length) return null;

    const pair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    return {
      name: pair.baseToken?.name || 'Unknown',
      symbol: pair.baseToken?.symbol || '???',
      image: pair.info?.imageUrl || null,
      mc: pair.fdv || pair.marketCap,
      liquidity: pair.liquidity?.usd,
      volume24h: pair.volume?.h24,
      price: pair.priceUsd,
      age: formatAge(pair.pairCreatedAt),
      url: pair.url,
      website: pair.info?.websites?.[0]?.url,
      twitter: pair.info?.socials?.find(s => s.type === 'twitter')?.url,
      holders: 'N/A'
    };
  } catch (e) {
    return null;
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(SOLANA_CA_REGEX);
  if (!matches) return;

  for (const ca of matches) {
    const data = await getTokenInfo(ca);
    if (!data) continue;

    const embed = new EmbedBuilder()
      .setTitle(`${data.symbol} | ${data.name}`)
      .setDescription(`\`${ca}\``)
      .setColor(0x00ff88)
      .setThumbnail(data.image)
      .addFields(
        { name: 'Market Cap', value: formatNum(data.mc), inline: true },
        { name: 'Liquidity', value:
