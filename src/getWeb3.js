import Web3 from 'web3';

let web3Instance;

const getWeb3 = () =>
  new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    //window.addEventListener("load", async () => {
      //Modern dapp browsers...
      if (window.ethereum) {
        web3Instance = web3Instance || new Web3(window.ethereum);
        // Request account access if needed
        resolve(web3Instance);
        //window.ethereum.enable()
          //.then(_ => resolve(web3Instance))
          //.catch(err => reject(err))
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        // Use Mist/MetaMask's provider.
        const web3 = window.web3;
        console.log("Injected web3 detected.");
        resolve(web3);
      }
      // Fallback to localhost; use dev console port by default...
      else {
        const provider = new Web3.providers.WebsocketProvider(
          "ws://127.0.0.1:8545"
        );
        const web3 = new Web3(provider);
        console.log("No web3 instance injected, using Local web3.");
        resolve(web3);
      }
    //});
  });

export default getWeb3;

