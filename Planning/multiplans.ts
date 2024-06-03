import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import { readFileSync } from "fs";
import { DIRECTIONS } from "../SingleAgent/auxiliary.js";
import { Action, Point } from "../types.js";
import { MULTI_DOMAIN_PATH } from "../config.js";
import { MultiAgent } from "../MultiAgent/agent.js";

export async function multiplan(agent: MultiAgent, goal: string, for_cache: boolean = false, position?: Point)
                                : Promise<[Action[] | undefined, Action[] | undefined]> {


    agent.log("MULTIPLAN")
    /** BeliefSet */
    const myBeliefset = new Beliefset();
    // My info
    myBeliefset.declare("me i")
    myBeliefset.undeclare("scored i")
    // Friends info
    if (agent.friends) {
        for (let f of agent.friends) {
            myBeliefset.declare("friend " + f)
            myBeliefset.undeclare("scored " + f)
        }
    }

    if (goal === "scored i") {
        if (agent.friends) {
            goal = "or (scored i)"
            for (let f of agent.friends) {
                goal += " (scored " + f + ")" 
            }
        } else {
            goal = "scored i";
        }
        
        myBeliefset.declare("carry i")
        agent.log("Im carrying")
    } else {
        myBeliefset.undeclare("carry i")
    }

    let t = (position != undefined) ? "t" + position.x + "_" + position.y : "t" + agent.x + "_" + agent.y;
    myBeliefset.declare("at i " + t)

    // Map
    for (let row of agent.map) {
        for (let tile of row) {
            if (tile) {
                t = "t" + tile.x + "_" + tile.y 
                myBeliefset.declare("tile " + t)

                // Tile descriptions
                if (tile.delivery) {
                    myBeliefset.declare("delivery " + t)
                }
                if (tile.spawnable) {
                    myBeliefset.declare("spawn " + t)
                }
                // Other agents positions
                if (tile.agentID && !for_cache) {
                    myBeliefset.undeclare("free " + t)
                } else {
                    myBeliefset.declare("free " + t)
                }
                
                // Parcels
                if (tile.parcel) {
                    myBeliefset.declare("withparcel " + t)
                }

                // Moves
                for (let dir of DIRECTIONS) {
                    if (tile) {
                        let [nx, ny] = agent.next_position(tile.x, tile.y, dir)

                        if (agent.map[nx] != undefined && agent.map[nx][ny]) {
                            let nt = "t" + nx + "_" + ny 
                            myBeliefset.declare(dir + " " + t + " " + nt)
                        }
                    }
                }
            }
        }
    }

    // Declare position of friends
    for (let f of agent.friends) {
        let friend = agent.agents.get(f);
        if (friend) {
            let t = " t" + Math.round(friend.x) + "_" + Math.round(friend.y);
            myBeliefset.declare("at " + f + t)
        }
    }

    let init_situation = myBeliefset.toPddlString();
    let objects = myBeliefset.objects;

    // Problem 

    agent.log("GOAL IS", goal.slice(1, -1), "+++++")
    let problem = new PddlProblem("first", objects.join("\n  "), init_situation, goal.slice(1, -1))
    
    let problem_string = problem.toPddlString()

    /** Domain */
    const DOMAIN_STRING: string = readFileSync( MULTI_DOMAIN_PATH, 'utf8');
    
    /** Solve */
    let plan: any = undefined;
    // console.time("solve " + t +  goal)
    try {
        plan = await onlineSolver(DOMAIN_STRING, problem_string);
        problem.saveToFile() // DEBUG
        agent.log("SAVED", agent.carry)

    } catch(e) {
        console.error("Solver ERROR", e)
    }
    // console.timeEnd("solve " + t + goal)

    /** Execute */
    let moves = [];
    let friend_moves = [];
    
    if (plan) {
        // Rewrite plan to the list of moves
        for (let a of plan) {
            switch (a.action) {
                case "DELIVER": {
                    moves.push("putdown");
                    break
                };
                case "SYNCH": {
                    if (a.args[0]) {
                        moves.push("synch");
                        agent.chosen_one = a.args[0];
                    } else {
                        throw new Error("Synchronization with nobody");
                    }
                    break;
                };
                case "EXCHANGE": {
                    moves.push("exchange");
                    friend_moves.push("exchange");
                    break;
                };
                case "RIGHT":
                case "LEFT":
                case "DOWN":
                case "UP":
                case "PICKUP":
                case "PUTDOWN": {
                    if (a.args[0] == 'I') {
                        moves.push(a.action.toLowerCase());
                    } else if (a.args[0] == 'F') {
                        friend_moves.push(a.action.toLowerCase());
                    } else {
                        throw new Error("Unrecognized args for action returned from planner");
                    }
                    break;
                };

                default: {
                    throw new Error("Unrecognized action returned from planner");
                }
            } 
            if (a.action === "DELIVER"){
                moves.push("putdown");
            } else {
                moves.push(a.action.toLowerCase())
            }
        }

    } else {
        agent.log("IMPOSSIBLE INTENTION", goal);
        // problem.saveToFile();
        return [undefined, undefined];
    }

    agent.log("PLAN", moves);
    return [moves, friend_moves];
}
