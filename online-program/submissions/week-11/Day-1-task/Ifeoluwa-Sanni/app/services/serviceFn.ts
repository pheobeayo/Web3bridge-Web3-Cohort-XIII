import { Contract } from "ethers";
import { ensureEthereumAvailable, getENSContract } from ".";
import { handleErrorMessage } from "@/utils/utils";

export const getNameAvailable = async (name: string): Promise<boolean> => {
    await ensureEthereumAvailable();

    try {
        const contract: Contract = await getENSContract();
        const isAvailable: boolean = await contract.isNameAvailable(name);

        return isAvailable;
    } catch(error) {
        handleErrorMessage(error);
        throw error;
    }
}

export const registerName = async (name: string, imageHash: string, targetAddr: string) => {
    await ensureEthereumAvailable();

    try {
        const contract: Contract = await getENSContract();
        const tx = await contract.registerName(name, imageHash, targetAddr);
        await tx.wait();

        return tx;
    } catch(error) {
        handleErrorMessage(error);
        throw error;
    }
}

export const getNamesOwned = async (owner: string): Promise<string[]> => {
    await ensureEthereumAvailable();

    try {
        const contract: Contract = await getENSContract();
        const names: string[] = await contract.getNamesOwnedBy(owner);

        return names;
    } catch(error) {
        handleErrorMessage(error);
        throw error;
    }
}

