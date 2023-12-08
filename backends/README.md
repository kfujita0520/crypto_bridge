# CCIP P2P Loan Application
## Overview
This is P2P Loan application having cross chain capability. 
Assuming the situation where a borrower has good valued NFT on ethereum chain (most of high-end NFT resides on Ethereum at the moment), 
he would like to borrower USD token on L2(such as polygon) for the cheaper transaction cost. 

We offer the solution by only creating term contract and locking collateral NFT will be done in L1, 
then the rest of transaction tasks for loan execution and repayment will be delegated to L2.
The loan flow of our system will be like following chart.
![loan_flow.png](docs/img/loan_flow.png)

T.B.D. (Explain the rational to identify the place to apply CCIP function)

## Architecture
The contract architecture with Chainlink CCIP is  shown in the diagram below.

T.B.D. (Attache some chart)

- CCIP Router   
This contract is the contact point of CCIP system. All messages are handled by this contract.
- P2PLoanTermFactory
This contract has two features. One is CCIP Handler feature which will acts as contact point to CCIP Router.
All messages from our system will be handled through this contract.
Another is factory feature which create Loan Term contract depends on new feature. 
- P2PLoanTerm




## Set up
Set up the project with following command
```
npm install
```

Then deploy the contract on each network. 
For example, if deploy on both sepolia and mumbai, run following command
```
npx hardhat run scripts/deployP2PLoanTermFactory.ts --network ethereumSepolia
npx hardhat run scripts/deployP2PLoanTermFactory.ts --network polygonMumbai
```
After that initial configuration is required. 
Please note that you need to set up the contract addresses created in previous step before executing following command. 
```
npx hardhat run scripts/setupCrossChainConfig.ts --network ethereumSepolia
npx hardhat run scripts/setupCrossChainConfig.ts --network polygonMumbai
```
Verify P2PLoanTermFactory with following commands
```
npx hardhat verify --network polygonMumbai --constructor-args ./scripts/verifyArgument/polygonArgument.js 0x95adE6BCD887eF2Ec71C0e3755a3Fc18B816ceBf
npx hardhat verify --network ethereumSepolia --constructor-args ./scripts/verifyArgument/argument.js 0x72e73Fd517c1aac629604fa54008cd1c6F08F585 
```

## Findings
