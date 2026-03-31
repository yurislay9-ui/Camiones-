
import { Scenes, Context } from 'telegraf';

// Define all the properties the session can hold across different scenes
export interface MySession extends Scenes.WizardSessionData {
    name?: string;
    phone?: string;

    // Properties for trip and old load handlers
    origen_provincia?: string;
    origen_municipio?: string;
    destino_provincia?: string;
    destino_municipio?: string;
    
    // Properties for the new publish_load handler (and general use)
    origen?: string;
    destino?: string;
    toneladas?: number;
    fecha_salida?: string; // from trip handler
    fecha_maxima?: string; // from publish_load handler
}

// Define the single, unified context type for the whole bot
export type MyContext = Scenes.WizardContext<MySession>;
