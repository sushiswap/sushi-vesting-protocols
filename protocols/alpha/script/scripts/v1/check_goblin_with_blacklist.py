import json
from collections import defaultdict


def main():
    diff = defaultdict(float)
    sushi_blacklist = json.load(open('./data/sushi_blacklist.json'))
    goblin_rewards = json.load(
        open('./results/v1/goblin_rewards_homora_v1.json'))

    for goblin_address in goblin_rewards:
        if goblin_address in sushi_blacklist:
            diff[goblin_address] = max(int(sushi_blacklist[goblin_address]), goblin_rewards[goblin_address]) / min(
                int(sushi_blacklist[goblin_address]), goblin_rewards[goblin_address])

    json.dump(diff, open('./results/v1/diff_v1_rewards_with_sushi_list.json', 'w'))


if __name__ == '__main__':
    main()
