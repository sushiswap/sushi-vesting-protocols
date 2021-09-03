import json


def calculate_position_reward(reward_transfer_events, bank_events):
    positions = {}
    reward_block = 0
    bank_event_index = 0
    total_share = 0
    total_reward = 0
    for transfer in reward_transfer_events:
        reward_block = transfer["blockNumber"]
        reward_amount = transfer['amount']
        while bank_event_index < len(bank_events) and bank_events[bank_event_index]["blockNumber"] < reward_block:
            event = bank_events[bank_event_index]
            position_id = str(event['posId'])
            # only wrapped master chef
            if event['collToken'].lower() == "0x373ae78a14577682591e088f2e78ef1417612c68".lower():
                if position_id not in positions:
                    positions[position_id] = {
                        "share": 0,
                        "reward": 0,
                        "owner": event['owner']
                    }
                if event["event"] == "PutCollateral" or event["event"] == "TakeCollateral":
                    lp_token_amount = event["amount"]
                    if event["event"] == "PutCollateral":
                        positions[position_id]["share"] += lp_token_amount
                        total_share += lp_token_amount
                    else:
                        positions[position_id]["share"] -= lp_token_amount
                        total_share -= lp_token_amount
                elif event["event"] == "Liquidate":  # liquidate
                    lp_token_amount = event["bounty"]
                    positions[position_id]["share"] -= lp_token_amount
                    total_share -= lp_token_amount
                else:
                    raise Exception(
                        "found unknown event {}".format(event["event"]))
            else:
                bank_event_index += 1
                continue

            bank_event_index += 1

        for position_id in positions:
            position = positions[position_id]
            reward = position["share"] * reward_amount // total_share
            position["reward"] += reward
    #  as sushi will distribute reward 2/3
    for position in positions:
        reward = positions[position]['reward'] * 2
        positions[position]['reward'] = reward
        total_reward += reward
    print("total_reward", total_reward)
    return positions, total_reward


def main():
    # homora v2 has only SUSHI/ETH pool (pid=12)
    rewards_events = json.load(
        open('./aggregated_sushi_events_v2.json'))
    bank_events = json.load(open('./results/v2/bank_events_with_owner.json'))

    positions, total_reward = calculate_position_reward(
        rewards_events, bank_events)

    json.dump(positions, open(
        './results/v2/position_rewards_homora_v2.json', 'w'))
    json.dump(total_reward, open(
        './results/v2/wmasterchef_reward.json', 'w'))


if __name__ == '__main__':
    main()
