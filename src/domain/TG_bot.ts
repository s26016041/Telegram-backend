export type TGGroup = {
    id: number;
};

export type TGItem = {
    groups: TGGroup[];
    Broadcasts: TGBroadcast[];
};

export type TGBroadcast = {
    name: string;
    quantity: number;
}