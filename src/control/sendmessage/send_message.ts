import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { CountBroadcast, FindGroup, LoadItem, MigrateGroup, SaveItem, SendWithMigration, TGErrorDetail, UpsertGroup } from '../../store/tg_group_store';

const GROUP_TYPES = ['group', 'supergroup'];

export function SendMessage(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const requestId = (req as any).requestId ?? '-';
        const { id, name, content } = (req.body ?? {}) as { id: number | string; name: string; content: string };

        const chatId = Number(id);

        if (!Number.isFinite(chatId) || chatId === 0 || !content) {
            console.log(`[sendMessage] ${requestId} 參數錯誤`, { id, name, content });

            res.status(400).json({ ok: false, error: 'id 必須是數字且 content 不可為空', received: { id, name, content } });

            return;
        }

        const text = `${name}:  \n ${content}`;

        // 直接送，不再先查名單。bot 不在房間裡的話 Telegram 會直接回錯，
        // 名單只用來做廣播與統計。
        let result: { sent: any; chatId: number; migratedFrom?: number };

        try {
            result = await SendWithMigration(appContext.TGBot, chatId, text);

            console.log(`[sendMessage] ${requestId} 送出成功 chatId=${result.chatId} messageId=${result.sent?.message_id} chatType=${result.sent?.chat?.type} title=${result.sent?.chat?.title}`);
        } catch (e) {
            const detail = TGErrorDetail(e);

            console.error(`[sendMessage] ${requestId} 送出失敗 chatId=${chatId}`, detail);

            res.status(502).json({ ok: false, error: 'Telegram 送出失敗', chatId: chatId, detail: detail });

            return;
        }

        // 統計失敗不影響「訊息已送出」這件事，只記 log
        try {
            await recordBroadcast(appContext, result, name, requestId);
        } catch (e) {
            console.error(`[sendMessage] ${requestId} 統計寫入失敗 chatId=${result.chatId}`, e);
        }

        res.status(200).json({ ok: true, chatId: result.chatId, migratedFrom: result.migratedFrom });
    };
}

async function recordBroadcast(appContext: AppContext, result: { sent: any; chatId: number; migratedFrom?: number }, name: string, requestId: string): Promise<void> {
    const chatId = result.chatId;
    const chatType = result.sent?.chat?.type;

    // 走到這裡代表訊息已經送成功 = bot 確實在這個聊天室裡；
    // 但只有群組才進名單，私訊 / 頻道不能被 /broadcast 群發到。
    if (!GROUP_TYPES.includes(chatType)) {
        console.log(`[sendMessage] ${requestId} chatId=${chatId} 是 ${chatType}，不是群組，不列入名單與統計`);

        return;
    }

    const item = await LoadItem(appContext.cloudStorage);

    if (result.migratedFrom) {
        MigrateGroup(item, result.migratedFrom, chatId);
    }

    if (!FindGroup(item, chatId)) {
        console.log(`[sendMessage] ${requestId} 名單中沒有此群組但訊息送得出去，自動補登記: ${chatId}`);
    }

    const group = UpsertGroup(item, chatId);

    if (name) {
        CountBroadcast(group, name);
    }

    await SaveItem(appContext.cloudStorage, item);
}
