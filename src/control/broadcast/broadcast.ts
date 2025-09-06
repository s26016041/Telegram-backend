import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { GROUPS_FILE } from '../../const';
import { Item } from '../../domain/line_bot';

export function Broadcast(appContext: AppContext) {
    return (req: Request, res: Response) => {
        const { name, content } = req.body as { name: string; content: string };
        appContext.cloudStorage.parseItem(GROUPS_FILE).then(i => {
            if (i) {
                const item = i as Item;

                for (const g of item.groups) {
                    const text = `${name}:  \n ${content}`;

                    appContext.lineBot.pushText(g.id, text);
                }
            }
        });

        res.sendStatus(200);
    };
}