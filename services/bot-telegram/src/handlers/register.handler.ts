import { Telegraf, Scenes } from 'telegraf';
import { MyContext } from '../types/context.types'; // Import the unified context
import { query } from '../core/database';

// Helper function to create a registration scene, now using MyContext
const createRegistrationScene = (id: string, userType: 'cliente' | 'camionero') => {
    return new Scenes.WizardScene<MyContext>(
        id,
        // Step 1: Ask for name
        async (ctx) => {
            await ctx.reply(`Por favor, introduce tu nombre completo:`);
            return ctx.wizard.next();
        },
        // Step 2: Ask for phone
        async (ctx) => {
            if (ctx.message && 'text' in ctx.message) {
                ctx.scene.session.name = ctx.message.text; // Session is now correctly typed
                await ctx.reply('Ahora, introduce tu número de teléfono:');
                return ctx.wizard.next();
            }
            await ctx.reply('Por favor, introduce un nombre válido.');
            return ctx.wizard.selectStep(1);
        },
        // Step 3: Ask for province
        async (ctx) => {
            if (ctx.message && 'text' in ctx.message) {
                ctx.scene.session.phone = ctx.message.text;
                await ctx.reply('¿En qué provincia te encuentras?');
                return ctx.wizard.next();
            }
            await ctx.reply('Por favor, introduce un número de teléfono válido.');
            return ctx.wizard.selectStep(2);
        },
        // Step 4: Finalize registration
        async (ctx) => {
            console.log(`Entering final registration step for ${userType}.`);

            if (ctx.message && 'text' in ctx.message) {
                const province = ctx.message.text;
                const { name, phone } = ctx.scene.session;
                const telegramId = ctx.from?.id;
                const username = ctx.from?.username || '';

                if (!telegramId) {
                    console.error('CRITICAL: Could not get user\'s Telegram ID.');
                    await ctx.reply('No se ha podido obtener tu ID de Telegram. Por favor, inténtalo de nuevo.');
                    return ctx.scene.leave();
                }

                console.log(`Attempting to register user: ${name} (TG_ID: ${telegramId})`);

                try {
                    const existingUser = await query('SELECT * FROM usuarios WHERE telegram_id = $1', [telegramId]);

                    if (existingUser.rows.length > 0) {
                        console.log(`User ${telegramId} already exists in the database.`);
                        await ctx.reply('Ya estás registrado en el sistema.');
                    } else {
                        console.log(`User ${telegramId} is new. Inserting into database...`);
                        const userResult = await query(
                            'INSERT INTO usuarios (telegram_id, nombre, telefono, provincia, tipo_usuario, nombre_telegram) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [telegramId, name, phone, province, userType, username]
                        );
                        const userId = userResult.rows[0].id;
                        console.log(`User created with ID: ${userId}`);

                        if (userType === 'camionero') {
                            console.log(`User is a 'camionero'. Inserting into camioneros table with user_id: ${userId}`);
                            await query('INSERT INTO camioneros (usuario_id) VALUES ($1)', [userId]);
                        }

                        console.log('Registration successful. Sending final welcome message.');
                        
                        let welcomeMessage = `¡Registro completado con éxito! Bienvenido, ${name}.\n\nAhora puedes usar los siguientes comandos:\n`;
                        
                        if (userType === 'camionero') {
                            welcomeMessage += `/publicar_viaje - Para anunciar un nuevo viaje disponible.\n`;
                            welcomeMessage += `/mis_viajes - Para ver tus viajes publicados.\n`;
                        } else { // 'cliente'
                            welcomeMessage += `/solicitar_carga - Para buscar un camión para tu carga.\n`;
                            welcomeMessage += `/mis_solicitudes - Para ver tus solicitudes de carga.\n`;
                        }
                        
                        await ctx.reply(welcomeMessage);
                    }
                } catch (error) {
                    console.error('DATABASE ERROR during registration:', error);
                    await ctx.reply('Ha ocurrido un error al registrarte. Por favor, contacta a un administrador.');
                }

                console.log('Leaving registration scene.');
                return ctx.scene.leave();
            }
            
            console.warn('Invalid message type received in final registration step.');
            await ctx.reply('Por favor, introduce una provincia válida.');
            return ctx.wizard.selectStep(3);
        }
    );
};

const clientRegisterScene = createRegistrationScene('register_client_scene', 'cliente');
const truckerRegisterScene = createRegistrationScene('register_trucker_scene', 'camionero');

export function setupRegistrationHandler(bot: Telegraf<MyContext>) {
    bot.action('register_client', (ctx) => {
        ctx.answerCbQuery();
        return ctx.scene.enter('register_client_scene');
    });

    bot.action('register_trucker', (ctx) => {
        ctx.answerCbQuery();
        return ctx.scene.enter('register_trucker_scene');
    });
}

export const registrationScenes = [clientRegisterScene, truckerRegisterScene];
