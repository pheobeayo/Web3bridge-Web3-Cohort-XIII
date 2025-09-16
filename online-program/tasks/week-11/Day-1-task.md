# Task: ENS

## Task Instructions
- Deploy ens smart contract
- Interact with all the functions in the ENS contract
- improve the UI, it should not the same as the UI we did during class
- Use all the event in the smart contract in the frontend

### How to get Lisk sepolia test tokens
- Option 1: https://www.l2faucet.com/lisk
- Option 2: You can get sepolia test faucet here https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- After getting the 0.05 Eth, bridge it to Lisk Eth for gas here https://sepolia-bridge.lisk.com/bridge/lisk-sepolia-testnet

## Resources
- [Frontend - ENS dapp](https://github.com/VictoriaAde/ens-dapp-web3bridgeclass)
- [Smart contract - ENS](https://gist.github.com/VictoriaAde/37771c6ca44784872a92dcd4e501d6a2)
- [Install Family ConnectKit and Wagmi](https://docs.family.co/connectkit/getting-started#getting-started-section-1-install) 
- [Install tailwindcss and shadcn](https://ui.shadcn.com/docs/installation/vite)
- [Install ethers](https://docs.ethers.org/v5/getting-started/) 

## Set up Api keys on Reown
- Go to [Reown](https://cloud.reown.com/), sign in or create an account.
- Create a new project and enter the necessary details.
- Select “I am using another kit” since we are using Family ConnectKit.
- Click Create and copy the Project ID.
- Then, navigate to the project directory and create a .env.local and .env.example. It should look like this:
- VITE_REOWN_PROJECT_ID=<your_reown_project_id>
- Replace <your_reown_project_id> with your actual Project ID in the .env file.
- Start the Development Server

## Deadline 
Present your progress on the ENS DApp during the class on Day 2