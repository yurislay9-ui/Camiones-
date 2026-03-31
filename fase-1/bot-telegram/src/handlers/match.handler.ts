import { Telegraf } from 'telegraf';
import { MyContext } from '../types/context.types';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper function to get all necessary context for an action
async function getActionContext(matchId: number, telegramId: number) {
    const client = await pool.connect();
    try {
        const detailsQuery = `
            SELECT
                m.id as match_id,
                m.estado as match_estado,
                c.id as carga_id,
                v.id as viaje_id,
                uc.id as cliente_user_id,
                uca.id as camionero_user_id,
                uc.telegram_id as cliente_telegram_id,
                uca.telegram_id as camionero_telegram_id
            FROM matches m
            JOIN cargas c ON m.carga_id = c.id
            JOIN viajes v ON m.viaje_id = v.id
            JOIN usuarios uc ON c.cliente_id = uc.id
            JOIN usuarios uca ON v.camionero_id = uca.id
            WHERE m.id = $1
        `;
        const detailsResult = await client.query(detailsQuery, [matchId]);
        if (detailsResult.rows.length === 0) return null;

        const details = detailsResult.rows[0];
        const currentUserIsClient = details.cliente_telegram_id == telegramId;

        return {
            details,
            currentUserIsClient
        };

    } finally {
        client.release();
    }
}


export function setupMatchHandler(bot: Telegraf<MyContext>) {

    // Handle "Accept" button
    bot.action(/^accept_match_(\d+)$/, async (ctx) => {
        const matchId = parseInt(ctx.match[1], 10);
        const telegramId = ctx.from.id;

        await ctx.answerCbQuery('Procesando aceptación...');
        
        const context = await getActionContext(matchId, telegramId);
        if (!context) {
            return ctx.reply('Error: No se pudo encontrar el match asociado.');
        }

        const { details, currentUserIsClient } = context;
        const otherPartyId = currentUserIsClient ? details.camionero_telegram_id : details.cliente_telegram_id;

        // Prevent action if match is not in a valid state
        const validInitialStates = ['NOTIFICADO', 'ACEPTADO_POR_CLIENTE', 'ACEPTADO_POR_CAMIONERO'];
        if (!validInitialStates.includes(details.match_estado)) {
            return ctx.editMessageText('Esta propuesta ya ha sido aceptada, rechazada o cancelada.');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let newState: string | null = null;

            if (details.match_estado === 'NOTIFICADO') {
                newState = currentUserIsClient ? 'ACEPTADO_POR_CLIENTE' : 'ACEPTADO_POR_CAMIONERO';
            } else if (details.match_estado === 'ACEPTADO_POR_CLIENTE' && !currentUserIsClient) {
                newState = 'CONFIRMADO';
            } else if (details.match_estado === 'ACEPTADO_POR_CAMIONERO' && currentUserIsClient) {
                newState = 'CONFIRMADO';
            }

            if (newState) {
                await client.query('UPDATE matches SET estado = $1 WHERE id = $2', [newState, matchId]);
                
                if (newState === 'CONFIRMADO') {
                    await client.query('UPDATE matches SET fecha_confirmado = CURRENT_TIMESTAMP WHERE id = $1', [matchId]);
                    await client.query('UPDATE cargas SET estado = \'ASIGNADA\' WHERE id = $1', [details.carga_id]);
                    await client.query('UPDATE viajes SET estado = \'EN_PROCESO\' WHERE id = $1', [details.viaje_id]);

                    const confirmationMessage = `✅ ¡Match Confirmado! Ambas partes han aceptado. El siguiente paso es el pago. En breve el bot se comunicará con el cliente para procesar el pago de la tarifa de servicio.`;
                    await bot.telegram.sendMessage(details.cliente_telegram_id, confirmationMessage);
                    await bot.telegram.sendMessage(details.camionero_telegram_id, confirmationMessage);
                    await ctx.editMessageText('Has aceptado el match. ¡El acuerdo está confirmado!');
                } else {
                    await ctx.editMessageText('Has aceptado la propuesta. Estamos esperando la confirmación de la otra parte.');
                    await bot.telegram.sendMessage(otherPartyId, 'La otra parte ha aceptado la propuesta. ¡Ahora es tu turno de confirmar!');
                }
            } else {
                await ctx.editMessageText('Ya has aceptado esta propuesta. Esperando a la otra parte.');
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error handling match acceptance:', error);
            await ctx.reply('Hubo un error al procesar tu respuesta.');
        } finally {
            client.release();
        }
    });

    // Handle "Reject" button
    bot.action(/^reject_match_(\d+)$/, async (ctx) => {
        const matchId = parseInt(ctx.match[1], 10);
        const telegramId = ctx.from.id;

        await ctx.answerCbQuery('Procesando rechazo...');
        
        const context = await getActionContext(matchId, telegramId);
        if (!context) {
            return ctx.reply('Error: No se pudo encontrar el match asociado.');
        }

        const { details } = context;

        const finalStates = ['CONFIRMADO', 'RECHAZADO', 'CANCELADO'];
        if (finalStates.includes(details.match_estado)) {
            return ctx.editMessageText('Este match ya no se puede rechazar.');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE matches SET estado = \'RECHAZADO\' WHERE id = $1', [matchId]);
            
            // Make the carga and viaje available again
            await client.query('UPDATE cargas SET estado = \'PENDIENTE\' WHERE id = $1', [details.carga_id]);
            await client.query('UPDATE viajes SET estado = \'DISPONIBLE\' WHERE id = $1', [details.viaje_id]);

            await client.query('COMMIT');
            
            const rejectionMessage = `La propuesta de match ha sido rechazada. La carga y el viaje están disponibles nuevamente para otras oportunidades.`;
            await bot.telegram.sendMessage(details.cliente_telegram_id, rejectionMessage);
            await bot.telegram.sendMessage(details.camionero_telegram_id, rejectionMessage);
            await ctx.editMessageText('Has rechazado la propuesta.');

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error handling match rejection:', error);
            await ctx.reply('Hubo un error al procesar tu rechazo.');
        } finally {
            client.release();
        }
    });
}