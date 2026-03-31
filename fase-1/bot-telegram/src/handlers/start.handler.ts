import { Markup, Telegraf } from 'telegraf';

export function setupStartHandler(bot: Telegraf) {
    bot.start((ctx) => {
        const welcomeMessage = `¡Bienvenido a LogiCuba!

Tu solución para la logística de cargas en Cuba.

Aquí puedes:
- Publicar una carga que necesites transportar.
- Encontrar un viaje disponible para tu carga.

¿Cómo quieres empezar?`;

        return ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard([
            [Markup.button.callback('Soy Camionero', 'register_driver')],
            [Markup.button.callback('Soy Cliente', 'register_client')]
        ]));
    });
}
