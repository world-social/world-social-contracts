import  hre  from "hardhat";
import { expect } from "chai";
import { WorldSocialToken } from "../typechain-types";

describe("WorldSocialToken", function () {
  let token: WorldSocialToken;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    const TokenFactory = await hre.ethers.getContractFactory("WorldSocialToken");
    token = (await TokenFactory.deploy()) as WorldSocialToken;
    await token.waitForDeployment();
  });

  it("should deploy with the correct initial supply", async function () {
    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(owner.address);
    expect(totalSupply).to.equal(ownerBalance);
  });

  it("should allow owner to register a creator", async function () {
    await token.registerCreator(addr1.address);
    const isCreator = await token.isContentCreator(addr1.address);
    expect(isCreator).to.be.true;
  });

  it("should revert if non-owner tries to register a creator", async function () {
    await expect(
      token.connect(addr1).registerCreator(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should reward a registered creator correctly", async function () {
    // Register addr1 as a content creator
    await token.registerCreator(addr1.address);

    // Reward creator with an amount
    const rewardAmount = utils.parseEther("100"); // 100 tokens
    await token.rewardCreator(addr1.address, rewardAmount);

    // Expect the reward to be 70% of the provided amount
    const expectedReward = rewardAmount.mul(70).div(100);
    const creatorReward = await token.creatorRewards(addr1.address);
    expect(creatorReward).to.equal(expectedReward);

    // Check that addr1's balance increased accordingly
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(expectedReward);
  });

  it("should reward a viewer correctly", async function () {
    const rewardAmount = utils.parseEther("100"); // 100 tokens
    await token.rewardViewer(addr2.address, rewardAmount);

    // Expect the viewer reward to be 30% of the provided amount
    const expectedReward = rewardAmount.mul(30).div(100);
    const viewerReward = await token.viewerRewards(addr2.address);
    expect(viewerReward).to.equal(expectedReward);

    // Check that addr2's balance increased accordingly
    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(expectedReward);
  });

  // Example: A basic check for permit functionality.
  // Testing permit fully requires generating a valid signature off-chain.
  // This test is just a skeleton to illustrate how you might start testing ERC20Permit.
  it("should allow a permit approval (skeleton test)", async function () {
    // The permit function allows a spender to be approved by a signature.
    // Here, we will build a permit message for addr1 approving addr2 to spend tokens on its behalf.
    const value = utils.parseEther("10");
    const nonce = await token.nonces(addr1.address);
    const deadline = constants.MaxUint256;

    // EIP-2612 domain separator and struct hash must be calculated.
    // For a full test, use ethers.js _signTypedData functionality:
    const domain = {
      name: "WorldSocial Token",
      version: "1",
      chainId: (await hre.ethers.provider.getNetwork()).chainId,
      verifyingContract: (token as any).address,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: addr1.address,
      spender: addr2.address,
      value,
      nonce: Number(nonce),
      deadline,
    };

    // Sign the permit message with addr1's signer
    const signature = await addr1._signTypedData(domain, types, message);
    const { v, r, s } = utils.splitSignature(signature);

    // Now call the permit function from any account (we'll use addr2)
    await token.connect(addr2).permit(addr1.address, addr2.address, value, deadline, v, r, s);

    // Verify that allowance was set correctly
    const allowance = await token.allowance(addr1.address, addr2.address);
    expect(allowance).to.equal(value);
  });
});
