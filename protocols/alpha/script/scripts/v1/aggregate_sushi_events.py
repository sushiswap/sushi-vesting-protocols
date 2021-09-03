import glob
import json
from collections import defaultdict


def get_key(event):
    return (event['blockNumber'], event['logIndex'])


def sort_all_events(events):
    sorted_events = sorted(events, key=get_key)
    return sorted_events


endBlock = int(json.load(open('./configs/end_block.json')))

all_events = []
for filepath in glob.glob('./events/sushi_events_v1.json'):
    data = json.load(open(filepath))['blocks']
    events = []
    for block_number in data:
        data1 = data[block_number]
        for tx_hash in data1:
            data2 = data1[tx_hash]
            for log_index in data2:
                if int(block_number) <= endBlock:
                    event = {}
                    event['blockNumber'] = int(block_number)
                    event['transactionHash'] = tx_hash
                    event['logIndex'] = int(log_index)

                    data3 = data2[log_index]
                    # convert from +7 to UTC.
                    event['timeStamp'] = data3['block_timestamp'] + 25200
                    event['from'] = data3['from'].lower()
                    event['to'] = data3['to'].lower()
                    event['amount'] = data3['amount']

                    events.append(event)

    all_events.extend(events)

json.dump(sort_all_events(all_events), open(
    './aggregated_sushi_events.json', 'w'))
