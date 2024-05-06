import { Desire, Plan } from "./types";
import { Agent } from "./agent"
import { plan } from "./auxiliary";

// TODO: add time/tries spent for doing a task (to avoid forward-backward giggling)

export class Intention {
    // The associated desire
    desire: Desire 
    currentPlan: Plan
    // Optional plan in case of failure
    // secondPlan?: Plan  
    // Estimated profit of executing this intention
    cost: number
    executing: boolean
    planning: boolean // TODO: idea is to compute one step for the most 
                                // convenient Intention (usign priority queue)
                                // and if it achieves the goal execute it

    x: number 
    y: number

    constructor(agent: Agent, desire: Desire) {
        this.desire = desire
        // TODO: suddivide intention in subintentions
        this.executing = false;
        [this.currentPlan, this.cost, [this.x, this.y]] = plan(agent, desire)
        // this.secondPlan = undefined 
        this.planning = false 
    }

    async step(agent: Agent) {
        if (!this.executing) {
            this.executing = true
        }

        let action = this.currentPlan.shift()
        if (action) {
            // console.log("ACTION = ", action)
            try {
                switch (action) {
                    case "pickup":
                        await agent.pickup()
                        break;
                    case "putdown":
                        await agent.putdown()
                        break;
                    
                    case "wait":
                        // TODO: decide what to do
                        // this.replan(agent)
                        // agent.blocked = true 
                        break;
                
                    default:
                        await agent.move(action)
                        break;
                }
            } catch(e) {
                // console.log("ACTION BLOCKED", e)
                agent.blocked = true;
                return;
            }
        } else {
            // Empty intention
            this.executing = false
            await new Promise(res => setTimeout(res, 5));
            return;
        }
    }

    stop() {
        if (this.executing) {
            this.executing = false
        }
    }

    // async replan(agent: Agent) {
    //     [this.secondPlan, this.cost] = plan(agent, this.desire)
    // }

    // planB() {
    //     if (this.secondPlan) {
    //         this.currentPlan = this.secondPlan
    //     }
    // }

    estimateProfit(): number {
        return this.cost;
    }
}

// Desire possibilities: 'pick_up', 'explore', 'deliver'
//      pick_up => Intention: go + Intention: pickup
//      expore => Intention: random_go (but where? randomly?)
//      deliver => Intention: go + Intention: putdown
// new, remove

// Intention: go, pickup, putdown
//      random_go
//      go => plan + execute
//      pickup => emit pickup
//      putdown => emit putdown
// Each intention has a cost, we choose the best one.
// We can also merge intentions, to achive better combined intention (score <= score1 + score2)
// Start, stop, merge, finish, replan
