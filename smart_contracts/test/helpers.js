/*
The function creates a wallet
for a given client and establishes
a connection to the passed as
arguments contract address with
his abi
*/
exports.loadContractToClient = function(client, provider,contractAddress, abi) {
    let clientWallet = new ethers.Wallet(client.secretKey, provider);
    let clientContract = new ethers.Contract(contractAddress, abi, clientWallet);

    return clientContract;
}

/*

*/
exports.getTransactionEventLogs = function(transactionReceipt, contract, eventName) {
    let isEventEmitted = utils.hasEvent(transactionReceipt, contract, eventName);
    let logs = utils.parseLogs(transactionReceipt, contract, eventName);

    return {isEventEmitted: isEventEmitted, logs: logs};
}
