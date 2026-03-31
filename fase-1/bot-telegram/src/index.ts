import { Telegraf, Scenes, session } from 'telegraf';
import dotenv from 'dotenv';
import { setupStartHandler } from './handlers/start.handler';
import { setupRegistrationHandler } from './handlers/register.handler';

dotenv.config();

const bot = new Telegraf<Scenes.WizardContext>(process.env.BOT_TOKEN!)

const stage = new Scenes.Stage<Scenes.WizardContext>([], {
    default: 'main',
});

bot.use(session());
bot.use(stage.middleware());

setupStartHandler(bot);
setupRegistrationHandler(bot, stage);

bot.launch().then(() => {
    console.log('Bot de LogiCuba iniciado y funcionando');
});

// Manejo de errores
bot.catch((err, ctx) => {
    console.error(`Error para ${ctx.updateType}`, err)
});

// Manejo de señales de terminación
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
