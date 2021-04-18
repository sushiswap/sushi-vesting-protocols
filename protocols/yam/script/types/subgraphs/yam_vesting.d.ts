export type YamUser = {
    id?: string,
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