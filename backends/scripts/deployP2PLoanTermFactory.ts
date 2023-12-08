import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {
    const [deployer, borrower, lender] = await ethers.getSigners();
    let networkName = hre.network.name;
    //let networkName = "polygonMumbai";

    //with this script only deployer = admin will holde both USDToken and NFT. this should be transferred to lender and borrower before testing
    const LoanTermFactoryContract = await ethers.getContractFactory("P2PLoanTermFactory");
    const LoanTermFactory = await LoanTermFactoryContract.deploy(getRouterConfig(networkName).address, LINK_ADDRESSES[networkName], getRouterConfig(networkName).chainSelector);
    await LoanTermFactory.deployed();
    console.log(`P2PLoanTermFactory is deployed to ${LoanTermFactory.address}`);

    const USDTokenContract = await ethers.getContractFactory("USDToken");
    const USDToken = await USDTokenContract.deploy(ethers.utils.parseEther("1000000"));
    await USDToken.deployed();
    console.log(`USDToken is deployed to ${USDToken.address}`);
//     await USDToken.transfer(lender.address, ethers.utils.parseEther("500000"));
//     await USDToken.transfer(borrower.address, ethers.utils.parseEther("10000"));

    const MyNFTContract = await ethers.getContractFactory("MyNFT");
    const MyNFT = await MyNFTContract.deploy();
    await MyNFT.deployed();
    console.log(`MyNFT is deployed to ${MyNFT.address}`);

    const CCIPReceiveTesterContract = await ethers.getContractFactory("CCIPReceiveTester");
    const CCIPReceiveTester = await CCIPReceiveTesterContract.deploy(LoanTermFactory.address);
    await CCIPReceiveTester.deployed();
    console.log(`CCIPReceiveTester is deployed to ${CCIPReceiveTester.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
