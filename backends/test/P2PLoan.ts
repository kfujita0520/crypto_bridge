/* eslint-disable */
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import hardhat from 'hardhat';
import { BigNumber } from 'ethers';
import { Result } from '@ethersproject/abi';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { P2PLoanTermFactory, P2PLoanTerm, USDToken, MyNFT } from '../typechain';
import { LINK_ADDRESSES, PayFeesIn } from "./utils/constants";
import { getRouterConfig } from "./utils/utils";


const SECONDS_IN_A_HOUR = 3600;
const SECONDS_IN_A_DAY = 86400;
const SECONDS_IN_A_WEEK = 604800;
const SECONDS_IN_A_YEAR = 31449600;

const enum LoanStatus {
    Created = 0,
    Activated = 1,
    Delegated = 2,
    Started = 3,
    Redeemed = 4,
    Completed = 5,
    Cancelled = 6,
    Defaulted = 7
}

let networkName = "ethereumSepolia";

async function deployLoanTermFactory() {
  const [deployer, borrower, lender] = await hardhat.ethers.getSigners() as SignerWithAddress[];

  console.log(getRouterConfig(networkName).address);
  console.log(LINK_ADDRESSES[networkName]);
  console.log(getRouterConfig(networkName).chainSelector);

  const LoanTermFactoryContract = await ethers.getContractFactory("P2PLoanTermFactory");
  const LoanTermFactory = await LoanTermFactoryContract.deploy(getRouterConfig(networkName).address, LINK_ADDRESSES[networkName], getRouterConfig(networkName).chainSelector);
  await LoanTermFactory.deployed();
  console.log(`P2PLoanTermFactory is deployed to ${LoanTermFactory.address}`);


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
  const MyNFT = await MyNFTContract.deploy();
  await MyNFT.deployed();
  console.log(`MyNFT is deployed to ${MyNFT.address}`);


  return {
    USDToken,
    MyNFT
  };
}


describe('P2P Loan', () => {

    let LoanTermFactory: P2PLoanTermFactory;
    //let deployer: SignerWithAddress;
    let deployer, borrower, lender;

    before(async ()=>{
        ({ LoanTermFactory, deployer, borrower, lender } = await deployLoanTermFactory());
        console.log('Deployer: ', deployer.address);
        console.log('Borrower: ', borrower.address);
        console.log('Lender: ', lender.address);
    });

    //Cancel, failed redemption
    describe('Cross chain Loan', () => {
         let LoanTerm: LoanTerm;
         let USDToken: USDToken;
         let MyNFT: MyNFT;
         let CCIPReceiveTester;

         before(async ()=>{
             ({ USDToken, MyNFT } = await deployToken());
             const CCIPReceiveTesterContract = await ethers.getContractFactory("CCIPReceiveTester");
             CCIPReceiveTester = await CCIPReceiveTesterContract.deploy(LoanTermFactory.address);
             await CCIPReceiveTester.deployed();
             console.log(`CCIPReceiveTester is deployed to ${CCIPReceiveTester.address}`);
         });

         it('create and activate the loan term', async () => {
             let exeNetworkName = "polygonMumbai";
             //set mock factory address of destination chain for testing purpose.
             await LoanTermFactory.updateSourceSender(getRouterConfig(exeNetworkName).chainSelector, LoanTermFactory.address);
             await LoanTermFactory.createLoanTerm(
                                          USDToken.address,
                                          ethers.utils.parseEther("100000"),
                                          SECONDS_IN_A_WEEK * 20, //20 weeks
                                          1000, //10%
                                          borrower.address,
                                          lender.address,
                                          PayFeesIn.Native,
                                          getRouterConfig(exeNetworkName).chainSelector);

             let loanTermsLength = await LoanTermFactory.getLoanTermsLength();
             let loanTermIndex = loanTermsLength - 1;
             let loanTermAddress = await LoanTermFactory.loanTerms(loanTermIndex);
             console.log("Loan Term Address: ", loanTermAddress);
             LoanTerm = await hre.ethers.getContractAt("P2PLoanTerm", loanTermAddress);

             await MyNFT.safeMint(borrower.address);
             let tokenId = await MyNFT.nextTokenId() - 1 ;
             await MyNFT.connect(borrower).approve(LoanTerm.address, tokenId);
             await LoanTerm.connect(borrower).depositNFTCollateral(MyNFT.address, tokenId);
             console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
             expect(await MyNFT.ownerOf(tokenId)).to.equal(LoanTerm.address);

             let transaction = {
                     to: LoanTermFactory.address,
                     value: ethers.utils.parseEther("10") // Convert Ether to Wei
             };
             let tx = await deployer.sendTransaction({to: LoanTermFactory.address,value: ethers.utils.parseEther("10")});
             let receipt = await tx.wait();
             console.log(`Transaction ${receipt.transactionHash} mined in block ${receipt.blockNumber}`);

             await LoanTerm.connect(lender).approveLoanTerm();
             await USDToken.connect(lender).approve(LoanTerm.address, ethers.constants.MaxUint256);
             expect(LoanTerm.connect(lender).lend()).to.be.revertedWith('cannot loan in current status');

         });

         it('ReceiveTest', async () => {
            let exeNetworkName = "polygonMumbai";
            let messageId = ethers.utils.arrayify("0xcc80c859529f7a604f4d24e7eccb1575f65d1cf9a4454ca126d97f2c970d2dc9");
            let sourceChainSelector = getRouterConfig(exeNetworkName).chainSelector;//'16015286601757825753';
            let sourceSender = getRouterConfig(exeNetworkName).address;//"0x21f76DCF80cc2c180B3303dC6D89Cc1eda25AC7f";
            let loanTerm = {
                token: USDToken.address,
                totalAmount: ethers.utils.parseEther("100000"),
                maturityPeriod: SECONDS_IN_A_WEEK * 20, // Replace with actual value
                interestRate: 1000, // Replace with actual value
                borrower: borrower.address,
                lender: lender.address,
                payFeesIn: PayFeesIn.Native // Replace with actual value
            };

            await CCIPReceiveTester.activateLoanTermTest(
                messageId,
                sourceChainSelector,
                sourceSender,
                loanTerm
            );

            await CCIPReceiveTester.notifyRedemptionTest(messageId, sourceChainSelector, sourceSender, LoanTerm.address);


         });


     });



    describe('Normal Lending Flow', () => {
        let LoanTerm: LoanTerm;
        let USDToken: USDToken;
        let MyNFT: MyNFT;

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
                             lender.address,
                             PayFeesIn.Native,
                             getRouterConfig(networkName).chainSelector);

            let loanTermsLength = await LoanTermFactory.getLoanTermsLength();
            let loanTermIndex = loanTermsLength - 1;
            let loanTermAddress = await LoanTermFactory.loanTerms(loanTermIndex);
            console.log("Loan Term Address: ", loanTermAddress);
            LoanTerm = await hre.ethers.getContractAt("P2PLoanTerm", loanTermAddress);

            await MyNFT.safeMint(borrower.address);
            let tokenId = await MyNFT.nextTokenId() - 1 ;
            await MyNFT.connect(borrower).approve(LoanTerm.address, tokenId);
            await LoanTerm.connect(borrower).depositNFTCollateral(MyNFT.address, tokenId);
            console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
            expect(await MyNFT.ownerOf(tokenId)).to.equal(LoanTerm.address);
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


        });

        it('borrower redeem a half of principal and lender claim it', async () => {
            await time.increase(SECONDS_IN_A_WEEK * 5 );
            console.log('Withdrawable principal: ', await LoanTerm.withdrawablePrincipal());
            console.log('Current principal: ', await LoanTerm.currentPrincipal());
            await LoanTerm.connect(borrower).redeemPartialPrincipal(ethers.utils.parseEther("50000"));
            expect(await LoanTerm.withdrawablePrincipal()).to.be.equal(ethers.utils.parseEther("50000"));
            expect(await LoanTerm.currentPrincipal()).to.be.equal(ethers.utils.parseEther("50000"));
            console.log('Withdrawable principal: ', await LoanTerm.withdrawablePrincipal());
            console.log('Claimable Interest: ', await LoanTerm.claimableInterest());
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.BigNumber.from("961538779507529507530"));

            //Claim principal and interest by lender
            await LoanTerm.connect(lender).claimPrincipal();
            console.log('Withdrawable principal: ', await LoanTerm.withdrawablePrincipal());
            expect(await LoanTerm.withdrawablePrincipal()).to.be.equal(ethers.utils.parseEther("0"));
            console.log('Claimable Interest: ', await LoanTerm.claimableInterest());
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.utils.parseEther("0"));
            console.log('Accrued Interest for Borrower: ', await LoanTerm.accruedInterest());
            console.log('USDToken balance of borrower: ', await USDToken.balanceOf(borrower.address));
            expect(await USDToken.balanceOf(borrower.address)).to.be.equal(ethers.BigNumber.from("58763735468813593813595"));
            console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));


        });

        it('redeem in full', async () => {
            await time.increase(SECONDS_IN_A_WEEK * 5 );
            //accrued interest will be half of previous period
            console.log('Claimable Interest: ', await LoanTerm.claimableInterest());
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.BigNumber.from("480769230769230769231"));
            console.log('Accrued Interest for Borrower: ', await LoanTerm.accruedInterest());
            console.log('Paid Interest: ', await LoanTerm.paidInterest());
            console.log('USDToken balance of borrower: ', await USDToken.balanceOf(borrower.address))
            console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
            console.log('NFT', await LoanTerm.collateral());
            let NFT_tokenId = (await LoanTerm.collateral()).tokenId

            await LoanTerm.connect(borrower).redeemFullPrincipal();
            expect(await LoanTerm.status()).to.be.equal(LoanStatus.Redeemed);
            //both principal and interest will be redeemed to contract
            console.log('Accrued Interest for Borrower: ', await LoanTerm.accruedInterest());
            console.log('Paid Interest: ', await LoanTerm.paidInterest());
            // confirm paidInterest == accrued interest. all interest is paid
            expect(await LoanTerm.accruedInterest()).to.be.equal(await LoanTerm.paidInterest());
            expect(await LoanTerm.withdrawablePrincipal()).to.be.equal(ethers.utils.parseEther("50000"));
            console.log('USDToken balance of borrower: ', await USDToken.balanceOf(borrower.address))
            console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
            //NFT is withdrawn
            console.log('NFT', await LoanTerm.collateral());
            console.log('Owner of MyNFT', await MyNFT.ownerOf(NFT_tokenId));
            expect((await LoanTerm.collateral()).owner).to.be.equal(ethers.constants.AddressZero);
            expect(await MyNFT.ownerOf(NFT_tokenId)).to.be.equal(borrower.address);

        });

        it('complete by claim principal', async () => {

            await time.increase(SECONDS_IN_A_DAY * 5 );
            // no additional interest is accrued after full redemption
            expect(await LoanTerm.accruedInterest()).to.be.equal(await LoanTerm.paidInterest());

            console.log('Claimable Interest: ', await LoanTerm.claimableInterest());
            console.log('Withdrawable principal: ', await LoanTerm.withdrawablePrincipal());
            console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
            await LoanTerm.connect(lender).claimPrincipal();
            console.log('Withdrawable principal: ', await LoanTerm.withdrawablePrincipal());
            expect(await LoanTerm.withdrawablePrincipal()).to.be.equal(ethers.utils.parseEther("0"));
            console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
            expect(await USDToken.balanceOf(LoanTerm.address)).to.be.equal(ethers.utils.parseEther("0"));
            console.log('Claimable Interest: ', await LoanTerm.claimableInterest());
            expect(await LoanTerm.claimableInterest()).to.be.equal(ethers.utils.parseEther("0"));

            expect(await LoanTerm.status()).to.be.equal(LoanStatus.Completed);


        });





    });

    //Cancel, failed redemption
    describe('Side Scenario of Lending', () => {
         let LoanTerm: LoanTerm;
         let USDToken: USDToken;
         let MyNFT: MyNFT;

         before(async ()=>{
             ({ USDToken, MyNFT } = await deployToken());
         });

         it('create and activate the loan term', async () => {

             await LoanTermFactory.createLoanTerm(
                                          USDToken.address,
                                          ethers.utils.parseEther("100000"),
                                          SECONDS_IN_A_WEEK * 20, //20 weeks
                                          1000, //10%
                                          borrower.address,
                                          lender.address,
                                          PayFeesIn.Native,
                                          getRouterConfig(networkName).chainSelector);

             let loanTermsLength = await LoanTermFactory.getLoanTermsLength();
             let loanTermIndex = loanTermsLength - 1;
             let loanTermAddress = await LoanTermFactory.loanTerms(loanTermIndex);
             console.log("Loan Term Address: ", loanTermAddress);
             LoanTerm = await hre.ethers.getContractAt("P2PLoanTerm", loanTermAddress);

             await MyNFT.safeMint(borrower.address);
             let tokenId = await MyNFT.nextTokenId() - 1 ;
             await MyNFT.connect(borrower).approve(LoanTerm.address, tokenId);
             await LoanTerm.connect(borrower).depositNFTCollateral(MyNFT.address, tokenId);
             console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
             expect(await MyNFT.ownerOf(tokenId)).to.equal(LoanTerm.address);

             await LoanTerm.connect(lender).approveLoanTerm();
             await USDToken.connect(lender).approve(LoanTerm.address, ethers.constants.MaxUint256);
             await LoanTerm.connect(lender).lend();

         });

         it('Cancel Borrowing', async () => {

             let tokenId = (await LoanTerm.collateral()).tokenId;
             console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
             console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
             console.log('Status: ', await LoanTerm.status());
             await LoanTerm.connect(borrower).cancelBorrowing();
             console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
             expect(await MyNFT.ownerOf(tokenId)).to.equal(borrower.address);
             console.log('USDToken balance of loan contract: ', await USDToken.balanceOf(LoanTerm.address));
             expect(await USDToken.balanceOf(LoanTerm.address)).to.be.equal(ethers.utils.parseEther("0"));
             expect(await LoanTerm.status()).to.be.equal(LoanStatus.Cancelled);

         });

         it('create and activate another loan term', async () => {

              await LoanTermFactory.createLoanTerm(
                                           USDToken.address,
                                           ethers.utils.parseEther("100000"),
                                           SECONDS_IN_A_WEEK * 20, //20 weeks
                                           1000, //10%
                                           borrower.address,
                                           lender.address,
                                           PayFeesIn.Native,
                                           getRouterConfig(networkName).chainSelector);

              let loanTermsLength = await LoanTermFactory.getLoanTermsLength();
              let loanTermIndex = loanTermsLength - 1;
              let loanTermAddress = await LoanTermFactory.loanTerms(loanTermIndex);
              console.log("Loan Term Address: ", loanTermAddress);
              LoanTerm = await hre.ethers.getContractAt("P2PLoanTerm", loanTermAddress);

              await MyNFT.safeMint(borrower.address);
              let tokenId = await MyNFT.nextTokenId() - 1 ;
              await MyNFT.connect(borrower).approve(LoanTerm.address, tokenId);
              await LoanTerm.connect(borrower).depositNFTCollateral(MyNFT.address, tokenId);
              console.log('Owner of MyNFT', await MyNFT.ownerOf(tokenId));
              expect(await MyNFT.ownerOf(tokenId)).to.equal(LoanTerm.address);

              await LoanTerm.connect(lender).approveLoanTerm();
              await USDToken.connect(lender).approve(LoanTerm.address, ethers.constants.MaxUint256);
              await LoanTerm.connect(lender).lend();

              await LoanTerm.connect(borrower).startBorrowing();

         });

         it('Liquidation', async () => {
              await time.increase(SECONDS_IN_A_WEEK * 21 );

              let tokenId = (await LoanTerm.collateral()).tokenId;
              console.log('Owner of MyNFT: ', await MyNFT.ownerOf(tokenId));
              console.log('USDToken balance of borrower: ', await USDToken.balanceOf(borrower.address));
              console.log('Status: ', await LoanTerm.status());

              await LoanTerm.connect(lender).claimPrincipal();
              console.log('Owner of MyNFT: ', await MyNFT.ownerOf(tokenId));
              //expect(await MyNFT.ownerOf(tokenId)).to.equal(deployer.address);
              console.log('USDToken balance of borrower: ', await USDToken.balanceOf(borrower.address));
              //expect(await USDToken.balanceOf(LoanTerm.address)).to.be.equal(ethers.utils.parseEther("0"));
              console.log('Status: ', await LoanTerm.status());
              expect(await LoanTerm.status()).to.be.equal(LoanStatus.Defaulted);

              await LoanTerm.liquidateCollateral();
              console.log('Owner of MyNFT: ', await MyNFT.ownerOf(tokenId));
              expect(await MyNFT.ownerOf(tokenId)).to.equal(deployer.address);


         });



     });









});
