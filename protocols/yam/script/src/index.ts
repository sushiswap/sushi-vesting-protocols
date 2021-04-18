import { DEFAULT_STEP, VESTING_START } from './constants';
import query from './queries';

type Options = {
    startBlock: number,
    endBlock: number,
    step: number | undefined,
    totalVested: number
}

export default async function getYamDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    options.step = options.step ?? DEFAULT_STEP;

    const { poolsData, usersData } = await query({startBlock: options.startBlock, endBlock: options.endBlock, step: options.step});

    const balances: {[key: string]: number} = {};

    // The amount of entries in the users array and pools array is the same => can assume that the corresponding entry will be at the same index
    poolsData.forEach((pool, i) => {
        const users = usersData[i];
        users.forEach(user => {
            const points = user.balance * pool.weight;

            balances[user.user] = balances[user.user] ? balances[user.user] + points : points;
        })
    });

    let totalPoints = 0;
    Object.keys(balances).forEach(key => totalPoints += balances[key]);

    const fraction = options.totalVested / totalPoints;

    const final: {[key: string]: string} = {};

    Object.keys(balances).forEach(key => { 
        final[key] = String(Math.floor(balances[key] * fraction));
        if(final[key] === "0") delete final[key];
    })

    return final;
}