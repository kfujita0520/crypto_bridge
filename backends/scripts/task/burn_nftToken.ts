import { ethers } from "hardhat";
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";

async function main() {

  const [deployer, signer] = await ethers.getSigners();

  let networkName = hre.network.name;
  let nftAddress;
  if (networkName == "polygonMumbai"){
      nftAddress = "0x9cE11Da07A36cCea46d432A72C9385Cfb414FEE1";
  } else if(networkName = "ethereumSepolia") {
      nftAddress = "0xf5bdb6fDbb4E5A7BA950aa3F7879d3D0ab1deD02";
  } else {
      console.log("not supported");
  }

  const myNFT = await hre.ethers.getContractAt("MyNFT", nftAddress);
  await myNFT.transferFrom(deployer.address, myNFT.address, 0);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
