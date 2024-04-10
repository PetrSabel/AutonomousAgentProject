type PassableTile = {
    // Specify id of the Parcel if present
    //      The actual Parcel object should be extracted from agent.parcels map (if exists)
    parcel: string | null,
    spawnable: boolean,
    agentID: string | null,
    delivery: boolean,
};

type EmptyTile = null;

type Tile = PassableTile | EmptyTile;

// TODO: implement classes and not only types

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
type Action = Direction | "pickup" | "putdown";

type Desire = {
    // Explore: agent will to find new parcels
    // Deliver: agent will to deliver carried parcels
    description: "explore" | "deliver",
} | {
    // Pickup: agent will to pickup a particular parcel, created when the agent see new parcel
    description: "pickup",
    parcel: ParcelInfo,
}

type Plan = Action[];

export { 
    Direction, TileInfo, PassableTile, EmptyTile, Tile,
    ParcelInfo, Parcel, AgentDesciption,
    Desire, Action, Plan
};
