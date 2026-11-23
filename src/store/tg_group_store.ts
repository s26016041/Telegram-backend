import { CloudStorage } from '../class/cloudStorage/cloud_storage';
import { TG_FILE } from '../const';
import { TGGroup, TGItem } from '../domain/TG_bot';

// 每次都從 GCS 取最新名單，避免多個執行個體各拿各的舊快照
export async function LoadItem(cloudStorage: CloudStorage): Promise<TGItem> {
    const i = await cloudStorage.syncItem(TG_FILE);

    const item = (i ?? { groups: [] }) as TGItem;

    if (!Array.isArray(item.groups)) {
        item.groups = [];
    }

    return item;
}

export async function SaveItem(cloudStorage: CloudStorage, item: TGItem): Promise<void> {
    await cloudStorage.saveItem(TG_FILE, item);
}

// id 一律用數字比對，避免 API 傳字串 "-100123" 時 === 比不到
export function FindGroup(item: TGItem, id: number): TGGroup | undefined {
    return item.groups.find(g => Number(g.id) === Number(id));
}

export function UpsertGroup(item: TGItem, id: number): TGGroup {
    let group = FindGroup(item, id);

    if (!group) {
        group = { id: Number(id), Broadcasts: [] };
        item.groups.push(group);
    }

    if (!Array.isArray(group.Broadcasts)) {
        group.Broadcasts = [];
    }

    return group;
}

export function RemoveGroup(item: TGItem, id: number): void {
    item.groups = item.groups.filter(g => Number(g.id) !== Number(id));
}

// 群組升級為超級群組時 chat id 會變，統計要跟著搬到新 ID
export function MigrateGroup(item: TGItem, oldId: number, newId: number): void {
    const old = FindGroup(item, oldId);
    const target = UpsertGroup(item, newId);

    if (!old || old === target) {
        return;
    }

    for (const b of old.Broadcasts) {
        CountBroadcast(target, b.name, b.quantity);
    }

    RemoveGroup(item, oldId);
}

export function CountBroadcast(group: TGGroup, name: string, quantity: number = 1): void {
    const found = group.Broadcasts.find(b => b.name === name);

    if (found) {
        found.quantity += quantity;

        return;
    }

    group.Broadcasts.push({ name: name, quantity: quantity });
}

// 送訊息；若群組已升級成超級群組，Telegram 會在錯誤裡給新 ID，直接改送新 ID
export type SendOptions = {
    // 'HTML' 時 text 可以含 <code>…</code>，Telegram 裡點一下就會複製
    parseMode?: 'HTML';
    // 有給圖片網址就改用 sendPhoto，text 當圖片說明
    photo?: string;
};

// 送一則訊息；有圖片但圖片送不出去（網址壞掉等）時，退回純文字，避免通知漏掉
async function deliver(bot: any, chatId: number, text: string, opts?: SendOptions): Promise<any> {
    const extra = opts?.parseMode ? { parse_mode: opts.parseMode } : {};

    if (opts?.photo) {
        try {
            // .gif 網址用 sendAnimation 才會動（sendPhoto 會把 GIF 當靜態圖）
            if (/\.gif(\?|#|$)/i.test(opts.photo)) {
                return await bot.sendAnimation(chatId, opts.photo, { caption: text, ...extra });
            }

            return await bot.sendPhoto(chatId, opts.photo, { caption: text, ...extra });
        } catch (e: any) {
            if (e?.response?.body?.parameters?.migrate_to_chat_id) {
                throw e;
            }

            console.error(`[TG] sendPhoto 失敗，改送純文字 chatId=${chatId}`, TGErrorDetail(e));
        }
    }

    return await bot.sendMessage(chatId, text, extra);
}

export async function SendWithMigration(bot: any, chatId: number, text: string, opts?: SendOptions): Promise<{ sent: any; chatId: number; migratedFrom?: number }> {
    try {
        const sent = await deliver(bot, chatId, text, opts);

        return { sent: sent, chatId: chatId };
    } catch (e: any) {
        const newId = e?.response?.body?.parameters?.migrate_to_chat_id;

        if (!newId) {
            throw e;
        }

        console.log(`[TG] 群組已升級為超級群組: ${chatId} -> ${newId}，改送新 ID`);

        const sent = await deliver(bot, newId, text, opts);

        return { sent: sent, chatId: Number(newId), migratedFrom: chatId };
    }
}

// bot 已不在該聊天室（被踢 / 群組被刪 / 聊天室不存在）
export function IsChatGone(e: any): boolean {
    const body = e?.response?.body;
    const code = body?.error_code;
    const description: string = body?.description ?? '';

    return code === 403 || (code === 400 && /chat not found/i.test(description));
}

export function TGErrorDetail(e: any): any {
    return e?.response?.body ?? e?.message ?? e;
}
