import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Agent } from "../SingleAgent/agent.js";
import { Intention } from "../SingleAgent/intention.js";
import { Action, Messages, Plan, Point, Tile } from "../types";
import { set_communication_listeners, set_multiagent_listeners } from "./socket.js";

export const GREETING: string = "sdhjg2121jsdngjkdsn99837289njsdnjbkdsjnk";

export class MultiAgent extends Agent {

    friends: string[]
    friend_plan: Plan | undefined 
    chosen_one: string | undefined 
    exchanging: boolean
    continue: boolean 

    constructor(name: string, id: string, map: Tile[][], map_size: [number, number], map_config: any, 
            x: number, y: number, socket: any, 
            planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>) {
            
        super(name, id, map, map_size, map_config, x, y, socket, planner)
        
        this.friends = []
        this.friend_plan = undefined 
        this.chosen_one = undefined 
        this.exchanging = false 
        this.continue = true

        set_communication_listeners(this.socket, this);
    }

    // Override listeners to multiagent version
    setListeners() {
        set_multiagent_listeners(this.socket, this);
    }


    setup_communication() {
        this.log("MULTI")
        this.socket.emit('shout', {
            type: "greeting",
            content: GREETING
        })
    }

    // Return ordered list of options
    filterOptions(options: Intention[]) {

        // TODO: filter options based on some criteria
        options = options.filter(option => option.currentPlan != undefined)
        options = options.filter(option => option.cost >= 0.0)

        // Penalize options close to another ally
        function cost(agent: MultiAgent, intention: Intention) {
            let ally_dist: number = 100_000;
            let my_dist: number = 0;
            for (let f of agent.friends) {
                let friend = agent.agents.get(f);
                if (friend != undefined && intention.x != undefined && intention.y != undefined) {
                    ally_dist = Math.abs(friend.x - intention.x) + Math.abs(friend.y - intention.y);
                    my_dist = Math.abs(agent.x - intention.x) + Math.abs(agent.y - intention.y);
                }
            }
            if (intention.cost == undefined) {
                return Math.random();
            } else if (my_dist > ally_dist) {
                return intention.cost / 3;
            } else {
                return intention.cost ;
            }
        }

        let queue = new PriorityQueue((a: Intention, b: Intention) => cost(this, a) > cost(this, b) ? -1 : 1)

        for (let option of options) {
            queue.push(option)
            if (option.desire.description == "deliver") {
                // console.log("DELIVER COST = ", option.cost)
            }
            // TODO: consider to combine deliver with some pickup (if aligned)
        }

        return queue;
    }

    async execute_action(action: Action) {
        // this.log("ACTION", action)
        switch (action) {
            case "pickup": {
                await this.pickup()
                break;
            }
            case "putdown": {
                await this.putdown()
                break;
            }
            
            case "wait": {
                // wait other agent to finish move
                await this.wait()
                break;
            }
        
            case "left":
            case "right":
            case "up":
            case "down": {
                await this.move(action)
                break;
            }

            case "synch": {
                await this.synch()
                break;
            }
            case "exchange": {
                await this.exchange();
                break;
            }

            default: {
                console.error(action);
                throw new Error("UNRECOGNIZED COMMAND")
            }
        }
    }

    async wait() {
        this.log("Waiting for", this.config.MOVEMENT_DURATION * 1.5 || 500);
        await new Promise(res => setTimeout(res, this.config.MOVEMENT_DURATION * 1.5 || 500));
    }

    async exchange() {
        await this.putdown();
        // throw new Error("Method not implemented.");
    }

    async say(friend: string, content: Messages) {
        await this.socket.emit("say", friend, content)
    }

    async ask(friend: string, content: Messages): Promise<any> {
        return new Promise( (success) => {
            this.socket.emit( 'ask', friend, content, async ( reply: any ) =>  {
                success( reply );
            } );
        } )
    }

    async synch() {
        if (this.chosen_one) {
            if (this.friend_plan) {
                this.log("SYNCHING with", this.chosen_one, " about ", this.friend_plan)
                this.log("------------------------------------------------------------------\n\n\n")
                // await new Promise(res => setTimeout(res, 2000));

                let friend_desc = this.agents.get(this.chosen_one)
                if (friend_desc) {
                    let reply = await this.ask(this.chosen_one, {
                        type: "plan",
                        content: {
                            plan: this.friend_plan,
                            x: Math.round(friend_desc.x),
                            y: Math.round(friend_desc.y)
                        }
                    });

                    if (reply == "yes") {
                        this.log("yes")
                        this.exchanging = true;
                    } else {
                        this.log("refused")
                        this.exchanging = false;
                        // throw new Error("Collaboration refused");
                    }
                }
            }
        }
    }
}