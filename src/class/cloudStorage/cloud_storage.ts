import { Storage } from '@google-cloud/storage';
import fs from 'fs';

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
}