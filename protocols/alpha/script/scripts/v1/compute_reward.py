import json


def get_goblin_transfers(transfer_events):
    transfer_goblins = {}
    for event in transfer_events:
        if event['amount'] > 0:
            if event["to"] not in transfer_goblins:
                transfer_goblins[event["to"]] = []
            transfer_goblins[event["to"]].append(event)
    return transfer_goblins


def get_goblin_add_remove_share_events(goblin_events):
    goblins = {}
    for event in goblin_events:
        if event['goblin'] not in goblins:
            goblins[event['goblin']] = []
        goblins[event['goblin']].append(event)
    return goblins


def calculate_position_reward(all_goblin_events, all_transfer_events):
    transfer_goblins = get_goblin_transfers(all_transfer_events)
    goblin_events = get_goblin_add_remove_share_events(all_goblin_events)

    goblins = {}
    positions = {}
    sum_goblin_reward = {}
    for goblin in transfer_goblins:
        goblin_positions = {}
        sum_goblin_reward[goblin] = 0
        goblins[goblin] = {
            "share": 0,
            "reward": 0
        }
        transfers = transfer_goblins[goblin]
        goblin_share_events = goblin_events[goblin]
        share_event_index = 0
        reward_block = 0
        for transfer in transfers:
            reward_block = transfer["blockNumber"]
            reward_amount = transfer['amount']
            while share_event_index < len(goblin_share_events) and goblin_share_events[share_event_index]["blockNumber"] < reward_block:
                event = goblin_share_events[share_event_index]
                position_id = str(event['posId'])
                owner = event['owner']
                if position_id not in goblin_positions:
                    goblin_positions[position_id] = {
                        "share": 0,
                        "reward": 0,
                        "goblin": goblin,
                        "owner": owner
                    }
                share = event['share']
                if event['event'] == 'AddShare':
                    goblins[goblin]["share"] += share
                    goblin_positions[position_id]["share"] += share
                elif event['event'] == "RemoveShare":
                    goblins[goblin]["share"] -= share
                    goblin_positions[position_id]["share"] -= share
                share_event_index += 1

            for position_id in goblin_positions:
                position = goblin_positions[position_id]
                reward = position['share'] * \
                    reward_amount // goblins[goblin]['share']
                position['reward'] += reward
                sum_goblin_reward[goblin] += reward
            positions.update(goblin_positions)

    # as sushi will distribute reward 2/3
    for position in positions:
        positions[position]['reward'] = positions[position]['reward'] * 2
    for goblin in sum_goblin_reward:
        sum_goblin_reward[goblin] = sum_goblin_reward[goblin] * 2
    return positions, sum_goblin_reward


def main():
    all_goblin_events = json.load(
        open('./results/v1/goblin_v1_events_with_owner.json'))
    all_transfer_events = json.load(open('./aggregated_sushi_events.json'))

    positions, sum_goblin_reward = calculate_position_reward(
        all_goblin_events=all_goblin_events, all_transfer_events=all_transfer_events)

    json.dump(positions, open(
        './results/v1/position_rewards_homora_v1.json', 'w'))
    json.dump(sum_goblin_reward, open(
        './results/v1/goblin_rewards_homora_v1.json', 'w'))


if __name__ == '__main__':
    main()
