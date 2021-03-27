export type MasterVampire = {
    id?: string,
    poolLength?: string
}


export type VampirePool = {
    id?: string,
    victim?: string,
    victimPoolId?: string,
    users?: VampireUser[]
}


export type VampireUser = {
    id?: string,
    vampirePool?: VampirePool,
    balance?: string,
    actions?: Action[],
    actionsLength?: string
}


export type Action = {
    id?: string,
    user?: VampireUser,
    type?: ActionType,
    balanceBefore?: string,
    balanceAfter?: string,
    amount?: string,
    block?: string
}


export type ActionType = 'deposit' | 'withdraw';


export type Masterchef = {
    id?: string,
    totalAllocPoint?: string,
    poolLength?: string
}


export type MasterchefPool = {
    id?: string,
    allocPoint?: string,
    weight?: string,
    lastBlockUpdated?: string,
    changes?: Change[],
    changesLength?: string
}


export type Change = {
    id?: string,
    masterchefPool?: MasterchefPool,
    oldWeight?: string,
    newWeight?: string,
    block?: string
}