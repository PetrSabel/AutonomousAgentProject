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


// Initial listeners (executed only at beginning)
socket.on("connect", () => {
    console.log( "socket connect", socket.id );
});

socket.on("disconnect", () => {
    console.log( "socket disconnect", socket.id );
});


// Obtain current information
socket.on("you", ({id, name, x, y, score}) => {
    console.log("you", {id, name, x, y, score})
});

socket.on("agents sensing", (data) => {
    console.log("agents sensing", data)
});

socket.on("parcels sensing", (data) => {
    console.log("parcels sensing", data)
});

// TODO: agent is notified when new parcel appears or need to monitor
//  In second case, implement EventEmitter for that (obtain info, elaborate it and update agent)

socket.on("xy", (data) => {
    console.log("xy", data)
});

socket.on("map", (data) => {
    console.log("map", data)
});

socket.on("tile", (data) => {
    console.log("tile", data)
});

socket.on("*", function(event,data) {
    console.log("Event:" + event);
    console.log("DATA:" + data);
});

// Agent actions
async function randomlyMove () {

    var direction_index = Math.floor(Math.random()*4)

    function getDirection () {
        if (direction_index > 3)
            direction_index = direction_index % 4;
        return [ 'up', 'right', 'down', 'left' ][ direction_index ];
    }

    while ( true ) {
        
        let direction = [ 'up', 'right', 'down', 'left' ][ (direction_index) % 4 ]

        await new Promise<void>( (success, reject) => socket.emit('move', getDirection(), async (status) =>  {
            if (status) {
        
                direction_index += [0,1,3][ Math.floor(Math.random()*3) ]; // may change direction but not going back

                console.log( 'moved', direction, 'next move', direction_index )

                await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec
                
                socket.emit( 'putdown' );

                await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec
                socket.emit( 'pickup' );

                success();

            } else {
                
                reject();

            }
        } ) ).catch( async () => {

            direction_index += Math.floor(Math.random()*4); // change direction if failed going straight

            console.log( 'failed move', direction, 'next move', getDirection() )

        } );

        await new Promise( res => setTimeout(res, 100) ); // wait 0.1 sec; if stucked do not block the program in infinite loop


    }
}

randomlyMove()
