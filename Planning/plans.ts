import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import { readFileSync } from "fs";
import { Agent } from "../SingleAgent/agent.js";
import { Action, Point } from "../types.js";
import { DOMAIN_PATH } from "../config.js";

export async function plan(agent: Agent, goal: string, for_cache: boolean = false, position?: Point): Promise<Action[] | undefined> {
    
    /** BeliefSet */
    const myBeliefset = agent.get_beliefset(goal, for_cache, position);

    let init_situation = myBeliefset.toPddlString();
    let objects = myBeliefset.objects;

    // Problem 
    let problem = new PddlProblem("first", objects.join("\n  "), init_situation, goal)
    // problem.saveToFile() // DEBUG

    let problem_string = problem.toPddlString()

    /** Domain */
    const DOMAIN_STRING: string = readFileSync( DOMAIN_PATH, 'utf8');
    
    /** Solve */
    let plan: any = undefined;
    // console.time("solve " + t +  goal)
    try {
        plan = await onlineSolver(DOMAIN_STRING, problem_string);
    } catch(e) {
        console.error("Solver ERROR", e)
    }
    // console.timeEnd("solve " + t + goal)

    /** Execute */
    let moves = [];
    
    if (plan) {
        // Rewrite plan to the list of moves
        for (let a of plan) {
            if (a.action === "DELIVER"){
                moves.push("putdown");
            } else if (a.action === "REACH-GOAL") {
                // ignore
            } else {
                moves.push(a.action.toLowerCase())
            }
        }

    } else {
        agent.log("IMPOSSIBLE INTENTION", goal);
        // problem.saveToFile();
        return undefined;
    }

    agent.log("PLAN", moves);
    return moves;
}
