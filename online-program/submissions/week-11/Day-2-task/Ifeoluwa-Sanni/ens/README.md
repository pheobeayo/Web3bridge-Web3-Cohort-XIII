# ENS - Minimalist Ethereum Name Service

Welcome to ENS, a minimalist Ethereum Name Service application that allows users to register, update, and manage their digital identities on-chain. This project provides a clean, responsive, and user-friendly interface for interacting with the Ethereum Name Service smart contracts and blockchain events.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

ENS is designed to offer a simple and transparent way to manage on-chain identities. With this project, users can:
- Connect their wallet and automatically switch to the appropriate network (Celo Alfajores Testnet).
- View recent events related to name registration, transfer, and updates.
- Get detailed logs and block information directly from the blockchain.

The application leverages modern web3 tools to provide a seamless experience while ensuring that the UI remains visually appealing and fully responsive.

## Features

- **Wallet Connectivity:** Easily connect your wallet using ConnectKit and manage your addresses with wagmi.
- **Network Auto-Switch:** Automatically switch to the Celo Alfajores Testnet upon wallet connection (persisted with cookies until disconnection).
- **Event Monitoring:** Listen to Name Service events (registration, transfer, and update) via blockchain logs and display them in a user-friendly list.
- **Responsive Design:** The UI is built with Tailwind CSS, ensuring a responsive and visually appealing experience across different devices.
- **Real-time Feedback:** Loading states, error handling, and toast notifications provide instant feedback for better user interaction.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Blockchain Interaction:** wagmi, viem
- **Wallet Integration:** ConnectKit
- **Data Fetching & Caching:** React Query (@tanstack/react-query)
- **Utilities:** typescript-cookie for cookie management, lucide-react for icons

## Project Structure

```
ens/
│
├── dist/                         # Build output directory
├── node_modules/                 # npm dependencies
├── public/                       # Static assets (images, icons, etc.)
├── src/                          # Source code
│   ├── components/               # UI components
│   │   ├── layout/               # Layout components (e.g., Header, Hero section)
│   │   ├── recent-activity.tsx   # Component to display recent activity logs
│   │   └── wallet/               # Wallet connection and management UI
│   │
│   ├── hooks/                    # Custom React hooks (e.g., useENSevents for blockchain events)
│   ├── lib/                      # Utility libraries and configuration (e.g., chain-utils, config)
│   ├── routes/                   # Route definitions for the application
│   └── styles/                   # Global and component-specific styles
│
├── .gitignore                    # Git configuration
├── package.json                  # Project metadata and dependencies
├── README.md                     # This file
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # Vite configuration
```

## Installation & Setup

1. **Clone the repository:**

   ```
   git clone https://github.com/jvcByte/ens.git
   cd ens
   ```

2. **Install dependencies:**

   ```
   pnpm i
   ```

3. **Set Environment Variables:**

   - Rename the `.env.example` file in the root directory to `.env`.
   - Add `VITE_WALLETCONNECT_PROJECT_ID` for wallect actions.

4. **Run the development server:**

   ```
   pnpm dev
   ```

   The application should now be running at `http://localhost:5173` (or your configured port).

## Usage

- **Wallet Connection:** Use the wallet connection button to connect your wallet. On connection, if you are not on the Celo Alfajores Testnet, the app will automatically switch networks and persist this switch using cookies until you disconnect.
- **Recent Activities:** Navigate to the "Recent Activities" page to view the latest events regarding name registration, transfer, and updates. Each event displays crucial details such as block number, transaction hash, and a short description.
- **Blockchain Interaction:** The application listens to blockchain logs using custom hooks (`useENSevents`) and sorts them by relevance for display.

## Development

- **Custom Hooks:** Check the `src/hooks` directory for hooks that abstract blockchain event fetching (`useENSevents`).
- **UI Components:** The UI is built with modular components under `src/components`. Pay attention to the responsive designs and Tailwind CSS classes.
- **State Management:** React Query is used for fetching and caching data, ensuring smooth interactions and up-to-date blockchain events.
- **Network Configuration:** Chain and network configurations are managed in `src/lib/chain-utils.tsx` and `src/lib/config.ts` for easy customization.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Ensure your code follows our coding standards and passes all linting and type checks.
4. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Happy coding and thank you for using ENS! #jvcByte
