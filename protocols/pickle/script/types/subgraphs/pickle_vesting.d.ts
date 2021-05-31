export type PicklePool = {
    id?: string,
    masterchefPoolId?: string,
    balance?: string,
    pricePerShare?: string,
    users?: PickleUser[]
}


export type PickleUser = {
    id?: string,
    address?: string,
    picklePool?: PicklePool,
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