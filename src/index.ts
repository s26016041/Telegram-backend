import dotenv from 'dotenv';
import { lineBot } from './control/lineBot/lineBot.';

function index(): void {
    if (process.env.LOCAL_RUN == 'true') {
        dotenv.config();
    }

    lineBot();
}

index();