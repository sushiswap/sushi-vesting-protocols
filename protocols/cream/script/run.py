import argparse
from dateutil.relativedelta import relativedelta
from datetime import datetime
from services.query import get_block_number
from services.main import get_distribution
import json

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', help='start block')
    parser.add_argument('-e', help='end block')
    parser.add_argument('-p', help='path to blacklist list')
    args = parser.parse_args()
    vesting_end_block = int(args.e)
    vesting_cutoff_block = get_block_number(datetime(year=2021, month=3, day=29))
    vesting_end_block = vesting_cutoff_block if vesting_end_block > vesting_cutoff_block else vesting_end_block
    path_to_blacklist_list = args.p
    if not path_to_blacklist_list:
        print('Path to blacklist list is not provided. Please provide it with -p argument to a json file mapping of address:amount')
    else:
        pool_vested_sushi_amounts = {}
        if path_to_blacklist_list:
            with open(path_to_blacklist_list) as f:
                pool_vested_sushi_amounts = json.loads(f.read())
        get_distribution(vesting_end_block, pool_vested_sushi_amounts)

