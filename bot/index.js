const { Bot, Keyboard, InputFile } = require("grammy");

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token) {
  throw new Error("BOT_TOKEN is not set");
}

if (!webAppUrl) {
  throw new Error("WEBAPP_URL is not set");
}

const bot = new Bot(token);

const mainKeyboard = new Keyboard()
  .webApp("Открыть календарь", webAppUrl)
  .row()
  .text("Помощь")
  .resized();

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Откройте мини-приложение для учёта смен и заработка:",
    { reply_markup: mainKeyboard }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Нажмите “Открыть календарь”, чтобы открыть мини-приложение. " +
      "Резервные копии отправляются в этот чат через кнопку “Сделать резервную копию”."
  );
});

bot.hears("Помощь", async (ctx) => {
  await ctx.reply(
    "Мини-приложение открывается кнопкой “Открыть календарь”. " +
      "Если нужно сохранить данные, нажмите “Сделать резервную копию” внутри приложения."
  );
});

bot.on("message:web_app_data", async (ctx) => {
  const payload = ctx.message.web_app_data?.data;
  if (!payload) {
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  const filename = `backup-${date}.json`;
  const buffer = Buffer.from(payload, "utf-8");
  await ctx.replyWithDocument(new InputFile(buffer, filename));
});

bot.start();
