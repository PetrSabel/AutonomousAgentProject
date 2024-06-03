import { GREETING, MultiAgent } from "../MultiAgent/agent.js";
import { Intention } from "../SingleAgent/intention.js";
import { update_agents_beliefs, update_parcels_beliefs } from "../SingleAgent/socket.js";
import { AgentDesciption, Messages, ParcelInfo } from "../types.js";


export { set_communication_listeners, set_multiagent_listeners }

function set_communication_listeners(socket: any, agent: MultiAgent) {
    socket.on("msg", (id: string, name: string, msg: Messages, reply?: any) => {
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

        // New friend with same name 
        if (msg.type === "greeting" && msg.content === GREETING && name === agent.name) {
            if (!agent.friends.includes(id)) {
                agent.friends.push(id)
                
                agent.log("New friend ", name, id)
                agent.say(id, {
                    type: "greeting", 
                    content: GREETING
                });
            }
        }
        
        if (agent.friends.includes(id)) {
            switch (msg.type) {
                case "parcels": {
                    update_parcels_beliefs(agent, msg.content)
                    break;
                };

                case "agents": {
                    for (let a of msg.content) {
                        agent.update_agent(a);
                    }
                    break;
                };

                case "friend": {
                    agent.update_agent(msg.content);
                    break;
                };

                case "greeting": {
                    break;
                };

                case "plan": {
                    agent.log('OK');
                    if (reply) {
                        if (msg.content.x == agent.x && msg.content.y == agent.y) {
                            try {
                                // Change intention
                                let intention = new Intention({description: "deliver", tries_number: 0})
                                intention.currentPlan = msg.content.plan;
                                agent.exchanging = true
                                reply("yes");

                                // Start executing 
                                agent.executeIntention(intention)
                                    .then(() => {
                                        agent.exchanging = false
                                        agent.say(id, {
                                            type: "done"
                                        })
                                    })
                                    .catch(() => {
                                        agent.exchanging = false;
                                        agent.say(id, {
                                            type: "failure"
                                        })
                                    })

                            } catch (e) {
                                try{
                                    reply("no")
                                } catch {
                                    agent.log("REPLY fail")
                                }
                                agent.log("ERROR DURING SYNCH", e, reply)
                            }
                        } else {
                            reply("wrong coors")
                            agent.log("Failed synch because of coordinates")
                        }
                    }
                    break;
                };

                case "failure":
                case "done": {
                    agent.exchanging = false;
                    agent.current_intention = undefined;
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
        // Update position
        // TODO: better check if predicted position is same to control plan execution
    
        agent.x = me.x 
        agent.y = me.y 

        for (let friend of agent.friends) { 
            agent.say(friend, {
                type: "friend",
                content: me
            })
        }
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
