rm -rf ./results/v2
mkdir ./results/v2
python3 scripts/v2/aggregate_bank_events.py
python3 scripts/v2/aggregate_sushi_events.py
python3 scripts/v2/query_owner_mapping.py $WEB3_API
python3 scripts/v2/compute_reward.py
python3 scripts/v2/scale_reward.py
python3 scripts/v2/compute_user_rewards_with_scale.py