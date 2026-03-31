
import { Telegraf, Scenes } from 'telegraf';
import { MyContext } from '../types/context.types';
import { query } from '../core/database';

const publishLoadSceneWizard = new Scenes.WizardScene<MyContext>(
    'publish_load_scene',
    // Step 1: Ask for origin
    async (ctx) => {
        await ctx.reply('Por favor, introduce la ciudad de origen de la carga:');
        return ctx.wizard.next();
    },
    // Step 2: Ask for destination
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.origen = ctx.message.text;
            await ctx.reply('Ahora, introduce la ciudad de destino:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce un origen válido.');
        return ctx.wizard.selectStep(0);
    },
    // Step 3: Ask for tonnage
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.destino = ctx.message.text;
            await ctx.reply('¿Cuántas toneladas pesa la carga? (Usa un número, por ejemplo: 10.5)');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce un destino válido.');
        return ctx.wizard.selectStep(1);
    },
    // Step 4: Ask for deadline date
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const tons = parseFloat(ctx.message.text);
            if (isNaN(tons)) {
                await ctx.reply('Por favor, introduce un número válido para las toneladas.');
                return ctx.wizard.selectStep(2);
            }
            ctx.scene.session.toneladas = tons;
            await ctx.reply('¿Cuál es la fecha límite para la entrega? (Formato: AAAA-MM-DD)');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce un valor para el peso.');
        return ctx.wizard.selectStep(2);
    },
    // Step 5: Finalize and save
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const fecha_maxima = ctx.message.text;
            // Basic validation for date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_maxima)) {
                await ctx.reply('Formato de fecha no válido. Por favor, usa AAAA-MM-DD.');
                return ctx.wizard.selectStep(3);
            }
            ctx.scene.session.fecha_maxima = fecha_maxima;

            const { origen, destino, toneladas } = ctx.scene.session;
            const telegramId = ctx.from?.id;

            if (!telegramId) {
                await ctx.reply('No se pudo obtener tu ID de Telegram. Inténtalo de nuevo.');
                return ctx.scene.leave();
            }

            try {
                // 1. Find the user's internal ID
                const userResult = await query('SELECT id FROM usuarios WHERE telegram_id = $1 AND tipo_usuario = \'cliente\'', [telegramId]);
                
                if (userResult.rows.length === 0) {
                    await ctx.reply('No hemos podido encontrarte en la base de datos como cliente. Por favor, regístrate primero con /start.');
                    return ctx.scene.leave();
                }
                const clienteId = userResult.rows[0].id;

                // 2. Insert the new load into the database
                await query(
                    'INSERT INTO cargas (cliente_id, origen, destino, toneladas, fecha_maxima) VALUES ($1, $2, $3, $4, $5)',
                    [clienteId, origen, destino, toneladas, fecha_maxima]
                );

                await ctx.reply('✅ ¡Tu carga ha sido publicada con éxito! Te notificaremos cuando encontremos un transportista compatible.');

            } catch (error) {
                console.error('DATABASE ERROR during load publication:', error);
                await ctx.reply('Ha ocurrido un error al publicar tu carga. Por favor, contacta a un administrador.');
            }

            return ctx.scene.leave();
        }
        await ctx.reply('Por favor, introduce una fecha válida.');
        return ctx.wizard.selectStep(3);
    }
);

export const publishLoadScene = publishLoadSceneWizard;

export function setupPublishLoadHandler(bot: Telegraf<MyContext>) {
    bot.command('publicar_carga', async (ctx) => {
        try {
            const telegramId = ctx.from?.id;
            if (!telegramId) {
                await ctx.reply('No podemos procesar tu solicitud sin tu ID de Telegram.');
                return;
            }

            const userResult = await query('SELECT tipo_usuario FROM usuarios WHERE telegram_id = $1', [telegramId]);

            if (userResult.rows.length === 0) {
                await ctx.reply('No estás registrado. Por favor, usa /start para comenzar.');
                return;
            }

            if (userResult.rows[0].tipo_usuario !== 'cliente') {
                await ctx.reply('Este comando solo está disponible para usuarios de tipo "cliente".');
                return;
            }

            return ctx.scene.enter('publish_load_scene');
        } catch (error) {
            console.error('Error in /publicar_carga command:', error);
            await ctx.reply('Ocurrió un error al procesar tu solicitud.');
        }
    });
}
