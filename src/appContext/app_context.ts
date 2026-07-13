import { AppContext } from '../domain/router';
import { CloudStorage } from '../class/cloudStorage/cloud_storage';


export async function NewAppContext(): Promise<AppContext> {
    const TelegramBot = require('node-telegram-bot-api');

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) console.log('缺少 TELEGRAM_BOT_TOKEN');

    const TGBot = new TelegramBot(token, {
        polling: true, request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });

    // 刪 webhook（避免 409）
    // 注意：不能加 drop_pending_updates，否則停機期間「bot 被加入群組」的事件會被丟掉，
    // 那個群組就永遠不會被登記
    try {
        await TGBot.deleteWebHook();
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