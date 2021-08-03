export const DELAY = 15;

export const DEFIDOLLAR_VESTING_SUBGRAPH = "https://api.thegraph.com/subgraphs/name/lufycz/vesting-defidollar";

export const VESTING_START = 10959148;

export const DUSD_ADDRESS = "0x47744B96f799A61874a3cd73b394B7FEAA6c3E19"
export const DFD_ADDRESS = "0x81b53a22D51D6769093bEC1158f134fc6b114F4B"

export const DUSD_DEPLOY_BLOCK = 11777086
export const DFD_DEPLOY_BLOCK = 11776909

export const DFDMINER_ABI = [
  {
    "inputs":[
       {
          "internalType":"address",
          "name":"account",
          "type":"address"
       }
    ],
    "name":"sushiEarned",
    "outputs":[
       {
          "internalType":"uint256",
          "name":"",
          "type":"uint256"
       }
    ],
    "stateMutability":"view",
    "type":"function"
 }
]