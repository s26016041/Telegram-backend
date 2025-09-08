import { LineBot } from '../class/lineBot/line_bot';
import { CloudStorage } from '../class/cloudStorage/cloud_storage';

export interface AppContext {
    lineBot: LineBot;
    cloudStorage: CloudStorage;
    TGBot: any;
}