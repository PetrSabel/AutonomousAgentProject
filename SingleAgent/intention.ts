import { Desire, Plan } from "../types";
import { Agent } from "./agent"
import { plan_intention } from "./auxiliary.js";

// TODO: add time/tries spent for doing a task (to avoid forward-backward giggling)

export class Intention {
    // The associated desire
    desire: Desire 
    // Optional plan in case of failure
    // secondPlan?: Plan  
    // Estimated profit of executing this intention
    executing: boolean
    planning: boolean // TODO: idea is to compute one step for the most 
                                // convenient Intention (usign priority queue)
                                // and if it achieves the goal execute it

    currentPlan?: Plan
    planB?: Plan 
    cost?: number
    x?: number 
    y?: number

    constructor(desire: Desire) {
        this.desire = desire
        // TODO: suddivide intention in subintentions
        this.executing = false;
        
        // this.secondPlan = undefined 
        this.planning = false 
    }

    async compute_plan(agent: Agent) {
        [this.currentPlan, this.cost, [this.x, this.y]] = await plan_intention(agent, this.desire);
    }

    async compute_planB(agent: Agent) {
        let _cost: number;
        [this.planB, _cost, [this.x, this.y]] = await plan_intention(agent, this.desire);
    }

    async step(agent: Agent) {
        if (!this.executing) {
            this.executing = true
        }

        if (this.currentPlan == undefined || this.currentPlan.length < 1) {
            this.stop()
            return;
        }

        let action = this.currentPlan[0];
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
            
                case "left":
                case "right":
                case "up":
                case "down":
                    await agent.move(action)
                    break;

                default:
                    console.error(action);
                    throw new Error("UNRECOGNIZED COMMAND")
            }

            // Remove executed action
            this.currentPlan.shift();
        } catch(e) {
            // console.log("ACTION BLOCKED", e)
            // TODO: Try to solve the problem
            // if (this.planB) {

            // } else {
            //     this.compute_planB(agent);
            // }
            agent.blocked = true;
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
