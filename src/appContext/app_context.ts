import { AppContext } from '../domain/router';
import { CloudStorage } from '../class/cloudStorage/cloud_storage';


export async function NewAppContext(): Promise<AppContext> {
    const TelegramBot = require('node-telegram-bot-api');

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) console.log('缺少 TELEGRAM_BOT_TOKEN');

    const TGBot = new TelegramBot(token, {
        polling: false, request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });

    // 刪 webhook（避免 409）
    try {
        await TGBot.deleteWebHook({ drop_pending_updates: true });
        console.log('[TG] deleteWebhook OK, use polling');
    } catch (e) {
        console.warn('[TG] deleteWebhook 失敗 (可忽略)', e);
    }
    return {
        // lineBot: new LineBot(),
        cloudStorage: new CloudStorage(),
        TGBot: TGBot
    };
}