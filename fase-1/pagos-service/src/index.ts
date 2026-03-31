import { Pool } from 'pg';
import { Telegraf } from 'telegraf';
import 'dotenv/config';

// --- Configuration ---
const POLLING_INTERVAL = 10000; // 10 seconds
const bot = new Telegraf(process.env.BOT_TOKEN!);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface PendingPayment {
    match_id: number;
    cliente_telegram_id: number;
    camionero_telegram_id: number;
}

// --- Database Logic ---
async function getPendingPayments(): Promise<PendingPayment[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT
                m.id AS match_id,
                uc.telegram_id AS cliente_telegram_id,
                uca.telegram_id AS camionero_telegram_id
            FROM matches m
            JOIN cargas c ON m.carga_id = c.id
            JOIN viajes v ON m.viaje_id = v.id
            JOIN usuarios uc ON c.cliente_id = uc.id
            JOIN usuarios uca ON v.camionero_id = uca.id
            WHERE m.estado = 'PENDIENTE_PAGO' AND m.id_operacion_pago IS NOT NULL
        `);
        return result.rows;
    } finally {
        client.release();
    }
}

async function confirmPayment(matchId: number): Promise<void> {
    await pool.query(
        'UPDATE matches SET estado = \'PAGADO\', fecha_pagado = CURRENT_TIMESTAMP WHERE id = $1',
        [matchId]
    );
}

// --- Main Worker Logic ---
async function processPendingPayments() {
    console.log('Checking for pending payments to validate...');
    try {
        const payments = await getPendingPayments();
        
        if (payments.length === 0) {
            console.log('No pending payments to process.');
            return;
        }

        console.log(`Found ${payments.length} pending payments. Validating...`);

        for (const payment of payments) {
            try {
                // --- "Validation" Logic ---
                // In a real-world scenario, this is where you would call an external
                // API to verify the transaction ID. For this simulation, we will
                // automatically consider it valid.
                console.log(`Validating payment for match #${payment.match_id}...`);

                await confirmPayment(payment.match_id);

                console.log(`Payment for match #${payment.match_id} confirmed.`);

                // --- Notify Users ---
                const successMessage = `✅ ¡Pago Confirmado!\n\nEl pago de la tarifa de servicio para el match #${payment.match_id} ha sido validado exitosamente.\n\nEl viaje puede comenzar según lo acordado.`;
                await bot.telegram.sendMessage(payment.cliente_telegram_id, successMessage);
                await bot.telegram.sendMessage(payment.camionero_telegram_id, successMessage);

            } catch (error) {
                console.error(`Error processing payment for match #${payment.match_id}:`, error);
                // Optionally, notify the user of the failure
            }
        }
    } catch (error) {
        console.error('Error in the payment validation worker:', error);
    }
}

// --- Start the Worker ---
console.log('Starting payment validation service...');
setInterval(processPendingPayments, POLLING_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing payment validation service.');
  process.exit(0);
});
