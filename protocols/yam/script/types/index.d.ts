export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

type Options = {
    startBlock: number,
    endBlock: number,
    step: number | undefined,
    blacklistDistribution: {[address: string]: string}
}