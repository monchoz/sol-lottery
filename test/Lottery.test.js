const assert = require("assert"); // testing library assertions
const ganache = require("ganache-cli"); // local test network
const { beforeEach } = require("mocha");
const Web3 = require("web3"); // Capital W since this is a constructor
const web3 = new Web3(ganache.provider()); // define new instance of Web3 passing the provider to connect any given network

const { abi, evm } = require("../compile"); // require the ABI (interface) and compiled code (bytecode) objects of our contract

let lottery;
let accounts;

beforeEach(async () => {
  // get a list of all available test accounts
  accounts = await web3.eth.getAccounts();
  // deploy an instance of our contract
  lottery = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object })
    .send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract", () => {
  // verify our contract was successfully deploy to the local network
  it("deploys a contract", () => {
    // verifying the existance of an address is a proof of deployment
    assert.ok(lottery.options.address);
  });
  // assert a player's address appears in the players array
  it("allows one account to enter", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.02", "ether"),
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length);
  });
  // assert multiple player's addresses appears in the players array
  it("allows multiple accounts to enter", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.02", "ether"),
    });

    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });

    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei("0.02", "ether"),
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length);
  });
  // test that validates if the entering account provides the accepable amount of ether
  it("requires a minimum amount of ether to enter", async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: 200,
      });
      assert(false);
    } catch (error) {
      assert(error);
    }
  });
  // test restricted access when calling the function to pick a winner
  it("only manager can call pickWinner", async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1],
      });
      assert(false);
    } catch (error) {
      assert(error);
    }
  });
  // test founds retrievement to winner
  it("sends money to the winner and resets the players array", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("2", "ether"),
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initialBalance;
    // 1.8 is an approximate value since we just spent gas by modifiying blockchain data
    assert(difference > web3.utils.toWei("1.8", "ether"));
  });
});
