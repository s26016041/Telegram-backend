import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { TGBotRun } from './control/TGBot/tg_bot';
import { Router } from './router/router';
import express from 'express';
import { NewAppContext } from './appContext/app_context';

function index(): void {
    if (process.env.LOCAL_RUN == 'true') {
        dotenv.config();
        loadGcpKeyFromBase64();
    }
    const router = express();

    const TelegramBot = require('node-telegram-bot-api');

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) console.log('缺少 TELEGRAM_BOT_TOKEN');

    const TGBot = new TelegramBot(token, {
        polling: true, request: {
            agentOptions: {
                polling: false,
                keepAlive: true,
                family: 4
            }
        }
    });

    TGBotRun(TGBot);

    const appContext = NewAppContext(TGBot);

    Router(router, appContext);

    router.listen(8080, () => console.log('router 8080'));

    TGBot.startPolling()
        .then(() => console.log('[TG] startPolling'))
        .catch((e: any) => console.error('[TG] startPolling error', e));
}

index();

async function loadGcpKeyFromBase64() {
    const b64 = process.env.GCP_KEY_B64;
    if (!b64) {
        console.warn('[GCP] 未設定 GCP_KEY_B64，略過還原');
        return;
    }
    try {
        const filePath = path.join('./', 'gcp-key.json');
        fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
        console.log('[GCP] 金鑰已還原到', filePath);
    } catch (e) {
        console.error('[GCP] 還原失敗', e);
        throw e;
    }
}