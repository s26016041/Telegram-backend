import express from 'express';
import { AppContext } from '../domain/router';
import { Broadcast } from '../control/broadcast/broadcast';



export function Router(router: express.Express, appContext: AppContext): void {
    router.post('/broadcast', express.json(), Broadcast(appContext));

}