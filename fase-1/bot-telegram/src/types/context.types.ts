import { Scenes, Context } from 'telegraf';

// Define all the properties the session can hold across different scenes
// We extend Scenes.WizardSessionData to include the necessary properties like 'cursor'
export interface MySession extends Scenes.WizardSessionData {
    name?: string;
    phone?: string;
    origen_provincia?: string;
    origen_municipio?: string;
    destino_provincia?: string;
    destino_municipio?: string;
    toneladas?: number;
    fecha_salida?: string;
}

// Define the single, unified context type for the whole bot
// This context will be aware of wizard scenes and our custom session data
export type MyContext = Scenes.WizardContext<MySession>;
