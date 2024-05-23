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

export const DPPL_PLANNING: boolean = true;
// TODO: add path to plan library

export default config;
