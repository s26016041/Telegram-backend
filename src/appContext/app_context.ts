import { AppContext } from '../domain/router';
import { CloudStorage } from '../class/cloudStorage/cloud_storage';


export function NewAppContext(TGBot : any): AppContext {
    return {
        // lineBot: new LineBot(),
        cloudStorage: new CloudStorage(),
        TGBot: TGBot
    };
}