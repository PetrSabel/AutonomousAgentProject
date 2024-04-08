import { default as config } from "./config"

const LOCAL_SERVER: boolean = true;

export const host = LOCAL_SERVER? config.local.host : config.remote.host;
export const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("Agent launched!")
console.log("The server at ", host)

// TODO: decide if use directly client or sockets
