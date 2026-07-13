import { CloudStorage } from '../../class/cloudStorage/cloud_storage';
import { TG_USERNAME } from '../../const';
import { TGItem } from '../../domain/TG_bot';
import { FindGroup, LoadItem, MigrateGroup, RemoveGroup, SaveItem, TGErrorDetail, UpsertGroup } from '../../store/tg_group_store';

const caseJoinText = "歡迎使用 Fox 通知機器人";

const JOINED_STATUS = ['member', 'administrator', 'creator'];
const LEFT_STATUS = ['left', 'kicked'];

let botId: number | undefined;

export async function TGBotRun(bot: any): Promise<void> {
    const cloudStorage = new CloudStorage();

    try {
        const me = await bot.getMe();

        botId = me?.id;

        console.log(`[TG] bot 啟動: @${me?.username} id=${botId}`);
    } catch (e) {
        console.error('[TG] getMe 失敗，改用 username 比對', TGErrorDetail(e));
    }

    try {
        const item = await LoadItem(cloudStorage);

        console.log('[TG] 當前群組 ID: ', item.groups.map(g => g.id));
    } catch (e) {
        console.error('[TG] 載入群組名單失敗', e);
    }

    bot.on('polling_error', (e: any) => console.error('[TG] polling_error:', TGErrorDetail(e)));
    bot.on('error', (e: any) => console.error('[TG] error:', TGErrorDetail(e)));

    TGon(bot, cloudStorage);
}

function isMe(member: any): boolean {
    if (botId && member?.id) {
        return member.id === botId;
    }

    return member?.username === TG_USERNAME;
}

function TGon(bot: any, cloudStorage: CloudStorage) {
    // bot 自己的成員狀態變化：被加入 / 被移除都一定會收到，
    // 不必依賴 new_chat_members 的 username 比對
    bot.on('my_chat_member', async (update: any) => {
        const chat = update?.chat;
        const status = update?.new_chat_member?.status;

        console.log(`[TG] my_chat_member: chatId=${chat?.id} type=${chat?.type} title=${chat?.title} status=${status}`);

        if (!chat) {
            return;
        }

        try {
            if (JOINED_STATUS.includes(status)) {
                await joinGroup(bot, chat, cloudStorage);
            }

            if (LEFT_STATUS.includes(status)) {
                await leftGroup(chat.id, cloudStorage);
            }
        } catch (e) {
            console.error(`[TG] my_chat_member 處理失敗 chatId=${chat?.id}`, e);
        }
    });

    bot.on('message', async (msg: any) => {
        try {
            if (msg.new_chat_members?.some(isMe)) {
                console.log('[TG] 加入群組: ', msg.chat.id);

                await joinGroup(bot, msg.chat, cloudStorage);
            }

            if (msg.left_chat_member && isMe(msg.left_chat_member)) {
                console.log('[TG] 退出群組: ', msg.chat.id);

                await leftGroup(msg.chat.id, cloudStorage);
            }

            // 群組升級為超級群組時 chat id 會改變，名單要跟著搬
            if (msg.migrate_to_chat_id) {
                console.log(`[TG] 群組升級: ${msg.chat.id} -> ${msg.migrate_to_chat_id}`);

                await migrateGroup(msg.chat.id, msg.migrate_to_chat_id, cloudStorage);
            }
        } catch (e) {
            console.error(`[TG] message 處理失敗 chatId=${msg?.chat?.id}`, e);
        }
    });

    bot.onText(/\/broadcast/, async (msg: any) => {
        console.log(`[TG] ${msg.chat.id} 觸發廣播統計`);

        try {
            await broadcast(bot, msg, cloudStorage);
        } catch (e) {
            console.error(`[TG] /broadcast 失敗 chatId=${msg?.chat?.id}`, e);
        }
    });

    bot.onText(/\/remake_broadcast/, async (msg: any) => {
        console.log(`[TG] ${msg.chat.id} 刪除廣播紀錄`);

        try {
            await remakeBroadcast(bot, msg, cloudStorage);
        } catch (e) {
            console.error(`[TG] /remake_broadcast 失敗 chatId=${msg?.chat?.id}`, e);
        }
    });

    bot.onText(/\/remake_data/, async (msg: any) => {
        console.log(`[TG] ${msg.chat.id} 刪除資料庫`);

        try {
            await remakeData(bot, msg, cloudStorage);
        } catch (e) {
            console.error(`[TG] /remake_data 失敗 chatId=${msg?.chat?.id}`, e);
        }
    });

    bot.onText(/\/room_id/, (msg: any) => {
        console.log(`[TG] 查詢房間 ID: ${msg.chat.id} type=${msg.chat.type}`);

        getRoomID(bot, msg);
    });
}

function getRoomID(bot: any, msg: any) {
    const id = msg.chat.id;

    bot.sendMessage(id, `本群組 ID 為: ${id}`)
        .catch((e: any) => console.error(`[TG] /room_id 回覆失敗 chatId=${id}`, TGErrorDetail(e)));
}

async function remakeData(bot: any, msg: any, cloudStorage: CloudStorage) {
    const id = msg.chat.id;

    const item: TGItem = { groups: [] };

    await SaveItem(cloudStorage, item);

    await bot.sendMessage(id, `資料庫已重製💾`);
}

async function remakeBroadcast(bot: any, msg: any, cloudStorage: CloudStorage) {
    const id = msg.chat.id;

    const item = await LoadItem(cloudStorage);

    const group = FindGroup(item, id);

    if (group) {
        group.Broadcasts = [];
    }

    await SaveItem(cloudStorage, item);

    await bot.sendMessage(id, `廣播紀錄已重製📣`);
}

async function broadcast(bot: any, msg: any, cloudStorage: CloudStorage) {
    const id = msg.chat.id;

    const item = await LoadItem(cloudStorage);

    const group = FindGroup(item, id);

    let text = `廣播紀錄📣: \n`;

    if (group) {
        for (const m of group.Broadcasts) {
            text += `${m.name}: ${m.quantity} 次\n`;
        }
    }

    await bot.sendMessage(id, text);
}

async function joinGroup(bot: any, chat: any, cloudStorage: CloudStorage) {
    const id = chat.id;

    const item = await LoadItem(cloudStorage);

    // 已經在名單裡就不重複登記、也不重複打招呼
    if (FindGroup(item, id)) {
        console.log(`[TG] 已在名單中，略過: ${id}`);

        return;
    }

    UpsertGroup(item, id);

    await SaveItem(cloudStorage, item);

    console.log(`[TG] 已登記群組: ${id} title=${chat.title}`);

    await bot.sendMessage(id, `👋 ${caseJoinText}`);
}

async function leftGroup(id: number, cloudStorage: CloudStorage) {
    const item = await LoadItem(cloudStorage);

    if (!FindGroup(item, id)) {
        return;
    }

    RemoveGroup(item, id);

    await SaveItem(cloudStorage, item);

    console.log(`[TG] 已移除群組: ${id}`);
}

async function migrateGroup(oldId: number, newId: number, cloudStorage: CloudStorage) {
    const item = await LoadItem(cloudStorage);

    MigrateGroup(item, oldId, newId);

    await SaveItem(cloudStorage, item);

    console.log(`[TG] 群組 ID 已搬移: ${oldId} -> ${newId}`);
}
