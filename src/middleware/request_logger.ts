import { NextFunction, Request, Response } from 'express';

let seq = 0;

export function nextRequestId(): string {
    seq += 1;

    return `req-${seq}`;
}

export function RequestLogger(req: Request, res: Response, next: NextFunction): void {
    const requestId = nextRequestId();
    const start = process.hrtime.bigint();

    (req as any).requestId = requestId;

    console.log(`[API] --> ${requestId} ${req.method} ${req.originalUrl}`, JSON.stringify({
        ip: req.ip,
        query: req.query,
        headers: {
            'content-type': req.get('content-type'),
            'content-length': req.get('content-length'),
            'user-agent': req.get('user-agent'),
        },
        body: req.body,
    }, null, 2));

    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

        console.log(`[API] <-- ${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} (${ms.toFixed(1)}ms)`);
    });

    next();
}

export function ErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
    const requestId = (req as any).requestId ?? '-';

    console.error(`[API][ERROR] ${requestId} ${req.method} ${req.originalUrl}`, err);

    if (res.headersSent) {
        return;
    }

    res.status(400).json({ ok: false, error: err?.message ?? 'bad request' });
}
