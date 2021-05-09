export type HarvestPool = {
    id?: string,
    masterchefPoolId?: string,
    balance?: string,
    pricePerShare?: string,
    users?: HarvestUser[]
}


export type HarvestUser = {
    id?: string,
    address?: string,
    harvestPool?: HarvestPool,
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