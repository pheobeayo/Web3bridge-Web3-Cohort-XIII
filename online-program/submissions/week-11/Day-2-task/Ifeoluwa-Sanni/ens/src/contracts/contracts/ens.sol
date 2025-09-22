// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ENS {
    // Events
    event NameRegistered(
        string indexed name,
        address indexed owner,
        string imageHash
    );
    event NameUpdated(
        string indexed name,
        address indexed newAddress,
        string newImageHash
    );
    event NameTransferred(
        string indexed name,
        address indexed oldOwner,
        address indexed newOwner
    );

    // Structs
    struct NameRecord {
        address owner;
        address resolvedAddress;
        string imageHash; // IPFS hash from Pinata
        uint256 registrationTime;
        bool exists;
    }

    // State variables
    mapping(string => NameRecord) public nameRecords;
    mapping(address => string[]) public ownerToNames;

    address public contractOwner;

    // Modifiers
    modifier onlyNameOwner(string memory name) {
        require(nameRecords[name].exists, "Name does not exist");
        require(nameRecords[name].owner == msg.sender, "Not the name owner");
        _;
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not the contract owner");
        _;
    }

    modifier validName(string memory name) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(name).length <= 64, "Name too long");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    /**
     * @dev Register a new name with image and address
     * @param name The name to register (e.g., "alice")
     * @param imageHash IPFS hash of the image from Pinata
     * @param targetAddress The Ethereum address to resolve to
     */
    function registerName(
        string memory name,
        string memory imageHash,
        address targetAddress
    ) external validName(name) {
        require(!nameRecords[name].exists, "Name already registered");
        require(targetAddress != address(0), "Invalid target address");
        require(bytes(imageHash).length > 0, "Image hash cannot be empty");

        // Create the name record
        nameRecords[name] = NameRecord({
            owner: msg.sender,
            resolvedAddress: targetAddress,
            imageHash: imageHash,
            registrationTime: block.timestamp,
            exists: true
        });

        // Add to owner's list of names
        ownerToNames[msg.sender].push(name);

        emit NameRegistered(name, msg.sender, imageHash);
    }

    /**
     * @dev Update the resolved address for a name
     * @param name The name to update
     * @param newAddress The new address to resolve to
     */
    function updateAddress(
        string memory name,
        address newAddress
    ) external onlyNameOwner(name) {
        require(newAddress != address(0), "Invalid address");

        nameRecords[name].resolvedAddress = newAddress;
        emit NameUpdated(name, newAddress, nameRecords[name].imageHash);
    }

    /**
     * @dev Update the image hash for a name
     * @param name The name to update
     * @param newImageHash The new IPFS hash
     */
    function updateImage(
        string memory name,
        string memory newImageHash
    ) external onlyNameOwner(name) {
        require(bytes(newImageHash).length > 0, "Image hash cannot be empty");

        nameRecords[name].imageHash = newImageHash;
        emit NameUpdated(name, nameRecords[name].resolvedAddress, newImageHash);
    }

    /**
     * @dev Transfer ownership of a name
     * @param name The name to transfer
     * @param newOwner The new owner address
     */
    function transferName(
        string memory name,
        address newOwner
    ) external onlyNameOwner(name) {
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != nameRecords[name].owner, "Already the owner");

        address oldOwner = nameRecords[name].owner;
        nameRecords[name].owner = newOwner;

        // Remove from old owner's list
        _removeNameFromOwner(oldOwner, name);

        // Add to new owner's list
        ownerToNames[newOwner].push(name);

        emit NameTransferred(name, oldOwner, newOwner);
    }

    /**
     * @dev Resolve a name to get all associated data
     * @param name The name to resolve
     * @return owner The owner of the name
     * @return resolvedAddress The address the name resolves to
     * @return imageHash The IPFS hash of the associated image
     * @return registrationTime When the name was registered
     */
    function resolveName(
        string memory name
    )
        external
        view
        returns (
            address owner,
            address resolvedAddress,
            string memory imageHash,
            uint256 registrationTime
        )
    {
        require(nameRecords[name].exists, "Name does not exist");

        NameRecord memory record = nameRecords[name];
        return (
            record.owner,
            record.resolvedAddress,
            record.imageHash,
            record.registrationTime
        );
    }

    /**
     * @dev Check if a name is available for registration
     * @param name The name to check
     * @return available True if the name is available
     */
    function isNameAvailable(
        string memory name
    ) external view returns (bool available) {
        return !nameRecords[name].exists;
    }

    /**
     * @dev Get all names owned by an address
     * @param owner The owner address
     * @return names Array of names owned by the address
     */
    function getNamesOwnedBy(
        address owner
    ) external view returns (string[] memory names) {
        return ownerToNames[owner];
    }

    /**
     * @dev Internal function to remove a name from an owner's list
     * @param owner The owner address
     * @param name The name to remove
     */
    function _removeNameFromOwner(address owner, string memory name) internal {
        string[] storage names = ownerToNames[owner];
        for (uint256 i = 0; i < names.length; i++) {
            if (keccak256(bytes(names[i])) == keccak256(bytes(name))) {
                names[i] = names[names.length - 1];
                names.pop();
                break;
            }
        }
    }
}
