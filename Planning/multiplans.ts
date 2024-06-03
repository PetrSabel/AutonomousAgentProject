import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import { readFileSync } from "fs";
import { DIRECTIONS } from "../SingleAgent/auxiliary.js";
import { Action, Point } from "../types.js";
import { MULTI_DOMAIN_PATH } from "../config.js";
import { MultiAgent } from "../MultiAgent/agent.js";

export async function multiplan(agent: MultiAgent, goal: string, for_cache: boolean = false, position?: Point)
                                : Promise<[Action[] | undefined, Action[] | undefined]> {


    agent.log("MULTIPLAN", agent.agents)
    /** BeliefSet */
    const myBeliefset = new Beliefset();
    // My info
    myBeliefset.declare("me i")
    myBeliefset.undeclare("scored i")
    // Friends info
    if (agent.friends) {
        for (let f of agent.friends) {
            let tmp_f = "f_" + f;
            myBeliefset.declare("friend " + tmp_f)
            myBeliefset.undeclare("scored " + tmp_f)
        }
    }

    let real_goal = goal;
    if (goal === "scored i") {
        if (agent.friends.length > 0) {
            real_goal = "or (scored i)"
            for (let f of agent.friends) {
                let tmp_f = "f_" + f;
                real_goal += " (scored " + tmp_f + ")" 
            }
        } else {
            real_goal = "scored i";
        }
        
    }

    if (agent.carry.length > 0) {
        myBeliefset.declare("carry i")
        agent.log("Im carrying")
    } else {
        myBeliefset.undeclare("carry i")
        agent.log("NOT CARRYING")
    }

    let t = (position != undefined) ? "t" + position.x + "_" + position.y : "t" + agent.x + "_" + agent.y;
    myBeliefset.declare("at i " + t)
    let my_t = t.slice();

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
                    // agent.log("TILE IS OCCUPIED", t, tile.agentID)
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

    // My position
    myBeliefset.undeclare("free " + my_t)

    // Declare position of friends
    for (let f of agent.friends) {
        let friend = agent.agents.get(f);
        if (friend) {
            let t = " t" + Math.round(friend.x) + "_" + Math.round(friend.y);
            let tmp_f = "f_" + f;
            myBeliefset.declare("at " + tmp_f + t)
        }
    }

    let init_situation = myBeliefset.toPddlString();
    let objects = myBeliefset.objects;

    // Problem 

    agent.log("GOAL IS", real_goal, "+++++")
    let problem = new PddlProblem("first", objects.join("\n  "), init_situation, real_goal)
    
    let problem_string = problem.toPddlString()

    /** Domain */
    const DOMAIN_STRING: string = readFileSync( MULTI_DOMAIN_PATH, 'utf8');
    
    /** Solve */
    let plan: any = undefined;
    // console.time("solve " + t +  goal)
    try {
        plan = await onlineSolver(DOMAIN_STRING, problem_string);
        problem.saveToFile() // DEBUG
        agent.log("SAVED", agent.agents)

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
                    friend_moves.push("wait");
                    break;
                };
                case "SYNCH": {
                    if (a.args[0]) {
                        agent.chosen_one = a.args[0].toLowerCase().slice(2);
                        moves.push("synch");
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
                        friend_moves.push("wait");
                    } else if (a.args[0]) {
                        friend_moves.push(a.action.toLowerCase());
                        moves.push("wait");
                    } else {
                        throw new Error("Unrecognized args for action returned from planner");
                    }
                    break;
                };

                case "REACH-GOAL": break; // ignore

                default: {
                    console.error("A: ", a)
                    throw new Error("Unrecognized action returned from planner");
                }
            }
        }

        moves.push("wait")
        friend_moves.push("wait")

    } else {
        agent.log("IMPOSSIBLE INTENTION", goal);
        // problem.saveToFile();
        return [undefined, undefined];
    }

    agent.log("PLAN", moves);
    return [moves, friend_moves];
}
