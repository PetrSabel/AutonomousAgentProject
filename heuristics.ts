import { ICompare } from "@datastructures-js/priority-queue";
import { State } from "./socket"

// Tile heuristics
export const nearestTiles: ICompare<State> = (a: State, b: State) => {
    let dist_a = a.moves.length 
    let dist_b = b.moves.length 
    
    return dist_a < dist_b ? -1 : 1;
};

export function generate_shortest_heuristic(x: number, y:  number) {
    return (a: State, b: State) => {
        let dist_a = Math.abs(a.x - x) + Math.abs(a.y - y)
        let dist_b = Math.abs(b.x - x) + Math.abs(b.y - y) 
        
        return dist_a < dist_b ? -1 : 1;
    }
} 
