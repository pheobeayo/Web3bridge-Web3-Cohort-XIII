// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


contract Lottery {
    
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant MAX_PLAYERS = 10;
    
    address[] public players;
    mapping(address => bool) public hasEntered;
    uint256 public currentRound;
    address public lastWinner;
    uint256 public lastPrizeAmount;
    
    
    event PlayerJoined(address indexed player, uint256 round, uint256 playerCount);
    event WinnerSelected(address indexed winner, uint256 prizeAmount, uint256 round);
    event LotteryReset(uint256 newRound);
    
    
    modifier onlyValidEntry() {
        require(msg.value == ENTRY_FEE, "Must send exactly 0.01 ETH");
        require(!hasEntered[msg.sender], "Already entered this round");
        require(players.length < MAX_PLAYERS, "Lottery is full");
        _;
    }
    

    constructor() {
        currentRound = 1;
    }
    
    //function to enter the lottery
    function enterLottery() external payable onlyValidEntry {
        // Add player to the list
        players.push(msg.sender);
        hasEntered[msg.sender] = true;
        
        emit PlayerJoined(msg.sender, currentRound, players.length);
        
        // Check if we have enough players to select a winner
        if (players.length == MAX_PLAYERS) {
            _selectWinner();
        }
    }
    
    //function to select a winner
    function _selectWinner() internal {
        require(players.length == MAX_PLAYERS, "Not enough players");
        
        // Generate pseudo-random number (Note: Not truly random in production)
        uint256 randomIndex = _generateRandomNumber() % players.length;
        address winner = players[randomIndex];
        
        // Calculate prize (entire balance)
        uint256 prizeAmount = address(this).balance;
        
        // Store winner info before reset
        lastWinner = winner;
        lastPrizeAmount = prizeAmount;
        
        emit WinnerSelected(winner, prizeAmount, currentRound);
        
        // Transfer prize to winner
        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Transfer failed");
        
        // Reset lottery for next round
        _resetLottery();
    }
    
    //function to generate a pseudo-random number
    function _generateRandomNumber() internal view returns (uint256) {
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    blockhash(block.number - 1),
                    players.length,
                    msg.sender
                )
            )
        );
    }
    
    function _resetLottery() internal {
        // Clear players array
        for (uint256 i = 0; i < players.length; i++) {
            hasEntered[players[i]] = false;
        }
        delete players;
        
        // Increment round
        currentRound++;
        
        emit LotteryReset(currentRound);
    }
    
    // getfunctions to retrieve information
    function getPlayersCount() external view returns (uint256) {
        return players.length;
    }
    
    function getPlayers() external view returns (address[] memory) {
        return players;
    }
    
   
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
   
    function hasPlayerEntered(address player) external view returns (bool) {
        return hasEntered[player];
    }
    
    function getLastWinner() external view returns (address) {
        return lastWinner;
    }
    function getLotteryInfo() external view returns (
        uint256 _currentRound,
        uint256 _playersCount,
        uint256 _prizePool,
        address _lastWinner,
        uint256 _lastPrizeAmount
    ) {
        return (
            currentRound,
            players.length,
            address(this).balance,
            lastWinner,
            lastPrizeAmount
        );
    }
}