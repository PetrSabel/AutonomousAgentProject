const config = {
    local: {
        host: "http://localhost:8080/",
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFlYzk1YzIxMTFhIiwibmFtZSI6IkF1dG9ub21peCIsImlhdCI6MTcxNjQwNDc4Mn0.wpX6T1bsF77mVETmewjN2NG1_r-7QLAmqPMLhrrgnQU'
    },
    remote: {
        host: "http://rtibdi.disi.unitn.it:8080/",//"https://deliveroojs.onrender.com?name=Autonomix",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlOTAzZmM5MDdhIiwibmFtZSI6IkF1dG9ub21peCIsImlhdCI6MTcxNTY4MDg0MH0.iXSTUGHxgsC0uZbEzqRsSVRhu4mHVYfSJ8Xw-NdkaX4" 
    }
}

const DPPL_PLANNING: boolean = true;
const DELIVERY_AMPLIFIER: number = 1.5;  // Add more score for delivery because of planning 
const LOCAL_SERVER: boolean = true;
const AGENT_NAME: string = "Autonomix";
const RANDOM_PICKUP: number = 3;  // Factor to set preference of pickup over normal explore
const DELIVERY_EVERY: number = 60;  // Specify how often the agent must deliver packages
const DOMAIN_PATH = "Planning/domain-deliveroo.pddl";
const FORGET_AFTER: number = 500; // ms
// TODO: add path to plan library

export { DPPL_PLANNING, DELIVERY_AMPLIFIER, LOCAL_SERVER, AGENT_NAME,
         RANDOM_PICKUP, DELIVERY_EVERY, DOMAIN_PATH, FORGET_AFTER };
export default config;
