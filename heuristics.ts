import { ICompare } from "@datastructures-js/priority-queue";
import { State } from "./socket"

// Tile heuristics
export const nearestTiles: ICompare<State> = (a: State, b: State) => {
    let dist_a = a.moves.length 
    let dist_b = b.moves.length 
    
    return dist_a < dist_b ? -1 : 1;
};
