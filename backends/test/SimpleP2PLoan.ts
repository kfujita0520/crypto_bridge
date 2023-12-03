/* eslint-disable */
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import hardhat from 'hardhat';
import { BigNumber } from 'ethers';
import { Result } from '@ethersproject/abi';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { SimpleP2PLoanTermFactory, USDToken, MyNFT } from '../typechain';


const SECONDS_IN_A_HOUR = 3600;
const SECONDS_IN_A_DAY = 86400;
const SECONDS_IN_A_WEEK = 604800;
const SECONDS_IN_A_YEAR = 31449600;

const enum LoanStatus {
    Created = 0,
    Activated = 1,
    Started = 2,
    Redeemed = 3,
    Completed = 4,
    Canceled = 5,
    Defaulted = 6
}



async function deployLoanTermFactory() {
  const [deployer, borrower, lender] = await hardhat.ethers.getSigners() as SignerWithAddress[];


  const LoanTermFactoryContract = await ethers.getContractFactory("SimpleP2PLoanTermFactory");
  const LoanTermFactory = await LoanTermFactoryContract.deploy();
  await LoanTermFactory.deployed();
  console.log(`SimpleP2PLoanTermFactory is deployed to ${LoanTermFactory.address}`);

//   const USDTokenContract = await ethers.getContractFactory("USDToken");
//   const USDToken = await USDTokenContract.deploy(ethers.utils.parseEther("1000000"));
//   await USDToken.deployed();
//   console.log(`USDToken is deployed to ${USDToken.address}`);
//
//   const LoanTermContract = await ethers.getContractFactory("SimpleP2PLoanTerm");
//   const LoanTerm = await LoanTermContract.createLoanTerm(
//                USDToken.address,
//                ethers.utils.parseEther("100000"),
//                SECONDS_IN_A_WEEK * 20, //20 weeks
//                1000, //10%
//                borrower.address,
//                lender.address);
//   await LoanTerm.deployed();
//   console.log(`SimpleP2PLoanTerm is deployed to ${LoanTerm.address}`);


  return {
    LoanTermFactory,
    deployer,
    borrower,
    lender
  };
}

async function deployToken() {
  //TODO: following signer can be passed as argument
  const [deployer, borrower, lender] = await hardhat.ethers.getSigners() as SignerWithAddress[];

  const USDTokenContract = await ethers.getContractFactory("USDToken");
  const USDToken = await USDTokenContract.deploy(ethers.utils.parseEther("1000000"));
  await USDToken.deployed();
  console.log(`USDToken is deployed to ${USDToken.address}`);
  await USDToken.transfer(lender.address, ethers.utils.parseEther("500000"));
  await USDToken.transfer(borrower.address, ethers.utils.parseEther("10000"));

  const MyNFTContract = await ethers.getContractFactory("MyNFT");
  const MyNFT = await MyNFTContract.connect(borrower).deploy();
  await MyNFT.deployed();
  console.log(`MyNFT is deployed to ${MyNFT.address}`);


  return {
    USDToken,
    MyNFT
  };
}


describe('Simple P2P Loan', () => {

    let LoanTermFactory: SimpleP2PLoanTermFactory;
    //let deployer: SignerWithAddress;
    let deployer, borrower, lender;

    before(async ()=>{
        ({ LoanTermFactory, deployer, borrower, lender } = await deployLoanTermFactory());
        console.log('Deployer: ', deployer.address);
        console.log('Borrower: ', borrower.address);
        console.log('Lender: ', lender.address);
    });



    describe('Simple lending', () => {
        let LoanTerm: LoanTerm;
        let USDToken: USDToken;
        let MyNFT;

        before(async ()=>{
          ({ USDToken, MyNFT } = await deployToken());
        });

        it('create term and deposit collateral', async () => {

            await LoanTermFactory.createLoanTerm(
                             USDToken.address,
                             ethers.utils.parseEther("100000"),
                             SECONDS_IN_A_WEEK * 20, //20 weeks
                             1000, //10%
                             borrower.address,
                             lender.address);

            let loanTermsLength = await LoanTermFactory.getLoanTermsLength();
            let loanTermIndex = loanTermsLength - 1;
            let loanTermAddress = await LoanTermFactory.loanTerms(loanTermIndex);
            console.log("Loan Term Address: ", loanTermAddress);
            LoanTerm = await hre.ethers.getContractAt("SimpleP2PLoanTerm", loanTermAddress);

            await MyNFT.connect(borrower).approve(LoanTerm.address, loanTermIndex);
            await LoanTerm.connect(borrower).depositNFTCollateral(MyNFT.address, loanTermIndex);
            console.log('Owner of MyNFT', await MyNFT.ownerOf(loanTermIndex));
            expect(await MyNFT.ownerOf(loanTermIndex)).to.equal(LoanTerm.address);
        });

        it('approve and lend', async () => {

            await LoanTerm.connect(lender).approveLoanTerm();
            console.log('Status: ', await LoanTerm.status());
            expect(await LoanTerm.status()).to.be.equal(LoanStatus.Activated);
            await USDToken.connect(lender).approve(LoanTerm.address, ethers.constants.MaxUint256);
            console.log('Principal: ', await LoanTerm.principal());
            await LoanTerm.connect(lender).lend();
            console.log('Principal: ', await LoanTerm.principal());
            expect(await LoanTerm.principal()).to.equal(ethers.utils.parseEther("100000"));
            //even if lend twice mistakenly, term contract does not charge twice and no problem happen
            await LoanTerm.connect(lender).lend();
            expect(await LoanTerm.principal()).to.equal(ethers.utils.parseEther("100000"));

        });

        it('start loan', async () => {
            await USDToken.connect(borrower).approve(LoanTerm.address, ethers.constants.MaxUint256);
            await LoanTerm.connect(borrower).startBorrowing();
            expect(await LoanTerm.status()).to.be.equal(LoanStatus.Started);
            console.log('token balance of Loan Term contract: ', await USDToken.balanceOf(LoanTerm.address));
            console.log('token balance of borrower: ', await USDToken.balanceOf(borrower.address));
            expect(await USDToken.balanceOf(LoanTerm.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await USDToken.balanceOf(borrower.address)).to.equal(ethers.utils.parseEther("110000"));
            console.log("Start borrowing: ", await time.latest())
            await time.increase(SECONDS_IN_A_DAY * 10 );
            console.log("One Day has past: ", await time.latest());
            console.log(await LoanTerm.currentPrincipal());
            console.log(await LoanTerm.accruedInterest());
            console.log(await LoanTerm.claimableInterest());//274725274725274725274
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.BigNumber.from("274725274725274725274"));


        });

        it('claim interest', async () => {

            await LoanTerm.connect(lender).claimInterest();
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.BigNumber.from("0"));
            console.log(await LoanTerm.paidInterest());
            console.log(await USDToken.balanceOf(borrower.address));
            console.log(await USDToken.balanceOf(lender.address));
            console.log(await USDToken.balanceOf(LoanTerm.address));
            expect(await USDToken.balanceOf(lender.address)).to.be.equal(ethers.BigNumber.from("400274725592694342694342"));
            expect(await USDToken.balanceOf(borrower.address)).to.be.equal(ethers.BigNumber.from("109725274407305657305658"));
            await time.increase(SECONDS_IN_A_WEEK * 5 );

        });

        it('redeem a half of principal', async () => {
            console.log(await LoanTerm.withdrawablePrincipal());
            console.log(await LoanTerm.currentPrincipal());
            console.log('Status: ', await LoanTerm.status());
            await LoanTerm.connect(borrower).redeemPartialPrincipal(ethers.utils.parseEther("50000"));
            console.log(await LoanTerm.claimableInterest());
            console.log(await LoanTerm.accruedInterest());
            console.log(await LoanTerm.withdrawablePrincipal());
            console.log(await LoanTerm.currentPrincipal());
            console.log(await USDToken.balanceOf(borrower.address));
            await time.increase(SECONDS_IN_A_WEEK * 5 );

        });




    });

    //Cancel, failed redemption
    describe('Second lending', () => {
         let LoanTerm: LoanTerm;
         let USDToken: USDToken;
         let MyNFT;

         before(async ()=>{
             ({ USDToken, MyNFT } = await deployToken());
         });

         it('just test', async () => {


         });



     });









});
