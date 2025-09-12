import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { TG_FILE } from '../../const';
import { TGItem } from '../../domain/TG_bot';


export function Broadcast(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const { content } = req.body as { content: string };

        appContext.cloudStorage.parseItem(TG_FILE).then(i => {
            if (i) {
                const item = i as TGItem;

                for (const g of item.groups) {
                    appContext.TGBot.sendMessage(g.id, content);
                }
            }
        });

        res.sendStatus(200);
    };
}