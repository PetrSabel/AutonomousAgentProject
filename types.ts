type PassableTile = {
    // Specifies id of the Parcel if present
    // The actual Parcel object should be extracted from agent.parcels map (if exists)
    parcel: string | null,
    spawnable: boolean,
    agentID: string | null,
    delivery: boolean,
    x: number,
    y: number,
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
type Action = Direction | "pickup" | "putdown" | "wait" | "synch" | "exchange";

type Desire = {
    // Explore: agent will to find new parcels
    // Deliver: agent will to deliver carried parcels
    description: "explore" | "deliver" | "exchange"
} | {
    // Pickup: agent will to pickup a particular parcel, created when the agent see new parcel
    description: "pickup",
    parcel: ParcelInfo
}

type Plan = Action[];

// Messages that agents can send
type Messages = {
    type: "parcels",
    content: ParcelInfo[]
} | {
    type: "agents",
    content: AgentDesciption[]
} | {
    // For handshake
    type: "greeting",
    content: string 
} | {
    type: "plan",
    content: { 
        plan: Plan,
        x: number,
        y:number
    }
} | {
    // Communicates my position
    type: "friend",
    content: AgentDesciption
} | {
    type: "failure"
} | {
    type: "done"
} | {
    // Tells the other that you've finished an action
    type: "unwait"
} | {
    // Tells the other that you are waiting until it finishes
    type: "wait"
}

type Point = { x: number, y: number };


export { 
    Direction, TileInfo, PassableTile, EmptyTile, Tile,
    ParcelInfo, Parcel, AgentDesciption,
    Desire, Action, Plan, Messages, Point
};
