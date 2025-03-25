import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
// Adjust the import path to where your WorldSocialToken type is generated:
import type { WST } from "../typechain-types/contracts/WST";

const { utils, constants } = ethers;

describe("WST Contract", function () {
  let wst: WST;
  let owner: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let user: SignerWithAddress;
  let worldID: any;
  
  const appId = "test_app";
  const actionId = "test_action";
  const defaultAmountPerMint = utils.parseEther("10");
  const defaultWaitBetweenMints = 3600; // 1 hour

  // Mock World ID proof parameters
  const mockProof = new Array(8).fill(ethers.BigNumber.from(1));
  const mockRoot = ethers.BigNumber.from(123456);
  const mockNullifierHash = ethers.BigNumber.from(789012);

  beforeEach(async function () {
    // Get signers
    [owner, backendSigner, user] = await ethers.getSigners();

    // Deploy mock World ID contract
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    worldID = await MockWorldID.deploy();
    await worldID.deployed();

    // Deploy WST Contract
    const WSTFactory = await ethers.getContractFactory("WST");
    wst = (await WSTFactory.deploy(
      owner.address,
      backendSigner.address,
      worldID.address,
      appId,
      actionId,
      defaultAmountPerMint,
      defaultWaitBetweenMints
    )) as WST;
    await wst.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct initial parameters", async function () {
      expect(await wst.owner()).to.equal(owner.address);
      expect(await wst.backendSigner()).to.equal(backendSigner.address);
      expect(await wst.amountPerMint()).to.equal(defaultAmountPerMint);
      expect(await wst.waitBetweenMints()).to.equal(defaultWaitBetweenMints);
    });
  });

  describe("Minting", function () {
    let signature: string;
    
    beforeEach(async function () {
      // Create signature from backend signer
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [user.address, mockNullifierHash]
      );
      const ethSignedHash = ethers.utils.arrayify(
        ethers.utils.hashMessage(ethers.utils.arrayify(messageHash))
      );
      signature = await backendSigner.signMessage(ethSignedHash);
    });

    it("Should allow minting with valid proof and signature", async function () {
      // Set the mock proof verification to true
      await worldID.setMockVerifyProof(true);

      const initialBalance = await wst.balanceOf(user.address);
      
      await expect(
          wst.connect(user).mint(
              mockRoot,
              mockNullifierHash,
              mockProof,
              signature
          )
      ).to.emit(wst, "Minted")
       .withArgs(user.address, defaultAmountPerMint);

      const finalBalance = await wst.balanceOf(user.address);
      expect(finalBalance).to.equal(initialBalance.add(defaultAmountPerMint));
    });

    it("Should revert if not enough time has passed between mints", async function () {
      // Set the mock proof verification to true
      await worldID.setMockVerifyProof(true);

      // First mint
      await wst.connect(user).mint(
          mockRoot,
          mockNullifierHash,
          mockProof,
          signature
      );

      // Attempt to mint again immediately
      await expect(
          wst.connect(user).mint(
              mockRoot,
              mockNullifierHash,
              mockProof,
              signature
          )
      ).to.be.revertedWith("WST__NotEnoughTimeHasPassed");
    });

    it("Should revert with invalid signature", async function () {
      // Use a different signer for signature
      const signers = await ethers.getSigners();
      const wrongSigner = signers[3];
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [user.address, mockNullifierHash]
      );
      const ethSignedHash = ethers.utils.arrayify(
        ethers.utils.hashMessage(ethers.utils.arrayify(messageHash))
      );
      const wrongSignature = await wrongSigner.signMessage(ethSignedHash);

      await expect(
          wst.connect(user).mint(
              mockRoot,
              mockNullifierHash,
              mockProof,
              wrongSignature
          )
      ).to.be.revertedWith("WST__InvalidSignature");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update backend signer", async function () {
      const signers = await ethers.getSigners();
      const newSigner = signers[3];

      await expect(wst.connect(owner).setBackendSigner(newSigner.address))
          .to.emit(wst, "BackendSignerUpdated")
          .withArgs(backendSigner.address, newSigner.address);

      expect(await wst.backendSigner()).to.equal(newSigner.address);
    });

    it("Should allow owner to update amount per mint", async function () {
      const newAmount = utils.parseEther("20");

      await expect(wst.connect(owner).setAmountPerMint(newAmount))
          .to.emit(wst, "AmountPerMintUpdated")
          .withArgs(defaultAmountPerMint, newAmount);

      expect(await wst.amountPerMint()).to.equal(newAmount);
    });

    it("Should allow owner to update wait between mints", async function () {
      const newWaitTime = 7200; // 2 hours

      await expect(wst.connect(owner).setWaitBetweenMints(newWaitTime))
          .to.emit(wst, "WaitBetweenMintsUpdated")
          .withArgs(defaultWaitBetweenMints, newWaitTime);

      expect(await wst.waitBetweenMints()).to.equal(newWaitTime);
    });

    it("Should revert if non-owner tries to update parameters", async function () {
      const signers = await ethers.getSigners();
      const newSigner = signers[3];

      await expect(
          wst.connect(user).setBackendSigner(newSigner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
          wst.connect(user).setAmountPerMint(utils.parseEther("20"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
          wst.connect(user).setWaitBetweenMints(7200)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
