import { Scenes, Telegraf } from 'telegraf';
import { MyContext } from '../types/context.types';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const numero_pago = process.env.PAYMENT_PHONE_NUMBER || '5XXXXXXX'; // Fallback number

// Define the scene
export const paymentScene = new Scenes.BaseScene<MyContext>('payment');

paymentScene.enter(async (ctx) => {
    const matchId = ctx.scene.state.matchId;
    if (!matchId) {
        await ctx.reply('Error: No se ha especificado un ID de match.');
        return ctx.scene.leave();
    }

    // Fetch payment amount
    const result = await pool.query('SELECT monto_acordado FROM matches WHERE id = $1', [matchId]);
    if (result.rows.length === 0) {
        await ctx.reply('Error: No se pudo encontrar el monto del pago.');
        return ctx.scene.leave();
    }
    const monto = result.rows[0].monto_acordado;

    ctx.scene.state.monto = monto;

    const paymentMessage = `
*Proceso de Pago de la Tarifa de Servicio*

Por favor, realiza la transferencia de la tarifa de servicio para confirmar el viaje.

*Monto a pagar:* $${monto.toFixed(2)} CUP
*Número de teléfono:* ${numero_pago}

Una vez completada la transferencia, por favor, envía el *ID de la operación* que recibiste en el SMS de confirmación de Transfermóvil.

Ejemplo de ID: `12345678`
    `;
    await ctx.replyWithMarkdown(paymentMessage);
});

paymentScene.on('text', async (ctx) => {
    const transactionId = ctx.message.text.trim();
    const matchId = ctx.scene.state.matchId;

    // Basic validation for the transaction ID format (numeric)
    if (!/^\d+$/.test(transactionId)) {
        return ctx.reply('El ID de operación no es válido. Por favor, introduce solo los números del ID de la operación que recibiste por SMS.');
    }

    try {
        await pool.query(
            'UPDATE matches SET id_operacion_pago = $1, estado = \'PENDIENTE_PAGO\' WHERE id = $2',
            [transactionId, matchId]
        );

        await ctx.reply(`Gracias. Hemos recibido tu ID de operación: ${transactionId}.\n\nNuestro sistema validará el pago en los próximos minutos. Recibirás una notificación tan pronto como sea confirmado. El camionero también será notificado.`);

        // The pagos-service will now pick this up.

    } catch (error: any) {
        console.error("Error saving transaction ID:", error);
        // Handle unique constraint violation for id_operacion_pago
        if (error.code === '23505') { 
            await ctx.reply('Error: Este ID de operación ya ha sido registrado en nuestro sistema. Por favor, verifica el ID o contacta con soporte si crees que es un error.');
        } else {
            await ctx.reply('Hubo un error al guardar tu ID de operación. Por favor, inténtalo de nuevo.');
        }
    }

    return ctx.scene.leave();
});

paymentScene.leave(async (ctx) => {
    // Optional: Send a confirmation or cleanup message when the scene is left.
    // console.log(`Leaving payment scene for user ${ctx.from.id}`);
});

// --- Handler Setup ---

// This function is not setting up a command, but it exports the scene instance
// to be used in the main bot file.
export function setupPaymentHandler(bot: Telegraf<MyContext>) {
    // This handler doesn't register commands, it just provides the scene.
}
