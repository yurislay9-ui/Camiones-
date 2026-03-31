
import { Telegraf, Scenes, session } from 'telegraf';
import { MyContext } from './types/context.types';
import { setupStartHandler } from './handlers/start.handler';
import { setupRegistrationHandler, registrationScenes } from './handlers/register.handler';
import { setupTripHandler, tripSceneInstance } from './handlers/trip.handler';
import { setupLoadHandler, loadSceneInstance } from './handlers/load.handler';
import { setupPublishLoadHandler, publishLoadScene } from './handlers/publish-load.handler';
import { setupMatchHandler } from './handlers/match.handler';
import 'dotenv/config';

const bot_token = process.env.BOT_TOKEN;
if (!bot_token) {
    throw new Error('BOT_TOKEN must be provided!');
}

// Create a new bot instance with our unified context
const bot = new Telegraf<MyContext>(bot_token);

// Combine all scenes into one array
const allScenes = [...registrationScenes, tripSceneInstance, loadSceneInstance, publishLoadScene];

// The stage now uses MyContext, ensuring all scenes are compatible
const stage = new Scenes.Stage<MyContext>(allScenes);

// Use session and stage middleware
bot.use(session());
bot.use(stage.middleware());

// Setup all handlers
setupStartHandler(bot);
setupRegistrationHandler(bot);
setupTripHandler(bot);
setupLoadHandler(bot);
setupPublishLoadHandler(bot);
setupMatchHandler(bot);

// Start the bot
bot.launch().then(() => {
    console.log('Bot started!');
}).catch((err) => {
    console.error('Failed to start bot', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
