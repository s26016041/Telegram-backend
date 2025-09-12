export type TGGroup = {
    id: number;
    Broadcasts: TGBroadcast[];
};

export type TGItem = {
    groups: TGGroup[];
   
};

export type TGBroadcast = {
    name: string;
    quantity: number;
}