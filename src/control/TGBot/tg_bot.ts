import fs from 'fs';
import path from 'path';
import { CloudStorage } from '../../class/cloudStorage/cloud_storage';
import { TG_FILE, TG_USERNAME } from '../../const';
import { TGItem } from '../../domain/TG_bot';


let item: TGItem = { groups: [] };

export async function TGBotRun(bot: any): Promise<void> {
    try {
        const cloudStorage = new CloudStorage();
        await cloudStorage.downloadFile(TG_FILE);
        await cloudStorage.parseItem(TG_FILE).then(i => {
            if (i) {
                item.groups = i.groups;
            }
        });

        console.log('當前群組 ID: ', item.groups);

        TGon(bot, cloudStorage)
    } catch (e) {
        console.log('LineBotRun error', e);
    }
}

function TGon(bot: any, cloudStorage: CloudStorage) {
    bot.on('message', (msg: any) => {
        if (msg.new_chat_members) {
            joinGroup(bot, msg, cloudStorage)
        }

        if (msg.left_chat_member) {
            leftGroup(msg, cloudStorage)
        }
    });

    bot.onText(/\/broadcast/, (msg: any) => {
        broadcast(bot, msg, cloudStorage)
    });

    bot.onText(/\/remake_broadcast/, (msg: any) => {
        remakeBroadcast(bot, msg, cloudStorage)
    });

    bot.onText(/\/remake_data/, (msg: any) => {
        remakeData(bot, msg, cloudStorage)
    });

    bot.onText(/\/room_id/, (msg: any) => {
        getRoomID(bot, msg)
    });
}

function getRoomID(bot: any, msg: any) {
    const id = msg.chat.id;

    bot.sendMessage(id, `本群組 ID 為: ${id}`);
}

async function remakeData(bot: any, msg: any, cloudStorage: CloudStorage) {
    const id = msg.chat.id;

    item = { groups: [] };

    fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

    cloudStorage.uploadFile(TG_FILE);

    bot.sendMessage(id, `資料庫已重製💾`);
}

async function remakeBroadcast(bot: any, msg: any, cloudStorage: CloudStorage) {
    const id = msg.chat.id;

    let groups = item.groups.find(g => g.id === id)

    if (groups) {
        groups.Broadcasts = [];
    }


    fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

    cloudStorage.uploadFile(TG_FILE);

    bot.sendMessage(id, `廣播紀錄已重製📣`);
}

async function broadcast(bot: any, msg: any, cloudStorage: CloudStorage) {
    const i = await cloudStorage.parseItem(TG_FILE);
    if (i) {
        item = i;
    }
    const id = msg.chat.id;

    const group = item.groups.find(g => g.id === id);

    let text = `廣播紀錄📣: \n`;

    if (group) {
        for (const m of group.Broadcasts) {
            text += `${m.name}: ${m.quantity} 次\n`;
        }
    }
    bot.sendMessage(id, text);
}

const caseJoinText = "歡迎使用 Fox 通知機器人";

function joinGroup(bot: any, msg: any, cloudStorage: CloudStorage) {
    const addedMe = msg.new_chat_members.some((m: any) => m.username === TG_USERNAME);

    if (addedMe) {
        const id = msg.chat.id;
        item.groups.push({ id: id, Broadcasts: [] });

        bot.sendMessage(id, `👋 ${caseJoinText}`);

        fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

        cloudStorage.uploadFile(TG_FILE);

        console.log('加入: ', id);
    }
}


function leftGroup(msg: any, cloudStorage: CloudStorage) {
    const addedMe = msg.left_chat_member.username === TG_USERNAME;

    if (addedMe) {
        const id = msg.chat.id;

        item.groups = item.groups.filter(g => g.id !== id);

        fs.writeFileSync(path.join(TG_FILE), JSON.stringify(item, null, 2));

        cloudStorage.uploadFile(TG_FILE);

        console.log('刪除: ', id);
    }
}