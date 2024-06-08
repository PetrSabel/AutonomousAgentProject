import { Action, Desire, Plan, Point } from "../types";
import { Agent } from "./agent.js"
import { plan_intention } from "./auxiliary.js";


export class Intention {
    // The associated desire
    desire: Desire
    executing: boolean
    ignoring: boolean

    currentPlan?: Plan
    cost?: number
    // Final position after executing
    x?: number 
    y?: number

    constructor(desire: Desire, ignoring: boolean = false) {
        this.desire = desire
        this.executing = false
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

    // Does one action from plan 
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

            // Removes executed action
            this.currentPlan.shift();
        } catch(e) {
            agent.log("ACTION BLOCKED", action, e);
            agent.blocked = true;
            return;
        }
    }

    stop() {
        if (this.executing) {
            this.executing = false
        }
    }

    estimateProfit(agent: Agent): number {
        if (this.cost != undefined) {
            return this.cost;
        } else {
            switch (this.desire.description) {
                case "explore": {
                    return 1;
                };
                case "deliver": {
                    return 10_000;
                };
                case "exchange": {
                    return -1;
                };
                case "pickup": {
                    return this.desire.parcel.reward - ( Math.abs(agent.x - this.desire.parcel.x) + Math.abs(agent.y - this.desire.parcel.y) );
                }
            }
        }
    }
}
