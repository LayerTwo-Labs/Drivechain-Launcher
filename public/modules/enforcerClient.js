const { createClient } = require("@connectrpc/connect");
const { createGrpcTransport } = require("@connectrpc/connect-node");
const { ValidatorService } = require("../gen/cusf/mainchain/v1/validator_pb.js");

const transport = createGrpcTransport({
  baseUrl: "http://0.0.0.0:50051", // Note: localhost does NOT work here
});


class EnforcerClient {
  constructor() {
    this.client = createClient(ValidatorService, transport);
  }

  async getBlockCount() {
    const response = await this.client.getChainTip({});
    return response.block_header_info.height;
  }
}

module.exports = EnforcerClient;
