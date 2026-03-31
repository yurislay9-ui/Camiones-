import { Scenes, Telegraf, Markup } from 'telegraf';
import { query } from '../core/database';

// Scene para registrar a un camionero
const driverRegistrationScene = new Scenes.WizardScene(
    'driver_registration',
    async (ctx) => {
        await ctx.reply('Por favor, introduce tu nombre completo:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.nombre = ctx.message.text;
        await ctx.reply('Ahora, tu número de teléfono:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.telefono = ctx.message.text;
        await ctx.reply('Tipo de vehículo (camion_grande, camion_mediano, camioneta, otro):');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.tipo_vehiculo = ctx.message.text;
        await ctx.reply('Capacidad en toneladas de tu vehículo:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.capacidad_ton = ctx.message.text;
        await ctx.reply('Provincia donde te encuentras basado:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        const data = ctx.wizard.state;
        // @ts-ignore
        data.provincia_base = ctx.message.text;

        try {
            await query(
                'INSERT INTO camioneros (nombre, telefono, tipo_vehiculo, capacidad_ton, provincia_base) VALUES ($1, $2, $3, $4, $5)',
                // @ts-ignore
                [data.nombre, data.telefono, data.tipo_vehiculo, data.capacidad_ton, data.provincia_base]
            );
            await ctx.reply('¡Registro de camionero completado con éxito!');
        } catch (error) {
            console.error(error);
            await ctx.reply('Hubo un error al registrarte. Es posible que el teléfono ya esté en uso.');
        }
        return ctx.scene.leave();
    }
);

// Scene para registrar a un cliente
const clientRegistrationScene = new Scenes.WizardScene(
    'client_registration',
    async (ctx) => {
        await ctx.reply('Por favor, introduce tu nombre completo:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.nombre = ctx.message.text;
        await ctx.reply('Ahora, tu número de teléfono:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        ctx.wizard.state.telefono = ctx.message.text;
        await ctx.reply('Dirección (opcional, puedes poner \'ninguna\'):');
        return ctx.wizard.next();
    },
    async (ctx) => {
        // @ts-ignore
        const data = ctx.wizard.state;
        // @ts-ignore
        data.direccion = ctx.message.text;

        try {
            await query(
                'INSERT INTO clientes (nombre, telefono, direccion) VALUES ($1, $2, $3)',
                // @ts-ignore
                [data.nombre, data.telefono, data.direccion]
            );
            await ctx.reply('¡Registro de cliente completado con éxito!');
        } catch (error) {
            console.error(error);
            await ctx.reply('Hubo un error al registrarte. Es posible que el teléfono ya esté en uso.');
        }
        return ctx.scene.leave();
    }
);

export function setupRegistrationHandler(bot: Telegraf, stage: Scenes.Stage<any>) {
    // @ts-ignore
    stage.register(driverRegistrationScene, clientRegistrationScene);

    bot.action('register_driver', (ctx) => ctx.scene.enter('driver_registration'));
    bot.action('register_client', (ctx) => ctx.scene.enter('client_registration'));
}
