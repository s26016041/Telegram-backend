import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { TG_FILE } from '../../const';
import { TGItem } from '../../domain/TG_bot';
import fs from 'fs';
import path from 'path';

export function SendMessage(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const { id, name, content } = req.body as { id: number; name: string; content: string };

        appContext.cloudStorage.parseItem(TG_FILE).then(i => {
            if (i) {
                const item = i as TGItem;

                const text = `${name}:  \n ${content}`;

                let group = item.groups.find(g => g.id === id);

                if (group) {
                    appContext.TGBot.sendMessage(id, text);

                    const broadcasts = Array.isArray(group.Broadcasts) ? group.Broadcasts : [];

                    let itemFind = broadcasts.find(b => b.name === name);

                    if (itemFind) {
                        itemFind.quantity += 1;
                    } else {
                        broadcasts.push({ name: name, quantity: 1 });
                    }

                    group.Broadcasts = broadcasts;

                    fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

                    appContext.cloudStorage.uploadFile(TG_FILE);
                }

            }
        });

        res.sendStatus(200);
    };
}