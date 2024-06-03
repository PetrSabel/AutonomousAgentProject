import { GREETING, MultiAgent } from "../MultiAgent/agent.js";
import { update_agents_beliefs, update_parcels_beliefs } from "../SingleAgent/socket.js";
import { AgentDesciption, Messages, ParcelInfo } from "../types.js";


export { set_communication_listeners, set_multiagent_listeners }

function set_communication_listeners(socket: any, agent: MultiAgent) {
    socket.on("msg", (id: string, name: string, msg?: Messages, reply?: any) => {
        // Ignore self messages
        if (id === agent.id) {
            return;
        }
        // agent.log("new msg received from", name+'(' + id + '):', msg);
        // Ignore wrong messages
        if (msg == undefined || msg.type == undefined) {
            // TODO: copy messages and send them around
            return;
        }
        
        if (agent.friends.includes(id)) {
            
        } else {
            switch (msg.type) {
                case "parcels": {
                    update_parcels_beliefs(agent, msg.content)
                    break;
                }

                case "agents": {
                    update_agents_beliefs(agent, msg.content);
                    break;
                }

                case "greeting": {
                    // Same name
                    if (msg.content === GREETING && name === agent.name) {
                        agent.friends.push(id)
                        agent.log("New friend ", name, id)
                    }
                    break;
                }

                case "plan": {
                    console.log('OK')
                    reply("yes");  
                    break;
                }

                // Ignore unknown types of messages
                default: {
                    return;
                }
            }
        }
    })
}

function set_multiagent_listeners(socket: any, agent: MultiAgent) {
    // Set new event handlers 
    // Obtain my current information
    socket.on("you", (me: AgentDesciption) => {
        // console.log("you", me)
        // Update position
        // TODO: better check if predicted position is same to control plan execution
    
        agent.x = me.x 
        agent.y = me.y 
    });

    // Update events
    // Agent is notified when see some agent
    // TODO: update map information
    // TODO: try to predict moves
    socket.on("agents sensing", (agents: AgentDesciption[]) => {
        update_agents_beliefs(agent, agents)
        // agent.log("Sharing agents")
        // Communicate to friends
        for (let friend of agent.friends) { 
            agent.say(friend, {
                type: "agents",
                content: agents
            })
        }
    });

    // Agent is notified when new parcel appears or reward changes
    // TODO: update information, no override
    socket.on("parcels sensing", (parcels: ParcelInfo[]) => {
        update_parcels_beliefs(agent, parcels)
        // agent.log("Sharing parcels")
        // Communicate to friends
        for (let friend of agent.friends) { 
            agent.say(friend, {
                type: "parcels",
                content: parcels
            })
        }
    });

}
