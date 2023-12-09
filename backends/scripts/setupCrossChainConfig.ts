import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {
    const [deployer, borrower, lender] = await ethers.getSigners();
    let networkName = hre.network.name;

    //this configuration should be updated after deploying factory contract on both chains.
    let polygonFactory = "0x386fbBD3c03013fdBc0D95b2c61b481eC5b79e25";
    let etherFactory = "0xc3c7E3C289b3848A8356F4a0b6340e14467EaF4a";
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
