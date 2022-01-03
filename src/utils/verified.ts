import { SupportedChain } from "./multichain";
import { Address, nativeTokenAddress, normalizeAddress } from "./utils";

export const verifiedContracts: {
  [K in SupportedChain]: Map<Address, string>;
} = {
  "1": new Map(
    [
      //native
      [nativeTokenAddress, "https://ethereum.org/"],
      //erc20s
      ["0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", "https://matic.network"],
      ["0x6b175474e89094c44da98b954eedeac495271d0f", "https://makerdao.com"],
    ].map(([k, v]) => [normalizeAddress(k), v])
  ),
  "137": new Map(
    [
      //native
      [nativeTokenAddress, "https://matic.network"],
      //erc1155s
      [
        "0x631998e91476DA5B870D741192fc5Cbc55F5a52E",
        "https://www.skyweaver.net",
      ],
      [
        "0x0ce2ABE65F4F354321Fa9f000aC14b7A2B3F6f65",
        "https://www.circle.com/en/usdc",
      ],
      [
        "0x2d0d9b4075e231bff33141d69df49ffcf3be7642",
        "https://degacha.com/introduce/gacha",
      ],
      // erc20s
      [
        "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "https://polygon.technology",
      ],
      ["0x84000b263080bc37d1dd73a29d92794a6cf1564e", "https://makerdao.com"],
      ["0x0000000000000000000000000000000000001010", "https://matic.network"],
      ["0x7240feeb4d8862a25f3d22c063528557aa42da85", "https://unilend.finance"],
      ["0xda537104d6a5edd53c6fbba9a898708e465260b6", "https://yearn.finance"],
      [
        "0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4",
        "https://decentraland.org",
      ],
      ["0xb33eaad8d922b1083446dc23f610c2567fb5180f", "https://uniswap.org"],
      [
        "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
        "https://www.wbtc.network",
      ],
      [
        "0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7",
        "https://www.aavegotchi.com",
      ],
      [
        "0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7",
        "https://www.paxos.com/busd",
      ],
      ["0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", "https://chain.link"],
      ["0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "https://makerdao.com"],
      ["0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a", "https://sushiswap.org"],
      [
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "https://www.circle.com/en/usdc",
      ],
      [
        "0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c",
        "https://compound.finance/governance/comp",
      ],
      ["0xc2132d05d31c914a87c6611c10748aeb04b58e8f", "https://tether.to"],
      ["0x8cc8538d60901d19692f5ba22684732bc28f54a3", "https://weth.io"],
      ["0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "https://weth.io"],
      [
        "0x3cef98bb43d732e2f285ee605a8158cde967d219",
        "https://basicattentiontoken.org",
      ],
      [
        "0xc6d54d2f624bc83815b49d9c2203b1330b841ca0",
        "https://www.sandbox.game",
      ],
      ["0xd6df932a45c0f255f85145f286ea0b292b21c90b", "https://aave.com"],
      ["0xc25351811983818c9fe6d8c580531819c8ade90f", "https://idle.finance"],
      //erc721s
      // todo pull verification from opensea
      ["0x7227e371540CF7b8e512544Ba6871472031F3335", "https://neondistrict.io"],
      [
        "0x7183688c9d484ac0324bfa5f20a8408bd26011f5",
        "https://www.cryptokitties.co",
      ],
      [
        "0x10d10bd7fcf71efd8f9238a580292ac3f058ea95",
        "https://www.sandbox.game",
      ],
      [
        "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        "https://boredapeyachtclub.com",
      ],
    ].map(([k, v]) => [normalizeAddress(k), v])
  ),
  "4": new Map([
    //native
    [nativeTokenAddress, "https://ethereum.org/"],
  ]),
  "80001": new Map([
    //native
    [nativeTokenAddress, "https://matic.network"],
  ]),
};
