import express from 'express';
import { AppContext } from '../domain/router';
import { Broadcast } from '../control/broadcast/broadcast';
import { SendMessage } from '../control/sendmessage/send_message';
import { ErrorHandler, RequestLogger } from '../middleware/request_logger';
import { LoadItem } from '../store/tg_group_store';

export function Router(router: express.Express, appContext: AppContext): void {
    router.use(express.json());
    router.use(RequestLogger);

    router.post('/broadcast', Broadcast(appContext));

    router.post('/sendMessage', SendMessage(appContext));

    // 除錯用：看目前名單裡有哪些群組
    router.get('/groups', async (_req, res) => {
        const item = await LoadItem(appContext.cloudStorage);

        res.status(200).json(item);
    });

    router.use(ErrorHandler);
}
