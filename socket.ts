import { default as config } from "./config";
import { io } from "socket.io-client";

// IDea: use Reinforcement Learning

var socket = io( config.host, {
    extraHeaders: {
        'x-token': config.token
    },
    // query: {
    //     name: "scripted",
    // }
});

type TileInfo = {
    x: number,
    y: number,
    delivery: boolean,
    parcelSpawner: boolean,
};

type PassableTile = {
    parcel: Parcel | null,
    spawnable: boolean,
    agent: string | null,
    delivery: boolean,
};

type EmptyTile = null;

type Tile = PassableTile | EmptyTile;

type ParcelInfo = {
    id: string,
    x: number,
    y: number,
    carriedBy: any,
    reward: number,
};

// Parcel placed on map
type Parcel = {
    id: string,
    reward: number,
};

type AgentDesciption = {
    id: string,
    name: string,
    x: number, 
    y: number, 
    score: number,
};

class Agent {
    map: Tile[][];  // matrix[x,y] of Tiles
    map_size: [number, number];

    // Current information
    x: number;
    y: number;
    score: number;
    parcels: ParcelInfo[];

    id: string | null;
    name: string; // TODO: add in config possibility to choose between different agents
    socket: any;

    constructor(name: string, x: number, y: number) {
        // Set empty map
        this.map = new Array;
        this.map_size = [0,0];
        this.x = x;
        this.y = y;
        this.id = null;
        this.name = name;
        this.score = 0;
        this.socket = null; // TODO: connect to actual socket and declare event listeners
        this.parcels = [];
    }
}

// Idea: declare agent only after receiving initial information
let agent = new Agent('Fil', 0, 0);


// TODO: move these declarations inside the agent
// Initial listeners (executed only at beginning)
socket.on("connect", () => {
    console.log( "socket connect", socket.id );
});

socket.on("disconnect", () => {
    console.log( "socket disconnect", socket.id );
});

// Obtain all tiles
socket.on("map", (x, y, data: TileInfo[]) => {
    console.log("map", data)
    // agent.map = data; // TODO: remap values
    agent.map = new Array();
    for (let i = 0; i < x; i++) {
        agent.map.push(new Array(y));
        // for (let j = 0; j < y; j++) {
        //     agent.map[i].push(undefined)
        // }
    }
    
    for (let tile of data) {
        agent.map[tile.x][tile.y] = {
            parcel: null,
            spawnable: tile.parcelSpawner,
            agent: null,
            delivery: tile.delivery
        };
    }
    agent.map_size = [x,y];

});

// Obtain singular tile
socket.on("tile", (x: number, y: number, delivery: boolean, parcelSpawner: boolean) => {
    let data: TileInfo = {x, y, delivery, parcelSpawner}
    console.log("tile", data)
});

// Obtain description of unaccessible tiles
socket.on("not_tile", (x: number, y: number) => {
    console.log("not tile", x, y)
});


// Update events
// Agent is notified when see some agent
socket.on("agents sensing", (agents: AgentDesciption[]) => {
    console.log("agents sensing", agents)
});

// Agent is notified when new parcel appears or reward changes
socket.on("parcels sensing", (parcels: ParcelInfo[]) => {
    console.log("parcels sensing", parcels)
    agent.parcels = parcels;
    for (let parcel of parcels) {
        if (parcel.carriedBy === null) {
            let tile = agent.map[parcel.x][parcel.y];
            if (tile) {
                tile.parcel = {
                    id: parcel.id,
                    reward: parcel.reward,
                }
            }
        }
    }
});

// Obtain my current information
socket.on("you", (me: AgentDesciption) => {
    console.log("you", me)
    // Update position
    // TODO: better check if predicted position is same to control plan execution
    agent.x = me.x;
    agent.y = me.y;
});


// TODO: declare function for each of agents actions

type Direction = "left" | "right" | "up" | "down";
const DIRECTIONS = ["left", "right", "up", "down"];

function number_to_direction(index: number): Direction {
    const directions: Direction[] = [ 'up', 'right', 'down', 'left'];
    return directions[ index % directions.length ];
}


// Agent actions


// TODO: determine how X and Y are placed?
// Try to plan something
// TODO: attach planning to parcel sense, add variable to indicate whether process is still going
async function toNearestParcel(agent: Agent): Promise<Direction[]> {
    let map = agent.map;
    let result = new Array<Direction>;

    if (map && agent.parcels.length > 0) {
        // Find the nearest parcel
        let nearestParcel = agent.parcels[0];
        let minDist = Math.abs(agent.x - nearestParcel.x) + Math.abs(agent.y - nearestParcel.y)
        for (let parcel of agent.parcels) {
            let temp = Math.abs(agent.x - parcel.x) + Math.abs(agent.y - parcel.y);
            if (temp < minDist) {
                nearestParcel = parcel;
                minDist = temp;
            }
        }

        console.log("Nearest: ", nearestParcel)

        // Try to reach it
        let q: Array<readonly [x:number, y:number, moves:Direction[]]> = [[agent.x, agent.y, []]];
        let visited: Array<[x:number, y:number]> = [];
        while (q.length > 0) {
            let curr = q.shift()!;
            let [x, y, moves] = curr;
            
            if (visited.some((el) => el[0] === x && el[1] === y)) {
                continue;
            } else {
                visited.push([x,y]);
            }
            
            let tile = map[x][y];
            if (tile?.parcel) {
                result = moves;
                break;
            } else if (tile === null) {
                continue;
            } else {
                if (x > 0) {
                    q.push([x-1, y, [...moves, 'left']]);
                }
                if (x < agent.map_size[0] - 1) {
                    q.push([x+1, y, [...moves, 'right']]);
                }

                if (y > 0) {
                    q.push([x, y-1, [...moves, 'down']]);
                }
                if (y < agent.map_size[1] - 1) {
                    q.push([x, y+1, [...moves, 'up']]);
                }
            }
        }
    }

    return result;
}

async function randomlyMove () {

    var direction_index = Math.floor(Math.random()*4)

    while ( true ) {
        
        let direction = number_to_direction(direction_index)

        // Wait for finishing the move
        await new Promise<void>( (success, reject) => socket.emit('move', number_to_direction(direction_index), async (status: boolean) =>  {
            if (status) {
                success();
            } else {
                reject();
            }
        } ) )
        // Add success callback
        .then( async () => { 
            direction_index += [0,1,3][ Math.floor(Math.random()*3) ]; // may change direction but not going back

            console.log( 'moved', direction, 'next move', direction_index )

            await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec
            
            socket.emit( 'putdown' );

            await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec
            socket.emit( 'pickup' );
        }) 
        // Add reject callback
        .catch( async () => { 

            direction_index += Math.floor(Math.random()*4); // change direction if failed going straight

            console.log( 'failed move', direction, 'next move', number_to_direction(direction_index) )

        } );


        // Planning 
        await toNearestParcel(agent).then(async (plan) => {
            console.log("---------------------------------")
            console.log("Plan: ", plan)
            // Try to execute it
            for (let move of plan) {
                console.log("Move ", move)
                // Create a Promise that is resolved/rejected once the callback is called by the server
                await new Promise<void>((success, reject) => {
                    socket.emit("move", move, async (status: boolean) => {
                        status? success(): reject()
                    })
                }).then(() => {
                    console.log("Suc")
                    socket.emit("pickup");
                })
                .catch((reason) => console.log("Err", reason))
            }
            console.log("-------------------------------")
        });
        
        

        await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec 

        // TODO: if stucked do not block the program in infinite loop

    }
}

randomlyMove()

// Note: name "god" is quite powerful
