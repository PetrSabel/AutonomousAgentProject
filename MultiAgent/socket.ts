import { GREETING, MultiAgent } from "../MultiAgent/agent.js";
import { Intention } from "../SingleAgent/intention.js";
import { update_agents_beliefs, update_parcels_beliefs } from "../SingleAgent/socket.js";
import { AgentDesciption, Messages, ParcelInfo, Plan } from "../types.js";


export { set_communication_listeners, set_multiagent_listeners }

function execute_passed_plan(agent: MultiAgent, plan: Plan, id: string, reply: any): Promise<void> {
    // Change intention
    let intention = agent.createIntention({description: "deliver"})
    intention.currentPlan = plan;
    agent.exchanging = true

    // Start executing 
    return agent.executeIntention(intention);
}

function set_communication_listeners(socket: any, agent: MultiAgent) {
    socket.on("msg", async (id: string, name: string, msg: Messages, reply?: any) => {
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
        if (msg.type === "greeting" && msg.content === GREETING) {// && name.slice(0, -2) === agent.name.slice(0, -2)
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
                    agent.log('Received plan', msg.content, 'from ', id);
                    agent.log('Im at', agent.get_coor());
                    if (reply) {
                        try {
                            if (msg.content.x == agent.x && msg.content.y == agent.y) {
                                agent.reset()
                                agent.chosen_one = id;
                                
                                // If you should wait => reply then execute
                                if (msg.content.plan != undefined && msg.content.plan[0] != "wait") {
                                    reply("yes")
                                    await agent.timer(50);
                                }
                                
                                execute_passed_plan(agent, msg.content.plan, id, reply).then(() => {
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
                                reply("yes");
                                

                            } else {
                                agent.log("Failed synch because of coordinates")
                                reply("refused");

                                // Wait a bit 
                                agent.log("ASKED TO STOP");
                                agent.stop()
                                await agent.timer(5000);
                                if (agent.stopped) {
                                    agent.reset();
                                }
                                return; 

                            } 
                        } catch (e) {
                            try{
                                reply("no")
                            } catch {
                                agent.log("REPLY fail")
                            }
                            agent.log("ERROR DURING SYNCH", e, reply)
                        }
                    }
                    break;
                };

                case "failure":
                case "done": {
                    agent.exchanging = false;
                    agent.current_intention = undefined;
                    agent.waiting = false;
                    agent.chosen_one = undefined;
                    agent.chosen_coors = undefined
                    break;
                };

                case "unwait": {
                    agent.waiting = false;
                    break;
                };

                case "wait": {
                    agent.exchanging = true;
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
    socket.on("agents sensing", (agents: AgentDesciption[]) => {
        update_agents_beliefs(agent, agents)
        // Communicate to friends
        for (let friend of agent.friends) { 
            agent.say(friend, {
                type: "agents",
                content: agents
            })
        }
    });

    // Agent is notified when new parcel appears or reward changes
    socket.on("parcels sensing", (parcels: ParcelInfo[]) => {
        update_parcels_beliefs(agent, parcels)
        // Communicate to friends
        for (let friend of agent.friends) { 
            agent.say(friend, {
                type: "parcels",
                content: parcels
            })
        }
    });

}
