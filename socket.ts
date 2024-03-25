import { default as config } from "./config";
import { io } from "socket.io-client";

var socket = io( config.host, {
    extraHeaders: {
        'x-token': config.token
    },
    // query: {
    //     name: "scripted",
    // }
});

type Tile = {
    x: number,
    y: number,
    delivery: boolean,
    parcelSpawner: boolean,
};

type Parcel = {
    id: string,
    x: number,
    y: number,
    carriedBy: any,
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
    map: Tile[] | null;
    x: number | null;
    y: number | null;
    score: number;
    id: string | null;
    name: string; // TODO: add in config possibility to choose between different agents

    constructor(name: string) {
        // Set empty map
        this.map = null;
        this.x = null;
        this.y = null;
        this.id = null;
        this.name = name;
        this.score = 0;
    }
}

let agent = new Agent('Fil');

// Initial listeners (executed only at beginning)
socket.on("connect", () => {
    console.log( "socket connect", socket.id );
});

socket.on("disconnect", () => {
    console.log( "socket disconnect", socket.id );
});

// Obtain all tiles
socket.on("map", (_x, _y, data: Tile[]) => {
    console.log("map", data)
    agent.map = data;
});

// Obtain singular tile
socket.on("tile", (x: number, y: number, delivery: boolean, parcelSpawner: boolean) => {
    let data: Tile = {x, y, delivery, parcelSpawner}
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
socket.on("parcels sensing", (parcels: Parcel[]) => {
    console.log("parcels sensing", parcels)
});

// Obtain my current information
socket.on("you", (me: AgentDesciption) => {
    console.log("you", me)
});


// TODO: declare function for each of agents actions

type Direction = "left" | "right" | "up" | "down";

function number_to_direction(index: number): Direction {
    const directions: Direction[] = [ 'up', 'right', 'down', 'left'];
    return directions[ index % directions.length ];
}


// Agent actions
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

        await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec 

        // TODO: if stucked do not block the program in infinite loop

    }
}

randomlyMove()

// Note: name "god" is quite powerful
