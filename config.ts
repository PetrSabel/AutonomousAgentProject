const config = {
    local: {
        host: "http://localhost:8080/",
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFlYzk1YzIxMTFhIiwibmFtZSI6IkF1dG9ub21peCIsImlhdCI6MTcxNjQwNDc4Mn0.wpX6T1bsF77mVETmewjN2NG1_r-7QLAmqPMLhrrgnQU'
    },
    remote: {
        host: "http://rtibdi.disi.unitn.it:8080/", //"https://deliveroojs.onrender.com/",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlOTAzZmM5MDdhIiwibmFtZSI6IkF1dG9ub21peCIsImlhdCI6MTcxNTY4MDg0MH0.iXSTUGHxgsC0uZbEzqRsSVRhu4mHVYfSJ8Xw-NdkaX4" 
    },
    // Tokens for multiple agents 
    multi: [
        {
            name: "Autonomix_1",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4MTgxMDI5NTU4IiwibmFtZSI6IkF1dG9ub21peF8xIiwiaWF0IjoxNzE3NDk0NTYxfQ.Z5B5Z-Y6B2SCBo6og-xKO2PRIponIOtnEEgfnlHBsuQ"
        },
        {
            name: "Autonomix_2",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxMDI5NTU4NzU2IiwibmFtZSI6IkF1dG9ub21peF8yIiwiaWF0IjoxNzE3NDk0NTk2fQ.k5b1Zsn_jeG79fDUeSBizp5hxYAXHHCmg7Bh_F2bzQc"
        }
    ]
}

const DPPL_PLANNING: boolean = true;  // Specifies if use A* or DPPL planner
const DELIVERY_WEIGHT: number = 0.3;  // Adds more score for delivery because of planning delays
const LOCAL_SERVER: boolean = true;   // Specifies if the server is launched locally or remotely
const AGENT_NAME: string = "Autonomix"; // Name for the SingleAgent
const RANDOM_PICKUP: number = 3;  // Factor to set preference of unconvenient pickup over normal explore
const DELIVERY_EVERY: number = 30;  // Specifies how often the agent must deliver packages
const FORGET_AFTER: number = 5000; // Specifies after how many ms the agent will forget the position of another one
const WAITING_TIME: number = 2000; // Maximum limit for "wait" action (ms)

// Paths to pddl domain files
const MULTI_DOMAIN_PATH = "Planning/domain-multi.pddl";
const DOMAIN_PATH = "Planning/domain-deliveroo.pddl";


export { DPPL_PLANNING, DELIVERY_WEIGHT, LOCAL_SERVER, AGENT_NAME,
         RANDOM_PICKUP, DELIVERY_EVERY, DOMAIN_PATH, FORGET_AFTER, 
         MULTI_DOMAIN_PATH, WAITING_TIME };
export default config;
