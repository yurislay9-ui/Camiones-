import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './fase-1/bot-telegram/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const query = async (text: string, params: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err: any) {
        const duration = Date.now() - start;
        console.error('error in query', { text, duration, error: err.stack });
        throw err;
    }
};
