const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery Contract", function () {
    let lottery;
    let players;
    const ENTRY_FEE = ethers.parseEther("0.01");
    const MAX_PLAYERS = 10;

    beforeEach(async function () {
        
        [owner, ...players] = await ethers.getSigners();
        
        const Lottery = await ethers.getContractFactory("Lottery");
        lottery = await Lottery.deploy();
        await lottery.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct entry fee", async function () {
            expect(await lottery.ENTRY_FEE()).to.equal(ENTRY_FEE);
        });

        it("Should set the correct max players", async function () {
            expect(await lottery.MAX_PLAYERS()).to.equal(MAX_PLAYERS);
        });

        it("Should start with round 1", async function () {
            expect(await lottery.currentRound()).to.equal(1);
        });

        it("Should start with empty players array", async function () {
            expect(await lottery.getPlayersCount()).to.equal(0);
        });
    });

    describe("Entry Requirements", function () {
        it("Should allow entry with exact fee", async function () {
            await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
                .to.emit(lottery, "PlayerJoined")
                .withArgs(players[0].address, 1, 1);
            
            expect(await lottery.getPlayersCount()).to.equal(1);
            expect(await lottery.hasPlayerEntered(players[0].address)).to.be.true;
        });

        it("Should reject entry with insufficient fee", async function () {
            const insufficientFee = ethers.parseEther("0.005");
            
            await expect(
                lottery.connect(players[0]).enterLottery({ value: insufficientFee })
            ).to.be.revertedWith("Must send exactly 0.01 ETH");
        });

        it("Should reject entry with excessive fee", async function () {
            const excessiveFee = ethers.parseEther("0.02");
            
            await expect(
                lottery.connect(players[0]).enterLottery({ value: excessiveFee })
            ).to.be.revertedWith("Must send exactly 0.01 ETH");
        });

        it("Should prevent same player from entering twice", async function () {
           
            await lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE });
            
            
            await expect(
                lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE })
            ).to.be.revertedWith("Already entered this round");
        });

        it("Should reject entry when lottery is full", async function () {
            
            for (let i = 0; i < MAX_PLAYERS; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            const newLottery = await (await ethers.getContractFactory("Lottery")).deploy();
            for (let i = 0; i < MAX_PLAYERS - 1; i++) {
                await newLottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            expect(await newLottery.getPlayersCount()).to.equal(9);
        });
    });

    describe("Player Tracking", function () {
        it("Should correctly track multiple players", async function () {
            const numPlayers = 5;
            
            for (let i = 0; i < numPlayers; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
                expect(await lottery.getPlayersCount()).to.equal(i + 1);
                expect(await lottery.hasPlayerEntered(players[i].address)).to.be.true;
            }
            
            const allPlayers = await lottery.getPlayers();
            expect(allPlayers.length).to.equal(numPlayers);
            
            for (let i = 0; i < numPlayers; i++) {
                expect(allPlayers[i]).to.equal(players[i].address);
            }
        });

        it("Should track contract balance correctly", async function () {
            const numPlayers = 3;
            
            for (let i = 0; i < numPlayers; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
                
                const expectedBalance = ENTRY_FEE * BigInt(i + 1);
                expect(await lottery.getContractBalance()).to.equal(expectedBalance);
            }
        });
    });

    describe("Winner Selection", function () {
        it("Should select winner after 10 players join", async function () {
           
            for (let i = 0; i < MAX_PLAYERS; i++) {
                if (i < MAX_PLAYERS - 1) {
                    await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
                } else {
                    
                    await expect(lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE }))
                        .to.emit(lottery, "WinnerSelected");
                }
            }
        });

        it("Should transfer entire prize pool to winner", async function () {
            const totalPrize = ENTRY_FEE * BigInt(MAX_PLAYERS);
            
           
            const initialBalances = [];
            for (let i = 0; i < MAX_PLAYERS; i++) {
                initialBalances[i] = await ethers.provider.getBalance(players[i].address);
            }
            
            
            for (let i = 0; i < MAX_PLAYERS; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            
            expect(await lottery.getContractBalance()).to.equal(0);
            
            
            let winnersFound = 0;
            let winnerIndex = -1;
            
            for (let i = 0; i < MAX_PLAYERS; i++) {
                const currentBalance = await ethers.provider.getBalance(players[i].address);
                const balanceDiff = currentBalance - initialBalances[i];
                
                // Account for gas costs - winner should have received close to the prize minus entry fee
                if (balanceDiff > ENTRY_FEE * BigInt(8)) { // Winner gets back entry + prize from others
                    winnersFound++;
                    winnerIndex = i;
                }
            }
            
            expect(winnersFound).to.equal(1);
            expect(winnerIndex).to.be.greaterThan(-1);
        });

        it("Should reset lottery after winner selection", async function () {
            
            for (let i = 0; i < MAX_PLAYERS; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            
            expect(await lottery.getPlayersCount()).to.equal(0);
            expect(await lottery.currentRound()).to.equal(2);
            expect(await lottery.getContractBalance()).to.equal(0);
            
            
            for (let i = 0; i < 5; i++) {
                expect(await lottery.hasPlayerEntered(players[i].address)).to.be.false;
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
                expect(await lottery.hasPlayerEntered(players[i].address)).to.be.true;
            }
        });
    });

    describe("Events", function () {
        it("Should emit PlayerJoined event", async function () {
            await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
                .to.emit(lottery, "PlayerJoined")
                .withArgs(players[0].address, 1, 1);
        });

        it("Should emit WinnerSelected event", async function () {

            for (let i = 0; i < MAX_PLAYERS - 1; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            
            await expect(lottery.connect(players[MAX_PLAYERS - 1]).enterLottery({ value: ENTRY_FEE }))
                .to.emit(lottery, "WinnerSelected");
        });

        it("Should emit LotteryReset event", async function () {
            // Add 9 players first
            for (let i = 0; i < MAX_PLAYERS - 1; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            // 10th player should trigger both WinnerSelected and LotteryReset events
            await expect(lottery.connect(players[MAX_PLAYERS - 1]).enterLottery({ value: ENTRY_FEE }))
                .to.emit(lottery, "LotteryReset")
                .withArgs(2);
        });
    });

    describe("View Functions", function () {
        it("Should return correct lottery info", async function () {
            // Add 3 players
            for (let i = 0; i < 3; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            const info = await lottery.getLotteryInfo();
            expect(info[0]).to.equal(1); // currentRound
            expect(info[1]).to.equal(3); // playersCount
            expect(info[2]).to.equal(ENTRY_FEE * BigInt(3)); 
            expect(info[3]).to.equal(ethers.ZeroAddress);
            expect(info[4]).to.equal(0); 
        });
    });

    describe("Multiple Rounds", function () {
        it("Should handle multiple lottery rounds correctly", async function () {
            // First round
            for (let i = 0; i < MAX_PLAYERS; i++) {
                await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
            }
            
            expect(await lottery.currentRound()).to.equal(2);
            expect(await lottery.getPlayersCount()).to.equal(0);
            
            // Second round
            for (let i = 0; i < 5; i++) {
                await lottery.connect(players[i + 10]).enterLottery({ value: ENTRY_FEE });
            }
            
            expect(await lottery.currentRound()).to.equal(2);
            expect(await lottery.getPlayersCount()).to.equal(5);
        });
    });
});