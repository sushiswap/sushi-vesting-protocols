rm -rf ./results/v1
mkdir ./results/v1
python3 scripts/v1/aggregate_goblin_events.py
python3 scripts/v1/aggregate_sushi_events.py
python3 scripts/v1/query_owner_mapping.py $WEB3_API
python3 scripts/v1/compute_reward.py
python3 scripts/v1/check_goblin_with_blacklist.py
python3 scripts/v1/scale_reward.py
python3 scripts/v1/compute_user_rewards_with_scale.py