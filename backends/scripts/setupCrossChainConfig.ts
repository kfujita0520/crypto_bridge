import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {
    const [deployer, borrower, lender] = await ethers.getSigners();
    let networkName = hre.network.name;

    //this configuration should be updated after deploying factory contract on both chains.
    let polygonFactory = "0x95adE6BCD887eF2Ec71C0e3755a3Fc18B816ceBf";
    let etherFactory = "0x72e73Fd517c1aac629604fa54008cd1c6F08F585";
    let LoanTermFactory;
    if (networkName == "polygonMumbai"){
        LoanTermFactory = await hre.ethers.getContractAt("P2PLoanTermFactory", polygonFactory);
        await LoanTermFactory.updateSourceSender(getRouterConfig("ethereumSepolia").chainSelector, etherFactory);
    } else if(networkName = "ethereumSepolia") {
        LoanTermFactory = await hre.ethers.getContractAt("P2PLoanTermFactory", etherFactory);
        await LoanTermFactory.updateSourceSender(getRouterConfig("polygonMumbai").chainSelector, polygonFactory);
    } else {
        console.log("not supported");
    }



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
