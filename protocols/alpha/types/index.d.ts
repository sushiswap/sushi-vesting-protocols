export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

type Options = {
    endBlock: number,
    blacklistDistribution: {[address: string]: string}
}