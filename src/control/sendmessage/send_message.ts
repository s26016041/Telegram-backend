import { Request, Response } from 'express';
import { AppContext } from '../../domain/router';
import { CountBroadcast, FindGroup, LoadItem, MigrateGroup, SaveItem, SendOptions, SendWithMigration, TGErrorDetail, UpsertGroup } from '../../store/tg_group_store';

const GROUP_TYPES = ['group', 'supergroup'];

// Telegram HTML 模式只需要跳脫這三個字元
function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function SendMessage(appContext: AppContext) {
    return async (req: Request, res: Response) => {
        const requestId = (req as any).requestId ?? '-';
        // code：要讓使用者「點一下就複製」的文字（例如座標），會以等寬字體顯示；
        // photo：圖片網址，有給就用圖片＋說明的方式送出。兩者都是選填，沒給時行為跟以前完全一樣。
        const { id, name, content, code, photo } = (req.body ?? {}) as { id: number | string; name: string; content?: string; code?: string; photo?: string };

        const chatId = Number(id);

        if (!Number.isFinite(chatId) || chatId === 0 || (!content && !code)) {
            console.log(`[sendMessage] ${requestId} 參數錯誤`, { id, name, content, code });

            res.status(400).json({ ok: false, error: 'id 必須是數字，且 content 或 code 至少要有一個', received: { id, name, content, code } });

            return;
        }

        let text: string;
        let opts: SendOptions | undefined;

        if (code) {
            // 例：鬼斯♀ IV100(A15/D15/S15) CP597 L17 剩 06 分: <code>34.918553,135.721833</code>
            text = `${escapeHtml(name ?? '')}: <code>${escapeHtml(code)}</code>`;
            opts = { parseMode: 'HTML' };
        } else {
            text = `${name}:  \n ${content}`;
        }

        if (photo) {
            opts = { ...opts, photo: photo };
        }

        // 直接送，不再先查名單。bot 不在房間裡的話 Telegram 會直接回錯，
        // 名單只用來做廣播與統計。
        let result: { sent: any; chatId: number; migratedFrom?: number };

        try {
            result = await SendWithMigration(appContext.TGBot, chatId, text, opts);

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
