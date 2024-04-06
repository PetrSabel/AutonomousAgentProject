import { Tile } from "./types";

// Goal functions
const isParcel = (tile: Tile) => {
    if (tile) {
        return (tile.parcel != null)
    } else {
        return false;
    }
}
// TODO: put info about other agents on map to skip them
// TODO: make something when my move is blocked
// TODO: when new parcel appears closer than goal, change the goal
const isDelivery = (tile: Tile) => {
    if (tile) {
        return tile.delivery
    } else {
        return false;
    }
}

export { isParcel, isDelivery };