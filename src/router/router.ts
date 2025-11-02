import express from 'express';
import { AppContext } from '../domain/router';
import { Broadcast } from '../control/broadcast/broadcast';
import { SendMessage } from '../control/sendmessage/send_message';



export function Router(router: express.Express, appContext: AppContext): void {
    router.post('/broadcast', express.json(), Broadcast(appContext));

    router.post('/sendMessage', express.json(), SendMessage(appContext));
}