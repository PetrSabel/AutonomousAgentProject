import { Action, Desire, Plan, Point } from "../types";
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
    ignoring: boolean
    planning: boolean // TODO: idea is to compute one step for the most 
                                // convenient Intention (usign priority queue)
                                // and if it achieves the goal execute it

    currentPlan?: Plan
    planB?: Plan 
    cost?: number
    x?: number 
    y?: number

    constructor(desire: Desire, ignoring: boolean = false) {
        this.desire = desire
        // TODO: suddivide intention in subintentions
        this.executing = false;
        
        // this.secondPlan = undefined 
        this.planning = false 
        this.ignoring = ignoring
    }

    async compute_plan(agent: Agent, 
                        planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>) {
        
        try {
            [this.currentPlan, this.cost, [this.x, this.y]] = await plan_intention(agent, this.desire, planner, !agent.blocked);
        } catch(e) {
            console.error("Error during intention planning", e);
            this.currentPlan = undefined;
            this.cost = 0;
            this.x = undefined;
            this.y = undefined;
        }
    }

    async compute_planB(agent: Agent,
        planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>) {
        let _cost: number;
        [this.planB, _cost, [this.x, this.y]] = await plan_intention(agent, this.desire, planner);
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
            await agent.execute_action(action);

            // Remove executed action
            this.currentPlan.shift();
        } catch(e) {
            agent.log("ACTION BLOCKED", action, e);
            // TODO: Try to solve the problem
            // if (this.planB) {
                // Replan failed
            agent.blocked = true;
            // } else {
            //     // Try to replan
            //     await this.compute_planB(agent);
            //     console.log("PLANB", this.planB, "for", this.desire)
            //     if (this.planB) {
            //         this.currentPlan = this.planB.slice();
            //     }
            // }
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
