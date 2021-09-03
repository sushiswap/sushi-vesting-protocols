import json
from collections import defaultdict

WMASTERCHEF = "0x373ae78a14577682591e088f2e78ef1417612c68"


def main():
    scale_ratio = defaultdict(float)
    sum_rewards = 0
    sushi_blacklist = json.load(open('./data/sushi_blacklist.json'))
    wmasterchef_reward = json.load(
        open('./results/v2/wmasterchef_reward.json'))

    positions = json.load(
        open('./results/v2/position_rewards_homora_v2.json'))

    scale_ratio = int(sushi_blacklist[WMASTERCHEF]
                      ) * 10**18 // wmasterchef_reward
    print("wmasterchef scale ratio", scale_ratio)

    for position_id in positions:
        position = positions[position_id]
        position['reward'] = int(position['reward'] * scale_ratio // 10**18)
        sum_rewards += position['reward']
    print("sum_rewards", sum_rewards)

    json.dump(positions, open(
        './results/v2/scaled_position_rewards_homora_v2.json', 'w'))


if __name__ == '__main__':
    main()
