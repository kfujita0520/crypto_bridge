import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {
    const [deployer, borrower, lender] = await ethers.getSigners();
    let networkName = hre.network.name;

    //this configuration should be updated after deploying factory contract on both chains.
    let polygonFactory = "0xc7f9082f40145006106e84C167cfC2B2b691a43c";
    let etherFactory = "0x54fe8f5415Dd94989Ff289594481F34bAcf02e89";
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
