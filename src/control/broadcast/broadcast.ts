import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { IsChatGone, LoadItem, MigrateGroup, RemoveGroup, SaveItem, SendWithMigration, TGErrorDetail } from '../../store/tg_group_store';

export function Broadcast(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const requestId = (req as any).requestId ?? '-';
        const { content } = (req.body ?? {}) as { content: string };

        if (!content) {
            console.log(`[broadcast] ${requestId} 參數錯誤`, req.body);

            res.status(400).json({ ok: false, error: 'content 不可為空', received: req.body });

            return;
        }

        let item;

        try {
            item = await LoadItem(appContext.cloudStorage);
        } catch (e) {
            console.error(`[broadcast] ${requestId} 讀取群組名單失敗`, e);

            res.status(500).json({ ok: false, error: '讀取群組名單失敗' });

            return;
        }

        const ids = item.groups.map(g => Number(g.id));

        console.log(`[broadcast] ${requestId} 準備廣播到 ${ids.length} 個群組`, ids);

        const succeeded: number[] = [];
        const failed: { id: number; detail: any }[] = [];
        const removed: number[] = [];

        let changed = false;

        for (const id of ids) {
            try {
                const result = await SendWithMigration(appContext.TGBot, id, content);

                if (result.migratedFrom) {
                    MigrateGroup(item, result.migratedFrom, result.chatId);
                    changed = true;
                }

                succeeded.push(result.chatId);

                console.log(`[broadcast] ${requestId} 送出成功 chatId=${result.chatId} messageId=${result.sent?.message_id}`);
            } catch (e) {
                const detail = TGErrorDetail(e);

                console.error(`[broadcast] ${requestId} 送出失敗 chatId=${id}`, detail);

                failed.push({ id: id, detail: detail });

                // bot 已經不在這個群組了，從名單移掉，避免名單愈積愈髒
                if (IsChatGone(e)) {
                    console.log(`[broadcast] ${requestId} bot 已不在群組，從名單移除: ${id}`);

                    RemoveGroup(item, id);
                    removed.push(id);
                    changed = true;
                }
            }
        }

        if (changed) {
            try {
                await SaveItem(appContext.cloudStorage, item);
            } catch (e) {
                console.error(`[broadcast] ${requestId} 名單更新失敗`, e);
            }
        }

        console.log(`[broadcast] ${requestId} 完成 成功=${succeeded.length} 失敗=${failed.length} 移除=${removed.length}`);

        res.status(200).json({
            ok: failed.length === 0,
            total: ids.length,
            succeeded: succeeded,
            failed: failed,
            removed: removed,
        });
    };
}
