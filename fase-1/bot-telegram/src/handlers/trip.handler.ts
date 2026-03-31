import { Telegraf, Scenes } from 'telegraf';
import { MyContext } from '../types/context.types'; // Import the unified context
import { query } from '../core/database';

// Create a new Wizard Scene with our unified context
const tripScene = new Scenes.WizardScene<MyContext>(
    'publish_trip_scene',

    // Step 1: Ask for origin province
    async (ctx) => {
        await ctx.reply('OK. Vamos a publicar un nuevo viaje.\n\nPrimero, dime la provincia de origen:');
        return ctx.wizard.next();
    },

    // Step 2: Ask for origin municipality
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.origen_provincia = ctx.message.text;
            await ctx.reply('Ahora el municipio de origen:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una provincia válida.');
        return ctx.wizard.back();
    },

    // Step 3: Ask for destination province
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.origen_municipio = ctx.message.text;
            await ctx.reply('Provincia de destino:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce un municipio válido.');
        return ctx.wizard.back();
    },

    // Step 4: Ask for destination municipality
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.destino_provincia = ctx.message.text;
            await ctx.reply('Municipio de destino:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una provincia válida.');
        return ctx.wizard.back();
    },

    // Step 5: Ask for capacity (toneladas)
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.destino_municipio = ctx.message.text;
            await ctx.reply('¿Cuántas toneladas de capacidad tienes disponible? (ej: 5)');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce un municipio válido.');
        return ctx.wizard.back();
    },

    // Step 6: Ask for departure date
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const toneladas = parseInt(ctx.message.text, 10);
            if (isNaN(toneladas)) {
                await ctx.reply('Por favor, introduce un número válido para las toneladas.');
                return ctx.wizard.back();
            }
            ctx.scene.session.toneladas = toneladas;
            await ctx.reply('¿Qué día sales? (formato: DD/MM/AAAA)');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una capacidad válida.');
        return ctx.wizard.back();
    },

    // Step 7: Confirmation and saving
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.fecha_salida = ctx.message.text;
            const { origen_provincia, origen_municipio, destino_provincia, destino_municipio, toneladas, fecha_salida } = ctx.scene.session;

            const summary = `
Resumen de tu viaje:
- Origen: ${origen_municipio}, ${origen_provincia}
- Destino: ${destino_municipio}, ${destino_provincia}
- Capacidad: ${toneladas} toneladas
- Fecha: ${fecha_salida}

¿Confirmas la publicación de este viaje?
            `;

            await ctx.reply(summary, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Sí, publicar', callback_data: 'confirm_trip' }],
                        [{ text: 'No, cancelar', callback_data: 'cancel_trip' }]
                    ]
                }
            });
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una fecha válida.');
        return ctx.wizard.back();
    },

    // Step 8: Handle confirmation callback (placeholder)
    async (ctx) => {
        // The logic is handled in tripScene.action, so we just leave
        return ctx.scene.leave();
    }
);

// Handle the confirmation action
tripScene.action('confirm_trip', async (ctx) => {
    const { origen_provincia, origen_municipio, destino_provincia, destino_municipio, toneladas, fecha_salida } = ctx.scene.session;
    const telegramId = ctx.from?.id;

    if (!telegramId) {
        await ctx.answerCbQuery();
        await ctx.editMessageText('No se pudo verificar tu identidad. Intenta de nuevo.');
        return ctx.scene.leave();
    }

    try {
        await ctx.answerCbQuery();
        await ctx.editMessageText('Publicando tu viaje...');

        const userResult = await query("SELECT id FROM usuarios WHERE telegram_id = $1 AND tipo_usuario = 'camionero'", [telegramId]);
        if (userResult.rows.length === 0) {
            await ctx.editMessageText('Error: No se encontró tu registro de camionero.');
            return ctx.scene.leave();
        }
        const camioneroId = userResult.rows[0].id;

        await query(
            'INSERT INTO viajes (camionero_id, origen_provincia, origen_municipio, destino_provincia, destino_municipio, toneladas_disponibles, fecha_salida, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [camioneroId, origen_provincia, origen_municipio, destino_provincia, destino_municipio, toneladas, fecha_salida, 'DISPONIBLE']
        );

        await ctx.editMessageText('¡Viaje publicado con éxito! Te notificaremos cuando encontremos una carga compatible.');

    } catch (error) {
        console.error('Failed to publish trip:', error);
        await ctx.editMessageText('Hubo un error al publicar tu viaje. Por favor, inténtalo más tarde.');
    }

    return ctx.scene.leave();
});

// Handle the cancellation action
tripScene.action('cancel_trip', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Publicación de viaje cancelada.');
    return ctx.scene.leave();
});

// This function will be exported and used in index.ts
export function setupTripHandler(bot: Telegraf<MyContext>) {
    bot.command('publicar_viaje', async (ctx) => {
        const telegramId = ctx.from.id;

        try {
            const result = await query('SELECT tipo_usuario FROM usuarios WHERE telegram_id = $1', [telegramId]);
            if (result.rows.length === 0) {
                return ctx.reply('Debes estar registrado para publicar un viaje. Usa /start para comenzar.');
            }
            if (result.rows[0].tipo_usuario !== 'camionero') {
                return ctx.reply('Esta función solo está disponible para camioneros.');
            }
            return ctx.scene.enter('publish_trip_scene');
        } catch (error) {
            console.error('Database check failed for /publicar_viaje', error);
            return ctx.reply('Error al verificar tu estado. La base de datos puede no estar disponible.');
        }
    });
}

// Export the scene instance to be added to the stage
export const tripSceneInstance = tripScene;
