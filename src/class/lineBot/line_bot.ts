import { messagingApi, WebhookEvent } from "@line/bot-sdk";

export class LineBot {
    private client: messagingApi.MessagingApiClient;

    constructor() {
        this.client = new messagingApi.MessagingApiClient({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
        });
    }

    pushText(to: string, text: string) {
        this.client.pushMessage({
            to,
            messages: [{ type: "text", text }],
        });
    }
}