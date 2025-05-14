const { EventEmitter } = require('events');
const axios = require("axios");

const FAST_WITHDRAWAL_SERVERS = [
  {
    name: 'fw1.drivechain.info (L2L #1)',
    url: 'https://fw1.drivechain.info',
  },
  {
    name: 'fw2.drivechain.info (L2L #2)',
    url: 'https://fw2.drivechain.info',
  },
];

function defaultFastWithdrawalServer() {
  return FAST_WITHDRAWAL_SERVERS[0].url;
}

class FastWithdrawalManager extends EventEmitter {
  constructor(serverUrl) {
    super();
    this.serverUrl = FAST_WITHDRAWAL_SERVERS[0].url;
    this.rpcConfigBTC = {
      host: '127.0.0.1',
      port: 38332,
      user: 'user',
      password: 'password'
    };
  }

  getServerUrl() {
    return this.serverUrl;
  }

  async makeRpcCallBTC(method, params = []) {
    try {
      const response = await axios.post(`http://${this.rpcConfigBTC.host}:${this.rpcConfigBTC.port}`, {
        jsonrpc: '1.0',
        id: 'fastwithdrawal',
        method,
        params
      }, {
        auth: {
          username: this.rpcConfigBTC.user,
          password: this.rpcConfigBTC.password
        }
      });
      return response.data.result;
    } catch (error) {
      console.error(`RPC call failed (${method}):`, error.message);
      throw error;
    }
  }

  async getBalanceBTC() {
    try {
      const info = await this.makeRpcCallBTC('getbalance');
      console.debug("getbalance response: ", info)
      return {
        info
      };
    } catch (error) {
      console.error('Failed to get BTC balance:', error);
      throw error;
    }
  }

  setServerUrl(serverUrl) {
    const server = FAST_WITHDRAWAL_SERVERS.find(s => s.url === serverUrl);
    if (!server) {
      throw new Error(`unknown fast withdrawal server: ${serverUrl}`);
    }

    console.debug(`setting fast withdrawal server to: "${server.url}"`);
    this.serverUrl = server.url;
  }

  async requestWithdrawal(destination, amount, layer2Chain) {
    try {
      const url = `${this.serverUrl}/withdraw`;
      const body = {
        withdrawal_destination: destination,
        withdrawal_amount: amount.toString(), 
        layer_2_chain_name: layer2Chain 
      }
      console.debug(`requesting withdrawal from ${url} with params: ${JSON.stringify(body)}`);

      const response = await axios.post(url, body);

      if (response.data.status !== 'success') {
        throw new Error(response.data.error || 'Withdrawal request failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to request withdrawal:', error);
      throw error;
    }
  }

  async notifyPaymentComplete(hash, txid) {
    try {
      const response = await axios.post(`${this.serverUrl}/paid`, {
        hash: hash,
        txid: txid
      });

      if (response.data.status !== 'success') {
        throw new Error(response.data.error || 'Payment notification failed');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to notify payment:', error);
      throw error;
    }
  }
}

module.exports = {
  FastWithdrawalManager,
  defaultFastWithdrawalServer,
  FAST_WITHDRAWAL_SERVERS
};
