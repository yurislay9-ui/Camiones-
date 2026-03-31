import { Pool } from 'pg';
import { Telegraf, Scenes } from 'telegraf';
import 'dotenv/config';

// --- Configuration ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
const POLLING_INTERVAL = 15000; // 15 seconds

interface ConfirmedMatch {
    match_id: number;
    cliente_telegram_id: number;
}

// --- Database Logic ---
async function getConfirmedMatches(): Promise<ConfirmedMatch[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                m.id AS match_id,
                uc.telegram_id AS cliente_telegram_id
            FROM matches m
            JOIN cargas c ON m.carga_id = c.id
            JOIN usuarios uc ON c.cliente_id = uc.id
            WHERE m.estado = 'CONFIRMADO'
        `);
        return result.rows;
    } finally {
        client.release();
    }
}

async function markMatchAsPaymentPending(matchId: number): Promise<void> {
    await pool.query('UPDATE matches SET estado = $1 WHERE id = $2', ['PENDIENTE_PAGO', matchId]);
}

// --- Main Worker Logic ---
async function processConfirmedMatches() {
    console.log('Checking for confirmed matches to request payment...');
    try {
        const matches = await getConfirmedMatches();

        if (matches.length === 0) {
            console.log('No confirmed matches found requiring payment.');
            return;
        }

        console.log(`Found ${matches.length} matches. Triggering payment scene for clients...`);

        for (const match of matches) {
             const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Trigger the payment scene for the client
                // We use the bot instance to manually send a message that looks like a command
                // This is a bit of a workaround to trigger a scene from outside a direct user interaction
                await bot.telegram.sendMessage(match.cliente_telegram_id, '/start_payment', {
                    // Pass matchId to the scene via session
                    // @ts-ignore - We are manually setting session state here
                    session: { __scenes: { current: 'payment', state: { matchId: match.match_id } } }
                });

                await markMatchAsPaymentPending(match.match_id);

                await client.query('COMMIT');
                console.log(`Payment process initiated for match #${match.match_id}`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`Error processing confirmed match #${match.match_id}:`, error);
            }
            finally {
                client.release();
            }
        }
    } catch (error) {
        console.error('Error in the payment requester worker:', error);
    }
}

// --- Start the Worker ---
console.log('Starting payment requester worker...');
setInterval(processConfirmedMatches, POLLING_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing payment requester worker.');
  process.exit(0);
});
