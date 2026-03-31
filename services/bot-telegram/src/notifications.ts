import { Pool } from 'pg';
import { Telegraf } from 'telegraf';
import 'dotenv/config';

// --- Configuration ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
const POLLING_INTERVAL = 10000; // 10 seconds

// --- Types ---
interface MatchProposal {
    match_id: number;
    cliente_telegram_id: number;
    camionero_telegram_id: number;
    carga_descripcion: string;
    origen_carga: string;
    destino_carga: string;
    origen_viaje: string;
    destino_viaje: string;
    monto: number;
}

// --- Database Logic ---

/**
 * Fetches new match proposals that have not been notified yet.
 * @returns An array of match proposals.
 */
async function getNewMatchProposals(): Promise<MatchProposal[]> {
    const client = await pool.connect();
    try {
        // This query is the core of the notification worker. It finds matches in the 'PROPUESTO'
        // state and joins all necessary tables to gather the information needed for a rich notification.
        const result = await client.query(`
            SELECT 
                m.id AS match_id,
                uc.telegram_id AS cliente_telegram_id,
                uca.telegram_id AS camionero_telegram_id,
                c.descripcion AS carga_descripcion,
                c.origen_provincia || ', ' || c.origen_direccion AS origen_carga,
                c.destino_provincia || ', ' || c.destino_direccion AS destino_carga,
                v.origen_provincia || ', ' || v.origen_municipio AS origen_viaje,
                v.destino_provincia || ', ' || v.destino_municipio AS destino_viaje,
                m.monto_acordado as monto
            FROM matches m
            JOIN cargas c ON m.carga_id = c.id
            JOIN viajes v ON m.viaje_id = v.id
            JOIN usuarios uc ON c.cliente_id = uc.id
            JOIN usuarios uca ON v.camionero_id = uca.id
            WHERE m.estado = 'PROPUESTO'
        `);
        return result.rows;
    } finally {
        client.release();
    }
}

/**
 * Updates the state of a match to 'NOTIFICADO'.
 * @param matchId The ID of the match to update.
 */
async function markMatchAsNotified(matchId: number): Promise<void> {
    await pool.query('UPDATE matches SET estado = $1 WHERE id = $2', ['NOTIFICADO', matchId]);
}

// --- Notification Logic ---

/**
 * Sends a notification message to a user.
 * @param telegramId The user's Telegram ID.
 * @param message The message to send.
 */
async function sendNotification(telegramId: number, message: string, matchId: number) {
    try {
        await bot.telegram.sendMessage(telegramId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Aceptar', callback_data: `accept_match_${matchId}` }],
                    [{ text: '❌ Rechazar', callback_data: `reject_match_${matchId}` }]
                ]
            }
        });
    } catch (error) {
        console.error(`Failed to send message to ${telegramId}:`, error);
    }
}

/**
 * The main worker function that polls for proposals and sends notifications.
 */
async function processMatchProposals() {
    console.log('Checking for new match proposals...');
    try {
        const proposals = await getNewMatchProposals();

        if (proposals.length === 0) {
            console.log('No new proposals found.');
            return;
        }

        console.log(`Found ${proposals.length} new proposals. Notifying users...`);

        for (const proposal of proposals) {
            // Transaction: Notify both users and update the match state atomically.
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Construct messages
                const clientMessage = `*¡Nueva propuesta de match!*

Hemos encontrado un viaje compatible para tu carga:

*Carga:* ${proposal.carga_descripcion}
*Ruta:* ${proposal.origen_carga} ➡️ ${proposal.destino_carga}

*Tarifa del servicio LogiCuba:* $${proposal.monto.toFixed(2)} CUP

¿Deseas aceptar esta propuesta?`;

                const camioneroMessage = `*¡Nueva propuesta de match!*

Tu viaje de ${proposal.origen_viaje} a ${proposal.destino_viaje} es compatible con una carga disponible.

*Ruta de la carga:* ${proposal.origen_carga} ➡️ ${proposal.destino_carga}
*Descripción:* ${proposal.carga_descripcion}

*Tarifa del servicio LogiCuba:* $${proposal.monto.toFixed(2)} CUP

¿Deseas aceptar esta propuesta?`;

                // 2. Send notifications
                await sendNotification(proposal.cliente_telegram_id, clientMessage, proposal.match_id);
                await sendNotification(proposal.camionero_telegram_id, camioneroMessage, proposal.match_id);

                // 3. Update match state
                await markMatchAsNotified(proposal.match_id);
                
                await client.query('COMMIT');
                console.log(`Successfully notified and updated match #${proposal.match_id}`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`Error processing match #${proposal.match_id}. Rolled back transaction.`, error);
            }
            finally {
                client.release();
            }
        }
    } catch (error) {
        console.error('Error in the matchmaking notification worker:', error);
    }
}

// --- Start the Worker ---

console.log('Starting match notification worker...');
setInterval(processMatchProposals, POLLING_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing notification worker.');
  process.exit(0);
});
