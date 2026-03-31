import { Telegraf, Scenes } from 'telegraf';
import { MyContext } from '../types/context.types';
import { query } from '../core/database';

const publishLoadScene = new Scenes.WizardScene<MyContext>(
    'publish_load_scene',
    async (ctx) => {
        await ctx.reply('Iniciando publicación de carga.\n\nPor favor, dime la PROVINCIA de ORIGEN y la DIRECCIÓN específica de recogida:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.origen_provincia = ctx.message.text;
            await ctx.reply('Ahora, dime la PROVINCIA de DESTINO y la DIRECCIÓN específica de entrega:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una dirección de origen válida.');
        return ctx.wizard.selectStep(0);
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.destino_provincia = ctx.message.text;
            await ctx.reply('Describe brevemente qué mercancía deseas transportar:');
            return ctx.wizard.next();
        }
        await ctx.reply('Por favor, introduce una dirección de destino válida.');
        return ctx.wizard.selectStep(1);
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.name = ctx.message.text; // Usamos name temporalmente para la descripción
            await ctx.reply('¿Cuál es el peso aproximado de la carga en KILOGRAMOS (KG)?');
            return ctx.wizard.next();
        }
        return ctx.wizard.selectStep(2);
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const peso = parseInt(ctx.message.text);
            if (isNaN(peso)) {
                await ctx.reply('Por favor, introduce un número válido para el peso.');
                return ctx.wizard.selectStep(3);
            }
            ctx.scene.session.toneladas = peso;
            await ctx.reply('¿Cuál es la fecha límite para este envío? (Formato: DD/MM/AAAA)');
            return ctx.wizard.next();
        }
        return ctx.wizard.selectStep(3);
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.fecha_salida = ctx.message.text;
            const s = ctx.scene.session;
            const summary = `Confirmación de Carga:\n- Origen: ${s.origen_provincia}\n- Destino: ${s.destino_provincia}\n- Carga: ${s.name}\n- Peso: ${s.toneladas} KG\n- Límite: ${s.fecha_salida}\n\n¿Deseas publicar esta carga?`;
            
            await ctx.reply(summary, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Confirmar', callback_data: 'confirm_load' }],
                        [{ text: '❌ Cancelar', callback_data: 'cancel_load' }]
                    ]
                }
            });
            return ctx.wizard.next();
        }
        return ctx.wizard.selectStep(4);
    },
    async (ctx) => ctx.scene.leave()
);

publishLoadScene.action('confirm_load', async (ctx) => {
    const s = ctx.scene.session;
    const telegramId = ctx.from?.id;

    try {
        const userRes = await query('SELECT id FROM clientes WHERE id IN (SELECT id FROM usuarios WHERE telegram_id = $1 AND tipo_usuario = \'cliente\')', [telegramId]);
        
        if (userRes.rows.length === 0) {
            await ctx.editMessageText('Error: Debes estar registrado como cliente.');
            return ctx.scene.leave();
        }

        await query(
            'INSERT INTO cargas (cliente_id, origen_provincia, origen_direccion, destino_provincia, destino_direccion, descripcion, peso_kg, fecha_limite) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [userRes.rows[0].id, s.origen_provincia, s.origen_provincia, s.destino_provincia, s.destino_provincia, s.name, s.toneladas, s.fecha_salida]
        );

        await ctx.editMessageText('✅ ¡Carga publicada con éxito! Estamos buscando camioneros disponibles.');
    } catch (error) {
        console.error(error);
        await ctx.editMessageText('❌ Error al guardar la carga.');
    }
    return ctx.scene.leave();
});

publishLoadScene.action('cancel_load', async (ctx) => {
    await ctx.editMessageText('Publicación cancelada.');
    return ctx.scene.leave();
});

export function setupLoadHandler(bot: Telegraf<MyContext>) {
    bot.command('publicar_carga', async (ctx) => {
        const res = await query('SELECT tipo_usuario FROM usuarios WHERE telegram_id = $1', [ctx.from.id]);
        if (res.rows.length > 0 && res.rows[0].tipo_usuario === 'cliente') {
            return ctx.scene.enter('publish_load_scene');
        }
        return ctx.reply('Solo los clientes registrados pueden publicar cargas.');
    });
}

export const loadSceneInstance = publishLoadScene;