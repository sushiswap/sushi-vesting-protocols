import query from './queries';

type Options = {
    startBlock: number | undefined,
    endBlock: number,
    step: number | undefined,
    totalVested: number
}

export default async function getDraculaDistribution(options: Options) {
    const { poolsData, usersData } = await query({startBlock: options.startBlock, endBlock: options.endBlock, step: options.step});

    const balances: {[key: string]: number} = {};

    poolsData.forEach((block, i) => {
        const usersBlock = usersData[i];

        block.forEach(pool => {
            const users = usersBlock.filter(user => user.poolId === pool.poolId)
            
            users.forEach(user => {
                const points = user.balance * pool.weight;

                balances[user.user] = balances[user.user] ? balances[user.user] + points : points;
            })
        })
    });

    let totalPoints = 0;
    Object.keys(balances).forEach(key => totalPoints += balances[key])

    const fraction = options.totalVested / totalPoints

    Object.keys(balances).forEach(key => balances[key] = balances[key] * fraction)

    Object.keys(balances).forEach((key, i) => {if(i < 10) {console.log(key + " - " + balances[key])}})
}