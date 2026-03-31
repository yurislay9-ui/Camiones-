import { Telegraf } from 'telegraf';
import { MyContext } from '../types/context.types'; // Import the unified context
import { InlineKeyboardMarkup } from 'telegraf/types';

export function setupStartHandler(bot: Telegraf<MyContext>) {
    bot.start(async (ctx) => {
        const keyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
                [{ text: 'Soy Cliente', callback_data: 'register_client' }],
                [{ text: 'Soy Camionero', callback_data: 'register_trucker' }]
            ]
        };

        await ctx.reply(
            '¡Bienvenido a LogiCuba! ¿Eres un cliente que necesita enviar una carga o un camionero que busca transportarla?',
            { reply_markup: keyboard }
        );
    });
}
