import client from "./client";

export const getOrgs   = ()       => client.get("/orgs");
export const getOrg    = (id)     => client.get(`/orgs/${id}`);
export const createOrg = (data)   => client.post("/orgs", data);