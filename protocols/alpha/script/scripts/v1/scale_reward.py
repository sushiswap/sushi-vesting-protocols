import json
from collections import defaultdict


def main():
    scale_ratio = defaultdict(float)
    sum_goblin_rewards = defaultdict(int)
    sushi_blacklist = json.load(open('./data/sushi_blacklist.json'))
    goblin_rewards = json.load(
        open('./results/v1/goblin_rewards_homora_v1.json'))
    positions = json.load(
        open('./results/v1/position_rewards_homora_v1.json'))

    for goblin_address in goblin_rewards:
        if goblin_address in sushi_blacklist:
            scale_ratio[goblin_address] = int(
                sushi_blacklist[goblin_address]) * 10**18 // goblin_rewards[goblin_address]

    for position_id in positions:
        position = positions[position_id]
        goblin = position['goblin']
        position['reward'] = position['reward'] * scale_ratio[goblin] // 10**18
        sum_goblin_rewards[goblin] += position['reward']
    print("sum_goblin_rewards", sum_goblin_rewards)

    json.dump(positions, open(
        './results/v1/scaled_position_rewards_homora_v1.json', 'w'))


if __name__ == '__main__':
    main()
