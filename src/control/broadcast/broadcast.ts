import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { TG_FILE } from '../../const';
import { TGItem } from '../../domain/TG_bot';
import fs from 'fs';
import path from 'path';

export function Broadcast(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const { name, content } = req.body as { name: string; content: string };

        appContext.cloudStorage.parseItem(TG_FILE).then(i => {
            if (i) {
                const item = i as TGItem;

                for (const g of item.groups) {
                    const text = `${name}:  \n ${content}`;

                    appContext.TGBot.sendMessage(g.id, text);
                }

                const broadcasts = Array.isArray(item.Broadcasts) ? item.Broadcasts : [];

                let itemFind = broadcasts.find(b => b.name === name);

                if (itemFind) {
                    itemFind.quantity += 1;
                } else {
                    broadcasts.push({ name: name, quantity: 1 });
                }

                item.Broadcasts = broadcasts;

                fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

                appContext.cloudStorage.uploadFile(TG_FILE);
            }
        });

        res.sendStatus(200);
    };
}