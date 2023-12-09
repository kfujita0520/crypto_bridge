import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {
    const [deployer, borrower, lender] = await ethers.getSigners();
    let networkName = hre.network.name;

    //this configuration should be updated after deploying factory contract on both chains.
    let polygonFactory = "0xD9621594289fABC0448EF614f05e13E21158B1d4";
    let etherFactory = "0xe6ddA0C101841907c617D98B11a43D9c4e21e8e3";
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
