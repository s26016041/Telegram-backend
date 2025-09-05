import { LineBot } from '../../class/lineBot/lineBot';
import express from 'express';
import { messagingApi, WebhookEvent, middleware} from "@line/bot-sdk";

export function lineBot(): void {
    const app = express();
    const bot = new LineBot();

    app.post('/webhook', middleware({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
        channelSecret: process.env.LINE_CHANNEL_SECRET!,
    }), async (req, res) => {
        const events = req.body.events as WebhookEvent[];
        await Promise.all(events.map(e => console.log(e.type)));
        res.sendStatus(200);
    });

    app.listen(3000, () => console.log('LISTEN 3000'));
}