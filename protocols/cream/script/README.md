# Sushi LP Token Vested Reward Calculation

## Setup
```
pip3 install -r requirements.txt
```

## Run
execute the run.py program with parameter ```e``` for vesting end block number and ```p``` for the path to blacklist amount json file

```
# example
python3 run.py -e 99999999 -p PATH-TO-BLACKLIST-AMOUNT-FILE 
```
## Note
Starting on 2021-03-29, SushiSwap no longer requires earned rewards to be vested for 6 months. See [link](https://docs.sushi.com/faq-1/vesting-faq)

It means that vested rewards only needs to be calculated from crSLP pool start time till claim date minus 6 months

Example 1:
For claim date of 2021-09-01, the data required for calculation would be from pool start date to 2021-03-01

Example 2:
For claim date of 2021-10-01, the data required for calculation would be from pool start date to 2021-03-29, instead of 2021-04-01. Because rewards earned after 2021-03-29 did not require vesting.




