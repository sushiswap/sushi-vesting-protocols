export type MasterVampire = {
    id?: string,
    poolLength?: string
}


export type VampirePool = {
    id?: string,
    victim?: string,
    victimPoolId?: string,
    balance?: string,
    users?: VampireUser[]
}


export type VampireUser = {
    id?: string,
    vampirePool?: VampirePool,
    balance?: string
}


export type Masterchef = {
    id?: string,
    totalAllocPoint?: string,
    poolLength?: string
}


export type MasterchefPool = {
    id?: string,
    masterchef?: Masterchef,
    allocPoint?: string,
    balance?: string,
    lastBlockUpdated?: string
}