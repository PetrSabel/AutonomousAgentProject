import { io } from "socket.io-client"
import { ICompare, PriorityQueue } from "@datastructures-js/priority-queue"
import { Tile, TileInfo, ParcelInfo, AgentDesciption, Direction } from "./types"
import { Agent } from "./agent"
import { isDelivery, isParcel } from "./goals"
import { nearestTiles } from "./heuristics"
import { host, token } from "./main"
import { Intention } from "./intention"

// IDea: use Reinforcement Learning

var socket = io( host, {
    extraHeaders: {
        'x-token': token
    },
    // query: {
    //     name: "scripted",
    // }
});


// Initial listeners (executed only once)
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
            agentID: null,
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

var map_config: any;
socket.on('config', (data) => {
    map_config = data
    console.log("Configuration: ", data)
})

// Obtain description of unaccessible tiles
socket.on("not_tile", (x: number, y: number) => {
    console.log("not tile", x, y)
});


// Idea: declare agent only after receiving initial information
let agent = new Agent('Fil', 0, 0, socket, map_config);


// TODO: move these declarations inside the agent

// Update events
// Agent is notified when see some agent
// TODO: update map information
// TODO: try to predict moves
socket.on("agents sensing", (agents: AgentDesciption[]) => {
    // console.log("agents sensing", agents)
    for (let a of agents) {
        // If some other agent
        if (a.id !== agent.id) {
            // TODO: consider 2 cell when moving
            let x = Math.round(a.x)
            let y = Math.round(a.y)

            agent.map[x][y]!.agentID = a.id;
        }
    }
    // TODO: consider if they are moving
});

// Agent is notified when new parcel appears or reward changes
// TODO: update information, no override
socket.on("parcels sensing", (parcels: ParcelInfo[]) => {
    // Remove obsolete parcels from beliefs
    // TODO: consider only parcels that should be present in the agent view
    // Now it removes also parcels outside of the view

    for (let id of agent.parcels.keys()) {
        // TODO: add if the parcel is visible
        let parcel = parcels.find(p => p.id === id)
        if (parcel !== undefined) {
            if (parcel.carriedBy) {
                // TODO: Remove from agent.carry
                agent.parcels.delete(id)
            }
        }
    }

    for (const parcel of parcels) {
        // TODO: check if already present
        if (!agent.parcels.has(parcel.id)) {
            agent.desires.push({
                description: "pickup",
                parcel: parcel
            })
        }
    }

    // Update belief
    for (let parcel of parcels) {
        if (!parcel.carriedBy)
            agent.parcels.set(parcel.id, parcel)
    }

    for (let parcel of parcels) {
        if (!parcel.carriedBy) {
            let tile = agent.map[parcel.x][parcel.y];
            if (tile) {
                tile.parcel = parcel.id 

                setTimeout(() => {
                    tile!.parcel = null
                }, 1000 * parcel.reward) 
                // Assume that a parcel expires after "reward" seconds
            }
        } else { // If carried
            let x = Math.round(parcel.x)
            let y = Math.round(parcel.y)
            
            try {
                let _ = agent.map[x][y]
            } catch {
                console.log("PARCEL ERROR", parcel)
                console.log("CONT", agent.map, agent.map[x])
            }

            let tile = agent.map[x][y];
            if (tile) {
                tile.parcel = null;
            }

            if (parcel.carriedBy === agent.id) {
                // agent.carry = true;
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
    agent.id = me.id;
});


const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

function number_to_direction(index: number): Direction {
    return DIRECTIONS[ index % DIRECTIONS.length ];
}


// Agent actions

// Try to plan something
// TODO: attach planning to parcel sense, add variable to indicate whether process is still going

export type State = {
    x: number, 
    y: number,
    moves: Direction[],
};

export function Astar(map: Tile[][], agent_x: number, agent_y: number, h: ICompare<State>, goal: (tile: Tile) => boolean): Direction[] {
    let plan = new Array<Direction>;

    // TODO: check if there is some known parcel
    if (map) {

        // Try to reach it
        let q: PriorityQueue<State> = new PriorityQueue(h);
        q.enqueue({x: Math.round(agent_x), y: Math.round(agent_y), moves: []});
        let visited: Array<[x:number, y:number]> = [];

        while (!q.isEmpty()) {
            // console.log(q.toArray())
            let curr = q.pop();
            let {x, y, moves} = curr;

            if (visited.some((el) => el[0] === x && el[1] === y)) {
                continue;
            } else {
                visited.push([x,y]);
            }
            
            try{
                let _ = map[x][y];
            } catch {
                console.log("HERE", x, y, map)    
            }
            let tile = map[x][y];
            
            // console.log("TILE", tile, x, y)
            if (!tile) {
                continue
            } else if (goal(tile)) { // Stop when find the first accepted block
                console.log("Want to arrive to", x, y, tile, "from", agent_x, agent_y)
                plan = moves;
                break;
            } else {
                if (x > 0) {
                    q.enqueue({x: x-1, y, moves:[...moves, 'left']});
                }
                if (x < agent.map_size[0] - 1) {
                    q.enqueue({x: x+1, y, moves:[...moves, 'right']});
                }

                if (y > 0) {
                    q.enqueue({x, y:y-1, moves:[...moves, 'down']});
                }
                if (y < agent.map_size[1] - 1) {
                    q.enqueue({x, y:y+1, moves:[...moves, 'up']});
                }
            }
        }
    }

    return plan;
}

// Requires agent information  
export const airDistance: ICompare<State> = (a: State, b: State) => {
    let dist_a = Math.abs(agent.x - a.x) + Math.abs(agent.y - a.y)
    let dist_b = Math.abs(agent.x - b.x) + Math.abs(agent.y - b.y)
    
    return dist_a < dist_b ? -1 : 1;
};


// Main loop
async function main() {

    var direction_index = Math.floor(Math.random()*4)
    let plan: Direction[] = [];

    while ( true ) {
        if (plan.length > 0) {
            console.log("Planned move")
            let direction: Direction = plan[0]

            // Try the move
            await agent.move(direction)
            // Add success callback
            .then( async () => { 
                console.log("Plan step done")
                plan.shift()!

                if (agent.carry && plan.length < 1) {
                        // TODO: check this socket
                    await agent.putdown();
                    agent.carry = [];
                }

                agent.pickup();

            }) 
            // Add reject callback
            .catch( async () => { 
                console.log("Plan step", direction, "blocked")
            } );
        } else {
            // Random move
            console.log("Random move")
            let direction = number_to_direction(direction_index)

            // Try the move
            await agent.move(direction)
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

        }
        

        // Planning 
        // Create a new plan
        if (plan.length < 1) {
            console.log("\nPlanning")
            let goal = (agent.carry.length > 0)? isDelivery : isParcel;
            let new_plan = Astar(agent.map, agent.x, agent.y, nearestTiles, goal)

            plan = new_plan;
            console.log("---------------------------------")
            console.log("Current goal is", agent.carry? "delivery" : "parcel")
            console.log("Plan: ", plan)
            console.log("-------------------------------")
        
        }

        // TODO: if stucked do not block the program in infinite loop
        await new Promise(res => setTimeout(res, 2000));

    }
}

// main()

async function loop() {

    while (true) {
        try {
            let queue = new PriorityQueue((a: Intention, b: Intention) => a.cost > b.cost ? -1 : 1)
            let options = await agent.getOptions()

            //console.log("\nOptions are {}", options)
            options = agent.filterOptions(options)
            //console.log("\n\nFiltere are {}", options)

            await new Promise(res => setTimeout(res, 1000));

            for (let option of options) {
                queue.push(option)
                if (option.desire.description == "deliver") 
                    console.log("DELIVER COST = ", option.cost)
            }
            let first = queue.pop()
            let plan = first.start()

            console.log("\n\nEXECUTING", first, "\n\n\n")
            if (plan)
                await agent.executePlan(plan)
                .catch((err) => {
                    console.log("Plan ", plan, " blocked because ", err)
                })

            await new Promise(res => setTimeout(res, 1000));
        } catch(e) {
            console.error("Some error", e)
            await new Promise(res => setTimeout(res, 2000));
        }
    }
}

loop()

// Note: name "god" is quite powerful
