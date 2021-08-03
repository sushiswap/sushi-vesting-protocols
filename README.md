# sushi-vesting-protocols

This is a monorepo which contains vesting scripts for several protocols that have farmed Sushi during the vesting period.

## To Run
* Create .env (check .env.sample for sample)
* ``yarn``
* ``yarn run standalone -s <startBlock> -e <endBlock>``

Resulting files will be under the aggregator/outputs folder

## Options
`-s` - Start Block, defaults to 10959148 (vesting start), defines the start of the period of the calculation

`-e` - End Block, required, defines the end of the period of the calculation

# Credits
Thanks to: 
* Natthakun Kitthaworn and HermioneETH from Alpha Homora 
* Warren Cheng and devpaf from Cream

For writing their project's queries themselves