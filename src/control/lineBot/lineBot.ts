import { LineBot } from '../../class/lineBot/line_bot';
import express from 'express';
import { WebhookEvent, middleware } from "@line/bot-sdk";
import fs from 'fs';
import path from 'path';
import { CloudStorage } from '../../class/cloudStorage/cloud_storage';
import { GROUPS_FILE } from '../../const';
import { promises } from 'dns';



type Group = {
    id: string;
};

type Item = {
    groups: Group[];
};

const item: Item = { groups: [] };

export async function LineBotRun(): Promise<void> {
    try {
        const bot = new LineBot();
        const cloudStorage = new CloudStorage();

        const app = express();
        await cloudStorage.downloadFile(GROUPS_FILE);
        await parseItem();

        app.post('/webhook', middleware({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
            channelSecret: process.env.LINE_CHANNEL_SECRET!,
        }), async (req, res) => {
            const events = req.body.events as WebhookEvent[];
            res.sendStatus(200);
            for (const e of events) {
                await typeChoose(e, bot, cloudStorage);
            }
        });

        app.listen(8080, () => console.log('LISTEN 8080'));
    } catch (e) {
        console.log('LineBotRun error', e);
    }
}

async function typeChoose(event: WebhookEvent, bot: LineBot, cloudStorage: CloudStorage): Promise<void> {
    switch (event.type) {
        case "message":
            return;
        case "join":
            await caseJoin(event, bot, cloudStorage);
            return;
        case "leave":
            await caseLeave(event, cloudStorage);
            return;
        default:
            console.log(`default eventsType: ${event.type}`);
            return;
    }
}

const caseJoinText = "歡迎使用 Fox 通知機器人";

async function caseJoin(event: WebhookEvent, bot: LineBot, cloudStorage: CloudStorage): Promise<void> {
    if (event.source.type === 'group') {
        try {
            item.groups.push({ id: event.source.groupId });

            bot.pushText(event.source.groupId, caseJoinText);

            fs.writeFileSync(path.join(GROUPS_FILE), JSON.stringify(item, null, 2));

            cloudStorage.uploadFile(GROUPS_FILE);
        } catch (e) {
            console.log('caseJoin error', e);
        }
    }
}

async function caseLeave(event: WebhookEvent, cloudStorage: CloudStorage): Promise<void> {
    if (event.source.type === 'group') {
        try {
            const gid = event.source.groupId;

            item.groups = item.groups.filter(g => g.id !== gid);

            fs.writeFileSync(path.join(GROUPS_FILE), JSON.stringify(item, null, 2));

            cloudStorage.uploadFile(GROUPS_FILE);
        } catch (e) {
            console.log('caseLeave error', e);
        }
    }
}


function parseItem(): void {


    const filePath = path.join(GROUPS_FILE);

    if (!fs.existsSync(filePath)) {
        console.warn('[Group] groups.txt 不存在，略過讀取');

        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8').trim();
        if (raw === '') return;

        const parsed = JSON.parse(raw);

        if (!parsed || !Array.isArray(parsed.groups)) {
            console.log('[GROUPS] JSON 格式不符，預期 { "group": [...] }，回傳空資料');
            return;
        }

        const list = parsed.groups

        item.groups = list;

        return;
    } catch (e) {
        console.log('[GROUPS] JSON 解析失敗，回傳空陣列', e);
        return;
    }
}