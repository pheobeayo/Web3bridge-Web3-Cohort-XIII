// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract LudoGame {
    // Game constants
    uint8 constant BOARD_SIZE = 52;
    uint8 constant SAFE_POSITIONS = 6; 
    uint8 constant PIECES_PER_PLAYER = 4;
    uint8 constant MAX_PLAYERS = 4;
    uint8 constant MIN_PLAYERS = 2;
    
    // Player colors
    enum Color { NONE, RED, GREEN, BLUE, YELLOW }
    
    // Game states
    enum GameState { WAITING, REGISTERING, PLAYING, FINISHED }
    
    // Player structure
    struct Player {
        address playerAddress;
        string name;
        Color color;
        uint256 score;
        bool isRegistered;
        bool hasStaked;
        uint8[4] piecePositions; 
        uint8 piecesInHome; 
        uint8 piecesFinished; 
    }
    
    // Game structure
    struct Game {
        uint256 gameId;
        address[] players;
        uint8 currentPlayerIndex;
        GameState state;
        uint256 stakeAmount;
        uint256 totalPrize;
        address winner;
        uint256 createdAt;
        uint8 consecutiveSixes;
        bool extraTurn;
    }
    
    // Contract state
    address public owner;
    uint256 public gameCounter;
    uint256 public tokenPrice = 0.01 ether;
    
    // Mappings
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => Player)) public gamePlayers;
    mapping(address => uint256) public playerTokens;
    mapping(address => uint256) public playerTotalScore;
    
    // Events
    event GameCreated(uint256 indexed gameId, address creator);
    event PlayerRegistered(uint256 indexed gameId, address player, string name, Color color);
    event GameStarted(uint256 indexed gameId);
    event DiceRolled(uint256 indexed gameId, address player, uint8 diceValue);
    event PieceMoved(uint256 indexed gameId, address player, uint8 pieceIndex, uint8 newPosition);
    event PlayerFinished(uint256 indexed gameId, address player);
    event GameFinished(uint256 indexed gameId, address winner, uint256 prize);
    event TokensPurchased(address buyer, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier gameExists(uint256 _gameId) {
        require(_gameId < gameCounter, "Game does not exist");
        _;
    }
    
    modifier isPlayerInGame(uint256 _gameId) {
        require(gamePlayers[_gameId][msg.sender].isRegistered, "Player not registered in this game");
        _;
    }
    
    modifier isCurrentPlayer(uint256 _gameId) {
        require(games[_gameId].players[games[_gameId].currentPlayerIndex] == msg.sender, "Not your turn");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Token functions
    function purchaseTokens() external payable {
        require(msg.value > 0, "Must send ETH to purchase tokens");
        uint256 tokensToBuy = msg.value / tokenPrice;
        require(tokensToBuy > 0, "Insufficient ETH for tokens");
        
        playerTokens[msg.sender] += tokensToBuy;
        
        // Return excess ETH
        uint256 excess = msg.value - (tokensToBuy * tokenPrice);
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit TokensPurchased(msg.sender, tokensToBuy);
    }
    
    function getPlayerTokens(address _player) external view returns (uint256) {
        return playerTokens[_player];
    }
    
    // Game creation and registration
    function createGame(uint256 _stakeAmount) external returns (uint256) {
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        require(playerTokens[msg.sender] >= _stakeAmount, "Insufficient tokens");
        
        uint256 gameId = gameCounter++;
        
        games[gameId] = Game({
            gameId: gameId,
            players: new address[](0),
            currentPlayerIndex: 0,
            state: GameState.REGISTERING,
            stakeAmount: _stakeAmount,
            totalPrize: 0,
            winner: address(0),
            createdAt: block.timestamp,
            consecutiveSixes: 0,
            extraTurn: false
        });
        
        emit GameCreated(gameId, msg.sender);
        return gameId;
    }
    
    function registerPlayer(uint256 _gameId, string memory _name, Color _color) 
        external gameExists(_gameId) {
        require(games[_gameId].state == GameState.REGISTERING, "Game not in registration phase");
        require(games[_gameId].players.length < MAX_PLAYERS, "Game is full");
        require(!gamePlayers[_gameId][msg.sender].isRegistered, "Already registered");
        require(_color != Color.NONE, "Invalid color");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(playerTokens[msg.sender] >= games[_gameId].stakeAmount, "Insufficient tokens");
        
        // Check if color is already taken
        for (uint i = 0; i < games[_gameId].players.length; i++) {
            require(gamePlayers[_gameId][games[_gameId].players[i]].color != _color, "Color already taken");
        }
        
        // Register player
        games[_gameId].players.push(msg.sender);
        
        gamePlayers[_gameId][msg.sender] = Player({
            playerAddress: msg.sender,
            name: _name,
            color: _color,
            score: 0,
            isRegistered: true,
            hasStaked: false,
            piecePositions: [0, 0, 0, 0],
            piecesInHome: 4,
            piecesFinished: 0
        });
        
        emit PlayerRegistered(_gameId, msg.sender, _name, _color);
    }
    
    function stakeTokens(uint256 _gameId) external gameExists(_gameId) isPlayerInGame(_gameId) {
        require(!gamePlayers[_gameId][msg.sender].hasStaked, "Already staked");
        require(playerTokens[msg.sender] >= games[_gameId].stakeAmount, "Insufficient tokens");
        
        playerTokens[msg.sender] -= games[_gameId].stakeAmount;
        games[_gameId].totalPrize += games[_gameId].stakeAmount;
        gamePlayers[_gameId][msg.sender].hasStaked = true;
        
        // Check if all players have staked and start game
        if (_allPlayersStaked(_gameId) && games[_gameId].players.length >= MIN_PLAYERS) {
            games[_gameId].state = GameState.PLAYING;
            emit GameStarted(_gameId);
        }
    }
    
    function _allPlayersStaked(uint256 _gameId) private view returns (bool) {
        for (uint i = 0; i < games[_gameId].players.length; i++) {
            if (!gamePlayers[_gameId][games[_gameId].players[i]].hasStaked) {
                return false;
            }
        }
        return true;
    }
    
    // Dice rolling algorithm
    function rollDice(uint256 _gameId) external gameExists(_gameId) isPlayerInGame(_gameId) isCurrentPlayer(_gameId) returns (uint8) {
        require(games[_gameId].state == GameState.PLAYING, "Game not active");
        
        // Simple but effective random number generation
        uint8 diceValue = uint8((uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            _gameId,
            block.number
        ))) % 6) + 1);
        
        emit DiceRolled(_gameId, msg.sender, diceValue);
        
        // Handle consecutive sixes
        if (diceValue == 6) {
            games[_gameId].consecutiveSixes++;
            games[_gameId].extraTurn = true;
            
            // Three consecutive sixes = lose turn
            if (games[_gameId].consecutiveSixes >= 3) {
                games[_gameId].consecutiveSixes = 0;
                games[_gameId].extraTurn = false;
                _nextPlayer(_gameId);
            }
        } else {
            games[_gameId].consecutiveSixes = 0;
            games[_gameId].extraTurn = false;
        }
        
        return diceValue;
    }
    
    // Move piece logic
    function movePiece(uint256 _gameId, uint8 _pieceIndex, uint8 _diceValue) 
        external gameExists(_gameId) isPlayerInGame(_gameId) isCurrentPlayer(_gameId) {
        require(_pieceIndex < 4, "Invalid piece index");
        require(_diceValue >= 1 && _diceValue <= 6, "Invalid dice value");
        require(games[_gameId].state == GameState.PLAYING, "Game not active");
        
        Player storage player = gamePlayers[_gameId][msg.sender];
        uint8 currentPosition = player.piecePositions[_pieceIndex];
        
        // Can only move out of home with a 6
        if (currentPosition == 0 && _diceValue != 6) {
            revert("Need 6 to move out of home");
        }
        
        uint8 newPosition;
        
        if (currentPosition == 0) {
            // Moving out of home
            newPosition = getStartingPosition(player.color);
            player.piecesInHome--;
        } else if (currentPosition >= 53) {
            // In safe zone
            newPosition = currentPosition + _diceValue;
            require(newPosition <= 58, "Cannot move past finish line");
        } else {
            // On main board
            newPosition = _calculateNewPosition(currentPosition, _diceValue, player.color);
        }
        
        // Check if piece reaches finish
        if (newPosition == 58) {
            player.piecesFinished++;
            player.score += 10; // Bonus points for finishing a piece
            
            // Check if player finished all pieces
            if (player.piecesFinished == 4) {
                _finishGame(_gameId, msg.sender);
                return;
            }
        }
        
        player.piecePositions[_pieceIndex] = newPosition;
        emit PieceMoved(_gameId, msg.sender, _pieceIndex, newPosition);
        
        // Next turn unless rolled a 6
        if (!games[_gameId].extraTurn) {
            _nextPlayer(_gameId);
        }
    }
    
    function _calculateNewPosition(uint8 _currentPos, uint8 _diceValue, Color _color) private pure returns (uint8) {
        uint8 newPos = _currentPos + _diceValue;
        
        // Check if entering safe zone
        uint8 safeZoneStart = getSafeZoneStart(_color);
        
        if (_currentPos < safeZoneStart && newPos >= safeZoneStart) {
            return 53 + (newPos - safeZoneStart);
        }
        
        // Wrap around the board
        if (newPos > BOARD_SIZE) {
            newPos = newPos - BOARD_SIZE;
        }
        
        return newPos;
    }
    
    function getStartingPosition(Color _color) public pure returns (uint8) {
        if (_color == Color.RED) return 1;
        if (_color == Color.GREEN) return 14;
        if (_color == Color.BLUE) return 27;
        if (_color == Color.YELLOW) return 40;
        return 0;
    }
    
    function getSafeZoneStart(Color _color) public pure returns (uint8) {
        if (_color == Color.RED) return 51;
        if (_color == Color.GREEN) return 12;
        if (_color == Color.BLUE) return 25;
        if (_color == Color.YELLOW) return 38;
        return 0;
    }
    
    function _nextPlayer(uint256 _gameId) private {
        games[_gameId].currentPlayerIndex = (games[_gameId].currentPlayerIndex + 1) % games[_gameId].players.length;
        games[_gameId].extraTurn = false;
    }
    
    function _finishGame(uint256 _gameId, address _winner) private {
        games[_gameId].state = GameState.FINISHED;
        games[_gameId].winner = _winner;
        
        // Award prize to winner
        uint256 prize = games[_gameId].totalPrize;
        playerTokens[_winner] += prize;
        playerTotalScore[_winner] += gamePlayers[_gameId][_winner].score;
        
        emit PlayerFinished(_gameId, _winner);
        emit GameFinished(_gameId, _winner, prize);
    }
    
    // View functions
    function getGame(uint256 _gameId) external view gameExists(_gameId) returns (Game memory) {
        return games[_gameId];
    }
    
    function getPlayer(uint256 _gameId, address _playerAddress) 
        external view gameExists(_gameId) returns (Player memory) {
        return gamePlayers[_gameId][_playerAddress];
    }
    
    function getGamePlayers(uint256 _gameId) external view gameExists(_gameId) returns (address[] memory) {
        return games[_gameId].players;
    }
    
    function getCurrentPlayer(uint256 _gameId) external view gameExists(_gameId) returns (address) {
        if (games[_gameId].players.length == 0) return address(0);
        return games[_gameId].players[games[_gameId].currentPlayerIndex];
    }
    
    // Admin functions
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        tokenPrice = _newPrice;
    }
    
    // Emergency functions
    function cancelGame(uint256 _gameId) external gameExists(_gameId) {
        require(games[_gameId].state == GameState.REGISTERING, "Can only cancel during registration");
        require(block.timestamp > games[_gameId].createdAt + 1 hours, "Must wait 1 hour before cancelling");
        
        // Refund all staked players
        for (uint i = 0; i < games[_gameId].players.length; i++) {
            address player = games[_gameId].players[i];
            if (gamePlayers[_gameId][player].hasStaked) {
                playerTokens[player] += games[_gameId].stakeAmount;
            }
        }
        
        games[_gameId].state = GameState.FINISHED;
    }
}