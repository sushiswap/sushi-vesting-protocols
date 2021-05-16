export type Options = {
    startBlock?: number,
    endBlock: number,
    claimBlock?: number,
    step: number | undefined,
    blacklistDistribution: {[address: string]: string}
}