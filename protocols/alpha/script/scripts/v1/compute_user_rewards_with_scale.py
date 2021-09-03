import json
from collections import defaultdict


def main():
    users = defaultdict(int)
    scaled_position_rewards = json.load(
        open('./results/v1/scaled_position_rewards_homora_v1.json'))

    for position_id in scaled_position_rewards:
        position = scaled_position_rewards[position_id]
        users[position['owner']] += position['reward']

    json.dump(users, open('./results/v1/user_rewards_homora_v1.json', 'w'))


if __name__ == '__main__':
    main()
