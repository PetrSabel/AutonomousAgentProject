type PassableTile = {
    parcel: Parcel | null,
    spawnable: boolean,
    agentID: string | null,
    delivery: boolean,
};

type EmptyTile = null;

type Tile = PassableTile | EmptyTile;


// Information from sockets
type ParcelInfo = {
    id: string,
    x: number,
    y: number,
    carriedBy: any,
    reward: number,
};

type TileInfo = {
    x: number,
    y: number,
    delivery: boolean,
    parcelSpawner: boolean,
};
// TODO: move to see spawners

type AgentDesciption = {
    id: string,
    name: string,
    x: number, 
    y: number, 
    score: number,
};


// Parcel placed on map
type Parcel = {
    id: string,
    reward: number,
};

type Direction = "left" | "right" | "up" | "down";

export { Direction, TileInfo, PassableTile, EmptyTile, Tile, ParcelInfo, Parcel, AgentDesciption };
