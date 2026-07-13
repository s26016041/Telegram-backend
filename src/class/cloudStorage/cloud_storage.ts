import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

export class CloudStorage {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.storage = new Storage();
        this.bucketName = process.env.GCS_BUCKET!;
    }

    async uploadFile(filePath: string): Promise<void> {
        if (!fs.existsSync(filePath)) {
            console.log(`檔案不存在: ${filePath}`);
            return;
        }
        await this.storage.bucket(this.bucketName).upload(filePath, {
            resumable: false
        });
    }

    async downloadFile(fileName: string): Promise<void> {
        const fileRef = this.storage.bucket(this.bucketName).file(fileName);

        const [exists] = await fileRef.exists();

        if (!exists) {
            console.warn(`[GCS] 物件不存在: ${fileName}`);
            return;
        }

        await fileRef.download({ destination: `./${fileName}` });
    }

   async  parseItem(address: string):Promise<any> {
    const filePath = path.join(address);

    if (!fs.existsSync(filePath)) {
        console.warn('[Group] groups.txt 不存在，略過讀取');

        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8').trim();
        if (raw === '') return;

        const parsed = JSON.parse(raw);

        if (!parsed || !Array.isArray(parsed.groups)) {
            console.log('[GROUPS] JSON 格式不符，預期 { "group": [...] }，回傳空資料');
            return;
        }

        return parsed;
    } catch (e) {
        console.log('[GROUPS] JSON 解析失敗，回傳空陣列', e);
        return;
    }
}

    // 先從 GCS 拉最新檔案再讀，避免讀到本機過期的快照
    async syncItem(fileName: string): Promise<any> {
        try {
            await this.downloadFile(fileName);
        } catch (e) {
            console.error(`[GCS] 下載失敗，改用本機既有檔案: ${fileName}`, e);
        }

        return this.parseItem(fileName);
    }

    // 寫本機 + 上傳 GCS，失敗會拋出讓呼叫端知道
    async saveItem(fileName: string, item: unknown): Promise<void> {
        fs.writeFileSync(path.join(fileName), JSON.stringify(item, null, 2));

        try {
            await this.uploadFile(fileName);
            console.log(`[GCS] 已上傳: ${fileName}`);
        } catch (e) {
            console.error(`[GCS] 上傳失敗: ${fileName}`, e);
            throw e;
        }
    }
}
