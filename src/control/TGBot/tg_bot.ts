import fs from 'fs';
import path from 'path';
import { CloudStorage } from '../../class/cloudStorage/cloud_storage';
import { TG_FILE, TG_USERNAME } from '../../const';
import { TGItem } from '../../domain/TG_bot';


const item: TGItem = { groups: [] };

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
}

const caseJoinText = "歡迎使用 Fox 通知機器人";

function joinGroup(bot: any, msg: any, cloudStorage: CloudStorage) {
    const addedMe = msg.new_chat_members.some((m: any) => m.username === TG_USERNAME);
    if (addedMe) {
        const id = msg.chat.id;
        item.groups.push({ id: id });

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