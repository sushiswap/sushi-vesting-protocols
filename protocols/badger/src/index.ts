import data from "./sushi-vesting-badger.json";

export default async function getBadgerDistribution() {
  const balances = data as any;
  const final: { [user: string]: string } = {};

  Object.keys(balances).forEach(
    (key: any) => (final[key.toLowerCase()] = balances[key].toFixed(0))
  );

  return final;
}
