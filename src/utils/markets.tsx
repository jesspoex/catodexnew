import {Market, MARKETS, OpenOrders, Orderbook, TOKEN_MINTS, TokenInstructions,} from '@project-serum/serum';
import {PublicKey} from '@solana/web3.js';
import React, {useContext, useEffect, useState} from 'react';
import {divideBnToNumber, floorToDecimal, getTokenMultiplierFromDecimals, sleep, useLocalStorageState,} from './utils';
import {refreshCache, useAsyncData} from './fetch-loop';
import {useAccountData, useAccountInfo, useConnection} from './connection';
import {useWallet} from './wallet';
import tuple from 'immutable-tuple';
import {notify} from './notifications';
import BN from 'bn.js';
import {getTokenAccountInfo, parseTokenAccountData, useMintInfos,} from './tokens';
import {
  Balances,
  CustomMarketInfo,
  DeprecatedOpenOrdersBalances,
  FullMarketInfo,
  MarketContextValues,
  MarketInfo,
  OrderWithMarketAndMarketName,
  SelectedTokenAccounts,
  TokenAccount,
} from './types';
import {WRAPPED_SOL_MINT} from '@project-serum/serum/lib/token-instructions';
import {Order} from '@project-serum/serum/lib/market';
import BonfidaApi from './bonfidaConnector';

// Used in debugging, should be false in production
const _IGNORE_DEPRECATED = true;
const solUSDTMarketsInfo = {
  address: new PublicKey("HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1"),
  deprecated: false,
  name : "SOL/USDT",
  quoteLabel: "USDT",
  baseLabel: "SOL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const solUSDCMarketsInfo = {
  address: new PublicKey("9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT"),
  deprecated: false,
  name : "SOL/USDC",
  quoteLabel: "USDC",
  baseLabel: "SOL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const srmUSDTMarketsInfo = {
  address: new PublicKey("AtNnsY1AyRERWJ8xCskfz38YdvruWVJQUVXgScC1iPb"),
  deprecated: false,
  name : "SRM/USDT",
  quoteLabel: "USDT",
  baseLabel: "SRM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const srmUSDCMarketsInfo = {
  address: new PublicKey("ByRys5tuUWDgL73G8JBAEfkdFf8JWBzPBDHsBVQ5vbQA"),
  deprecated: false,
  name : "SRM/USDC",
  quoteLabel: "USDC",
  baseLabel: "SRM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const rayUSDCMarketsInfo = {
  address: new PublicKey("2xiv8A5xrJ7RnGdxXB42uFEkYHJjszEhaJyKKt4WaLep"),
  deprecated: false,
  name : "RAY/USDC",
  quoteLabel: "USDC",
  baseLabel: "RAY",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const rayUSDTMarketsInfo = {
  address: new PublicKey("teE55QrL4a4QSfydR9dnHF97jgCfptpuigbb53Lo95g"),
  deprecated: false,
  name : "RAY/USDT",
  quoteLabel: "USDT",
  baseLabel: "TULIP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CATOUSDCMarketsInfo = {
  address: new PublicKey("9fe1MWiKqUdwift3dEpxuRHWftG72rysCRHbxDy6i9xB"),
  deprecated: false,
  name : "CATO/USDC",
  quoteLabel: "USDC",
  baseLabel: "CATO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BOPUSDCMarketsInfo = {
  address: new PublicKey("7MmPwD1K56DthW14P1PnWZ4zPCbPWemGs3YggcT1KzsM"),
  deprecated: false,
  name : "BOP/USDC",
  quoteLabel: "USDC",
  baseLabel: "BOP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CHEEMSUSDCMarketsInfo = {
  address: new PublicKey("5WVBCaUPZF4HP3io9Z56N71cPMJt8qh3c4ZwSjRDeuut"),
  deprecated: false,
  name : "CHEEMS/USDC",
  quoteLabel: "USDC",
  baseLabel: "CHEEMS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const COPEUSDCMarketsInfo = {
  address: new PublicKey("6fc7v3PmjZG9Lk2XTot6BywGyYLkBQuzuFKd4FpCsPxk"),
  deprecated: false,
  name : "COPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "COPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CREAMUSDCMarketsInfo = {
  address: new PublicKey("7nZP6feE94eAz9jmfakNJWPwEKaeezuKKC5D1vrnqyo2"),
  deprecated: false,
  name : "CREAM/USDC",
  quoteLabel: "USDC",
  baseLabel: "CREAM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const DGENUSDCMarketsInfo = {
  address: new PublicKey("7MtgLYSEgsq626pvcEAwaDqs2KiZsaJUX2qGpRZbcDWY"),
  deprecated: false,
  name : "DGEN/USDC",
  quoteLabel: "USDC",
  baseLabel: "DGEN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const DOGAUSDCMarketsInfo = {
  address: new PublicKey("H1Ywt7nSZkLDb2o3vpA5yupnBc9jr1pXtdjMm4Jgk1ay"),
  deprecated: false,
  name : "DOGA/USDC",
  quoteLabel: "USDC",
  baseLabel: "DOGA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FABoldUSDCMarketsInfo = {
  address: new PublicKey("GHPhJm8F5Kg4Xq3nxHfN2SKsgPwNPMuB8FHFsLE6RP8M"),
  deprecated: false,
  name : "FAB/USDC (Old)",
  quoteLabel: "USDC",
  baseLabel: "FAB",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FEFEUSDCMarketsInfo = {
  address: new PublicKey("GXL164trLUbf7FTjp76DLdgPiAzjysGosUaKTbCrsFK3"),
  deprecated: false,
  name : "FEFE/USDC",
  quoteLabel: "USDC",
  baseLabel: "FEFE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FIDAUSDCMarketsInfo = {
  address: new PublicKey("E14BKBhDWD4EuTkWj1ooZezesGxMW8LPCps4W5PuzZJo"),
  deprecated: false,
  name : "FIDA/USDC",
  quoteLabel: "USDC",
  baseLabel: "FIDA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FRENCHUSDCMarketsInfo = {
  address: new PublicKey("6FRXwGCpCbbyMroJzjL8ECF5evaWFPhuAZWibWUpnu8x"),
  deprecated: false,
  name : "FRENCH/USDC",
  quoteLabel: "USDC",
  baseLabel: "FRENCH",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FROGUSDCMarketsInfo = {
  address: new PublicKey("2Si6XDdpv5zcvYna221eZZrsjsp5xeYoz9W1TVdMdbnt"),
  deprecated: false,
  name : "FROG/USDC",
  quoteLabel: "USDC",
  baseLabel: "FROG",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FRONTUSDCMarketsInfo = {
  address: new PublicKey("9Zx1CvxSVdroKMMWf2z8RwrnrLiQZ9VkQ7Ex3syQqdSH"),
  deprecated: false,
  name : "FRONT/USDC",
  quoteLabel: "USDC",
  baseLabel: "FRONT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FTRUSDCMarketsInfo = {
  address: new PublicKey("4JP75nztBEo5rYhW1LTQyc4qfjPB33jMWEUvp2DGrQQR"),
  deprecated: false,
  name : "FTR/USDC",
  quoteLabel: "USDC",
  baseLabel: "FTR",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FTTUSDCMarketsInfo = {
  address: new PublicKey("2Pbh1CvRVku1TgewMfycemghf6sU9EyuFDcNXqvRmSxc"),
  deprecated: false,
  name : "FTT/USDC",
  quoteLabel: "USDC",
  baseLabel: "FTT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HGETUSDCMarketsInfo = {
  address: new PublicKey("88vztw7RTN6yJQchVvxrs6oXUDryvpv9iJaFa1EEmg87"),
  deprecated: false,
  name : "HGET/USDC",
  quoteLabel: "USDC",
  baseLabel: "HGET",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HHHUSDCMarketsInfo = {
  address: new PublicKey("2REv9scD6FXCn5jephHJN9fraQ3Yq4toU5RrAXcJUazd"),
  deprecated: false,
  name : "HHH/USDC",
  quoteLabel: "USDC",
  baseLabel: "HHH",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HNTUSDCMarketsInfo = {
  address: new PublicKey("CnUV42ZykoKUnMDdyefv5kP6nDSJf7jFd7WXAecC6LYr"),
  deprecated: false,
  name : "HNT/USDC",
  quoteLabel: "USDC",
  baseLabel: "HNT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HOLDUSDCMarketsInfo = {
  address: new PublicKey("G2j5zKtfymPcWMq1YRoKrfUWy64SZ6ZxDVscHSyPQqmz"),
  deprecated: false,
  name : "HOLD/USDC",
  quoteLabel: "USDC",
  baseLabel: "HOLD",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HXROUSDCMarketsInfo = {
  address: new PublicKey("6Pn1cSiRos3qhBf54uBP9ZQg8x3JTardm1dL3n4p29tA"),
  deprecated: false,
  name : "HXRO/USDC",
  quoteLabel: "USDC",
  baseLabel: "HXRO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const KEEPUSDCMarketsInfo = {
  address: new PublicKey("3rgacody9SvM88QR83GHaNdEEx4Fe2V2ed5GJp2oeKDr"),
  deprecated: false,
  name : "KEEP/USDC",
  quoteLabel: "USDC",
  baseLabel: "KEEP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const KEKWUSDCMarketsInfo = {
  address: new PublicKey("N99ngemA29qSKqdDW7kRiZHS7h2wEFpdgRvgE3N2jy6"),
  deprecated: false,
  name : "KEKW/USDC",
  quoteLabel: "USDC",
  baseLabel: "KWEK",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const KINUSDCMarketsInfo = {
  address: new PublicKey("Bn6NPyr6UzrFAwC4WmvPvDr2Vm8XSUnFykM2aQroedgn"),
  deprecated: false,
  name : "KIN/USDC",
  quoteLabel: "USDC",
  baseLabel: "KIN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LINKUSDCMarketsInfo = {
  address: new PublicKey("3hwH1txjJVS8qv588tWrjHfRxdqNjBykM1kMcit484up"),
  deprecated: false,
  name : "LINK/USDC",
  quoteLabel: "USDC",
  baseLabel: "LINK",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LUAUSDCMarketsInfo = {
  address: new PublicKey("4xyWjQ74Eifq17vbue5Ut9xfFNfuVB116tZLEpiZuAn8"),
  deprecated: false,
  name : "LUA/USDC",
  quoteLabel: "USDC",
  baseLabel: "LUA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MAPSUSDCMarketsInfo = {
  address: new PublicKey("3A8XQRWXC7BjLpgLDDBhQJLT5yPCzS16cGYRKHkKxvYo"),
  deprecated: false,
  name : "MAPS/USDC",
  quoteLabel: "USDC",
  baseLabel: "MAPS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MATHUSDCMarketsInfo = {
  address: new PublicKey("J7cPYBrXVy8Qeki2crZkZavcojf2sMRyQU7nx438Mf8t"),
  deprecated: false,
  name : "MATH/USDC",
  quoteLabel: "USDC",
  baseLabel: "MATH",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const mBRZUSDCMarketsInfo = {
  address: new PublicKey("Biff7oLeDU4mowrzxUD8KMPMGutHB14RCH3vq9mStKAy"),
  deprecated: false,
  name : "mBRZ/USDC",
  quoteLabel: "USDC",
  baseLabel: "mBRZ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MERUSDCMarketsInfo = {
  address: new PublicKey("G4LcexdCzzJUKZfqyVDQFzpkjhB1JoCNL8Kooxi9nJz5"),
  deprecated: false,
  name : "MER/USDC",
  quoteLabel: "USDC",
  baseLabel: "MER",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MOLAUSDCMarketsInfo = {
  address: new PublicKey("HSpeWWRqBJ4HH2FPyfDhoN1AUq3gYoDenQGZASSqzYW1"),
  deprecated: false,
  name : "MOLA/USDC",
  quoteLabel: "USDC",
  baseLabel: "MOLA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MSRMUSDCMarketsInfo = {
  address: new PublicKey("4VKLSYdvrQ5ngQrt1d2VS8o4ewvb2MMUZLiejbnGPV33"),
  deprecated: false,
  name : "MSRM/USDC",
  quoteLabel: "USDC",
  baseLabel: "MSRM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const NINJAUSDCMarketsInfo = {
  address: new PublicKey("J4oPt5Q3FYxrznkXLkbosAWrJ4rZLqJpGqz7vZUL4eMM"),
  deprecated: false,
  name : "NINJA/USDC",
  quoteLabel: "USDC",
  baseLabel: "NINJA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const NOPEUSDCMarketsInfo = {
  address: new PublicKey("GGkhBT3zWrkGsrSCYW8pF2hYfBSYfzvcJd1PH844ULMV"),
  deprecated: false,
  name : "NOPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "NOPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const OXYUSDCMarketsInfo = {
  address: new PublicKey("GZ3WBFsqntmERPwumFEYgrX2B7J7G11MzNZAy7Hje27X"),
  deprecated: false,
  name : "OXY/USDC",
  quoteLabel: "USDC",
  baseLabel: "OXY",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const PGNUSDCMarketsInfo = {
  address: new PublicKey("BTUSB3yTsXB6VZrMUcFWQMacPVCpRpzVGLuzsz5TGqAB"),
  deprecated: false,
  name : "PGN/USDC",
  quoteLabel: "USDC",
  baseLabel: "PGN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const POTATOUSDCMarketsInfo = {
  address: new PublicKey("6dn7tgTHe5rZEAscMWWY3xmPGVEKVkM9s7YRV11z399z"),
  deprecated: false,
  name : "POTATO/USDC",
  quoteLabel: "USDC",
  baseLabel: "POTATO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const ROPEUSDCMarketsInfo = {
  address: new PublicKey("4Sg1g8U2ZuGnGYxAhc6MmX9MX7yZbrrraPkCQ9MdCPtF"),
  deprecated: false,
  name : "ROPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "ROPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SAILUSDCMarketsInfo = {
  address: new PublicKey("6hwK66FfUdyhncdQVxWFPRqY8y6usEvzekUaqtpKEKLr"),
  deprecated: false,
  name : "SAIL/USDC",
  quoteLabel: "USDC",
  baseLabel: "SAIL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SAMOUSDCMarketsInfo = {
  address: new PublicKey("FR3SPJmgfRSKKQ2ysUZBu7vJLpzTixXnjzb84bY3Diif"),
  deprecated: false,
  name : "SAMO/USDC",
  quoteLabel: "USDC",
  baseLabel: "SAMO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MEOWUSDCMarketsInfo = {
  address: new PublicKey("FhiqrjSsQuEEe2FUMxzkwFadsAwA9ea9YMJLivEFKFbQ"),
  deprecated: false,
  name : "MEOW/USDC",
  quoteLabel: "USDC",
  baseLabel: "MEOW",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SDOGEUSDCMarketsInfo = {
  address: new PublicKey("9aruV2p8cRWxybx6wMsJwPFqeN7eQVPR74RrxdM3DNdu"),
  deprecated: false,
  name : "SDOGE/USDC",
  quoteLabel: "USDC",
  baseLabel: "SDOGE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const STNKUSDCMarketsInfo = {
  address: new PublicKey("7vJhxNnkPBTJKNHsbjZUhmCVCxmYKgV6vgJ56eH2MQaC"),
  deprecated: false,
  name : "STNK/USDC",
  quoteLabel: "USDC",
  baseLabel: "STNK",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SLNDNUSDCMarketsInfo = {
  address: new PublicKey("F4CtSAoT1xrQSgGAJ5sVBkhofjbh4m7LcYtSKk26u9Ty"),
  deprecated: false,
  name : "SLNDN/USDC",
  quoteLabel: "USDC",
  baseLabel: "SLNDN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SOLANADONUSDCMarketsInfo = {
  address: new PublicKey("F4CtSAoT1xrQSgGAJ5sVBkhofjbh4m7LcYtSKk26u9Ty"),
  deprecated: false,
  name : "SOLANADON/USDC",
  quoteLabel: "USDC",
  baseLabel: "SOLANADON",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SOLAPEUSDCMarketsInfo = {
  address: new PublicKey("4zffJaPyeXZ2wr4whHgP39QyTfurqZ2BEd4M5W6SEuon"),
  deprecated: false,
  name : "SOLAPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "SOLAPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SUSHIUSDCMarketsInfo = {
  address: new PublicKey("A1Q9iJDVVS8Wsswr9ajeZugmj64bQVCYLZQLra2TMBMo"),
  deprecated: false,
  name : "SUSHI/USDC",
  quoteLabel: "USDC",
  baseLabel: "SUSHI",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const TULIPUSDCMarketsInfo = {
  address: new PublicKey("8GufnKq7YnXKhnB3WNhgy5PzU9uvHbaaRrZWQK6ixPxW"),
  deprecated: false,
  name : "TULIP/USDC",
  quoteLabel: "USDC",
  baseLabel: "TULIP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const WOOFUSDCMarketsInfo = {
  address: new PublicKey("CwK9brJ43MR4BJz2dwnDM7EXCNyHhGqCJDrAdsEts8n5"),
  deprecated: false,
  name : "WOOF/USDC",
  quoteLabel: "USDC",
  baseLabel: "WOOF",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const xCOPEUSDCMarketsInfo = {
  address: new PublicKey("7MpMwArporUHEGW7quUpkPZp5L5cHPs9eKUfKCdaPHq2"),
  deprecated: false,
  name : "xCOPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "xCOPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const USDCUSDTMarketsInfo = {
  address: new PublicKey("77quYg4MGneUdjgXCunt9GgM1usmrxKY31twEy3WHwcS"),
  deprecated: false,
  name : "USDC/USDT",
  quoteLabel: "USDT",
  baseLabel: "USDC",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const JOKEUSDCMarketsInfo = {
  address: new PublicKey("3dFAa6MP8RToK7oLQEns1zzWLp7mEPLx4xrV7WTZ4WZW"),
  deprecated: false,
  name : "JOKE/USDC",
  quoteLabel: "USDC",
  baseLabel: "JOKE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MEDIAUSDCMarketsInfo = {
  address: new PublicKey("FfiqqvJcVL7oCCu8WQUMHLUC2dnHQPAPjTdSzsERFWjb"),
  deprecated: false,
  name : "MEDIA/USDC",
  quoteLabel: "USDC",
  baseLabel: "MEDIA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const PARTIUSDCMarketsInfo = {
  address: new PublicKey("9xgxfrcUEMbyXg8FQsuyhNXxQ13Gy4kBqXJgZnXDdzSZ"),
  deprecated: false,
  name : "PARTI/USDC",
  quoteLabel: "USDC",
  baseLabel: "PARTI",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const ASHUSDCMarketsInfo = {
  address: new PublicKey("56ZFVzqMqtDmyry9bK7vi1szUV2nuQ4kT6CzFAB649wE"),
  deprecated: false,
  name : "ASH/USDC",
  quoteLabel: "USDC",
  baseLabel: "ASH",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BOLEUSDCMarketsInfo = {
  address: new PublicKey("9yGqsboBtvztDgGbGFEaBBT2G8dUMhxewXDQpy6T3eDm"),
  deprecated: false,
  name : "BOLE/USDC",
  quoteLabel: "USDC",
  baseLabel: "BOLE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LIQUSDCMarketsInfo = {
  address: new PublicKey("D7p7PebNjpkH6VNHJhmiDFNmpz9XE7UaTv9RouxJMrwb"),
  deprecated: false,
  name : "LIQ/USDC",
  quoteLabel: "USDC",
  baseLabel: "LIQ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const TUTLSOLMarketsInfo = {
  address: new PublicKey("CtLUvMyGDEP9dkwo9yR93s4H7eibUpUHmVUd9YSKJsPJ"),
  deprecated: false,
  name : "TUTL/SOL",
  quoteLabel: "SOL",
  baseLabel: "TUTL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CAPEUSDCMarketsInfo = {
  address: new PublicKey("85CTDt8gNfJhmqE3Xm2smDm54HmeT1jvLfPVBTkX8BTX"),
  deprecated: false,
  name : "CAPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "CAPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SHBLUSDCMarketsInfo = {
  address: new PublicKey("9G2bAA5Uv8JyPZteuP73GJLUGg5CMbhMLCRSBUBLoXyt"),
  deprecated: false,
  name : "SHBL/USDC",
  quoteLabel: "USDC",
  baseLabel: "SHBL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LIQSOLMarketsInfo = {
  address: new PublicKey("F7SrwFTQ8uWBs9zhN9fctLKLJdEAz8fu7XmNyi9Sebht"),
  deprecated: false,
  name : "LIQ/SOL",
  quoteLabel: "SOL",
  baseLabel: "LIQ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const APEXUSDCMarketsInfo = {
  address: new PublicKey("GX26tyJyDxiFj5oaKvNB9npAHNgdoV9ZYHs5ijs5yG2U"),
  deprecated: false,
  name : "APEX/USDC",
  quoteLabel: "USDC",
  baseLabel: "APEX",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const GUUSDCMarketsInfo = {
  address: new PublicKey("2QXXnRnSBi4tviNUAsYv7tYDvYb17BQhK5MxR4sX5J3B"),
  deprecated: false,
  name : "GÜ/USDC",
  quoteLabel: "USDC",
  baseLabel: "GÜ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const DGXUSDCMarketsInfo = {
  address: new PublicKey("3B1diUDpBciWLQLjPv28h9XPFsymxK8PSeUCnQJBxiJs"),
  deprecated: false,
  name : "DGX/USDC",
  quoteLabel: "USDC",
  baseLabel: "DGX",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const TGTUSDCMarketsInfo = {
  address: new PublicKey("GfokD5aka4n8kqCgRiJtMYi4Xd1ZLBatkynxFGyKdNTc"),
  deprecated: false,
  name : "TGT/USDC",
  quoteLabel: "USDC",
  baseLabel: "TGT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FABUSDCMarketsInfo = {
  address: new PublicKey("Cud48DK2qoxsWNzQeTL5D8sAiHsGwG8Ev1VMNcYLayxt"),
  deprecated: false,
  name : "FAB/USDC",
  quoteLabel: "USDC",
  baseLabel: "FAB",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BOPRAYMarketsInfo = {
  address: new PublicKey("6Fcw8aEs7oP7YeuMrM2JgAQUotYxa4WHKHWdLLXssA3R"),
  deprecated: false,
  name : "BOP/RAY",
  quoteLabel: "RAY",
  baseLabel: "BOP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LIQRAYMarketsInfo = {
  address: new PublicKey("FL8yPAyVTepV5YfzDfJvNu6fGL7Rcv5v653LdZ6h4Bsu"),
  deprecated: false,
  name : "LIQ/RAY",
  quoteLabel: "RAY",
  baseLabel: "LIQ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CRCUSDCMarketsInfo = {
  address: new PublicKey("28UzKVL5kwzPA9xdLFYJRManeY6RHgmTiU5K1h13XCRv"),
  deprecated: false,
  name : "CRC/USDC",
  quoteLabel: "USDC",
  baseLabel: "CRC",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CHADUSDCMarketsInfo = {
  address: new PublicKey("5zmZq5Ydz3R5h5kf7wVb3KPJEZrNDUHWVbtjXZTQ4fv3"),
  deprecated: false,
  name : "CHAD/USDC",
  quoteLabel: "USDC",
  baseLabel: "CHAD",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MNGOUSDCMarketsInfo = {
  address: new PublicKey("3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc"),
  deprecated: false,
  name : "MNGO/USDC",
  quoteLabel: "USDC",
  baseLabel: "MNGO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SBRUSDCMarketsInfo = {
  address: new PublicKey("HXBi8YBwbh4TXF6PjVw81m8Z3Cc4WBofvauj5SBFdgUs"),
  deprecated: false,
  name : "SBR/USDC",
  quoteLabel: "USDC",
  baseLabel: "SBR",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const GSAILUSDCMarketsInfo = {
  address: new PublicKey("2zkPyHgQkKG6qJED6MTbjfCfUbZeT9VFwLm1Ld9nKxRp"),
  deprecated: false,
  name : "GSAIL/USDC",
  quoteLabel: "USDC",
  baseLabel: "GSAIL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LIKEUSDCMarketsInfo = {
  address: new PublicKey("3WptgZZu34aiDrLMUiPntTYZGNZ72yT1yxHYxSdbTArX"),
  deprecated: false,
  name : "LIKE/USDC",
  quoteLabel: "USDC",
  baseLabel: "LIKE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const ORCAUSDCMarketsInfo = {
  address: new PublicKey("8N1KkhaCYDpj3awD58d85n973EwkpeYnRp84y1kdZpMX"),
  deprecated: false,
  name : "ORCA/USDC",
  quoteLabel: "USDC",
  baseLabel: "ORCA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const STEPUSDCMarketsInfo = {
  address: new PublicKey("97qCB4cAVSTthvJu3eNoEx6AY6DLuRDtCoPm5Tdyg77S"),
  deprecated: false,
  name : "STEP/USDC",
  quoteLabel: "USDC",
  baseLabel: "STEP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CRPUSDCMarketsInfo = {
  address: new PublicKey("8nXjHLfiR6wB22J7VBGeKjsRiSa54Eu7cgL17GE4kJUw"),
  deprecated: false,
  name : "OLD CRP/USDC",
  quoteLabel: "USDC",
  baseLabel: "CRP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const newCRPUSDCMarketsInfo = {
  address: new PublicKey("93mtNf4qzvytwp5sWrSC7JNUccPAomEE39ztErUq5V3F"),
  deprecated: false,
  name : "CRP/USDC",
  quoteLabel: "USDC",
  baseLabel: "CRP",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const ATLASUSDCMarketsInfo = {
  address: new PublicKey("Di66GTLsV64JgCCYGVcY21RZ173BHkjJVgPyezNN7P1K"),
  deprecated: false,
  name : "ATLAS/USDC",
  quoteLabel: "USDC",
  baseLabel: "ATLAS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const POLISUSDCMarketsInfo = {
  address: new PublicKey("HxFLKUAmAMLz1jtT3hbvCMELwH5H9tpM2QugP8sKyfhW"),
  deprecated: false,
  name : "POLIS/USDC",
  quoteLabel: "USDC",
  baseLabel: "POLIS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SLRSUSDCMarketsInfo = {
  address: new PublicKey("2Gx3UfV831BAh8uQv1FKSPKS9yajfeeD8GJ4ZNb2o2YP"),
  deprecated: false,
  name : "SLRS/USDC",
  quoteLabel: "USDC",
  baseLabel: "SLRS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SUNNYUSDCMarketsInfo = {
  address: new PublicKey("Aubv1QBFh4bwB2wbP1DaPW21YyQBLfgjg8L4PHTaPzRc"),
  deprecated: false,
  name : "SUNNY/USDC",
  quoteLabel: "USDC",
  baseLabel: "SUNNY",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const PORTUSDCMarketsInfo = {
  address: new PublicKey("8x8jf7ikJwgP9UthadtiGFgfFuyyyYPHL3obJAuxFWko"),
  deprecated: false,
  name : "PORT/USDC",
  quoteLabel: "USDC",
  baseLabel: "PORT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SOLBERRYUSDCMarketsInfo = {
  address: new PublicKey("HchZzqewgC4pfsJU9uxFsrP4sLDqLsDntYRzE5RgrBak"),
  deprecated: false,
  name : "SOLBERRY/USDC",
  quoteLabel: "USDC",
  baseLabel: "SOLBERRY",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const DATEUSDCMarketsInfo = {
  address: new PublicKey("3jszawPiXjuqg5MwAAHS8wehWy1k7de5u5pWmmPZf6dM"),
  deprecated: false,
  name : "DATE/USDC",
  quoteLabel: "USDC",
  baseLabel: "DATE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LARIXUSDCMarketsInfo = {
  address: new PublicKey("BeF2PKq2jmTJraWEhP28H8BQHUVtuzTyFogtKkxi6D6"),
  deprecated: false,
  name : "LARIX/USDC",
  quoteLabel: "USDC",
  baseLabel: "LARIX",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const GRAPEUSDCMarketsInfo = {
  address: new PublicKey("72aW3Sgp1hMTXUiCq8aJ39DX2Jr7sZgumAvdLrLuCMLe"),
  deprecated: false,
  name : "GRAPE/USDC",
  quoteLabel: "USDC",
  baseLabel: "GRAPE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CYSUSDCMarketsInfo = {
  address: new PublicKey("6V6y6QFi17QZC9qNRpVp7SaPiHpCTp2skbRQkUyZZXPW"),
  deprecated: false,
  name : "CYS/USDC",
  quoteLabel: "USDC",
  baseLabel: "CYS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HAMSUSDCMarketsInfo = {
  address: new PublicKey("5j6hdwx4eW3QBYZtRjKiUj7aDA1dxDpveSHBznwq7kUv"),
  deprecated: false,
  name : "HAMS/USDC",
  quoteLabel: "USDC",
  baseLabel: "HAMS",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SWANUSDCMarketsInfo = {
  address: new PublicKey("8zPVSrun5AnePjXWjC4EgMdBaLdHtkSUtYbFNobzQHRN"),
  deprecated: false,
  name : "SWAN/USDC",
  quoteLabel: "USDC",
  baseLabel: "SWAN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BDEUSDCMarketsInfo = {
  address: new PublicKey("41ZnP6U4catotV7rFuv7JR9n53jcCGrBTBkowoBaQx5q"),
  deprecated: false,
  name : "BDE/USDC",
  quoteLabel: "USDC",
  baseLabel: "BDE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FOSSILUSDCMarketsInfo = {
  address: new PublicKey("NF5PoXovc9wpWMPMrGeCQSmJRAEEUFCR3UZGVHTonf9"),
  deprecated: false,
  name : "FOSSIL/USDC",
  quoteLabel: "USDC",
  baseLabel: "FOSSIL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SOLMOUSDCMarketsInfo = {
  address: new PublicKey("FZAn2H4kzz4bFuez3Hqgg2qz1sHRQ5mPZkowiWMk95sX"),
  deprecated: false,
  name : "SOLMO/USDC",
  quoteLabel: "USDC",
  baseLabel: "SOLMO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const MIMUSDCMarketsInfo = {
  address: new PublicKey("8GaWdgZ5yPxQpxGii2HCWKQj1JgabH9SGCHx2fFwZK6t"),
  deprecated: false,
  name : "MIM/USDC",
  quoteLabel: "USDC",
  baseLabel: "MIM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CHIHUSDCMarketsInfo = {
  address: new PublicKey("prLiL5ZsdKxDWT6doGZ4sEYHPoFxPBEGU5vJXffzShe"),
  deprecated: false,
  name : "CHIH/USDC",
  quoteLabel: "USDC",
  baseLabel: "CHIH",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const ALMUSDCMarketsInfo = {
  address: new PublicKey("DNxn3qM61GZddidjrzc95398SCWhm5BUyt8Y8SdKYr8W"),
  deprecated: false,
  name : "ALM/USDC",
  quoteLabel: "USDC",
  baseLabel: "ALM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const NAXARUSDCMarketsInfo = {
  address: new PublicKey("5WSgaKbwpuy18jHg7mCUXY8YhTL2zVZZkeXi844YTLob"),
  deprecated: false,
  name : "NAXAR/USDC",
  quoteLabel: "USDC",
  baseLabel: "NAXAR",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BSTUSDCMarketsInfo = {
  address: new PublicKey("Hq2tZzrdNrMtDsdXeCf9CrN3aS3geJTEqtLRPyiYRZc"),
  deprecated: false,
  name : "BST/USDC",
  quoteLabel: "USDC",
  baseLabel: "BST",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SAILGSAILMarketsInfo = {
  address: new PublicKey("Dk3onSPUkNky5P4Cb6MXvvUuzR9d7PuvtuSqdqiWk6FH"),
  deprecated: false,
  name : "SAIL/GSAIL",
  quoteLabel: "SAIL",
  baseLabel: "GSAIL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SPWNUSDCMarketsInfo = {
  address: new PublicKey("41UQxR6MBKfkXEpeiXvouagiAZWZsEbcrGyNHHDa4LnK"),
  deprecated: false,
  name : "SPWN/USDC",
  quoteLabel: "USDC",
  baseLabel: "SPWN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BMBOUSDCMarketsInfo = {
  address: new PublicKey("8dpaLWWPv6vFong1D8gHFDmYzHQreXuKcui3XCKBACCj"),
  deprecated: false,
  name : "BMBO/USDC",
  quoteLabel: "USDC",
  baseLabel: "BMBO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const FLOOFUSDCMarketsInfo = {
  address: new PublicKey("BxcuT1p8FK9cFak4Uuf5nmoAZ7nQGu7FerCMESGqxF7b"),
  deprecated: false,
  name : "FLOOF/USDC",
  quoteLabel: "USDC",
  baseLabel: "FLOOF",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SCUMUSDCMarketsInfo = {
  address: new PublicKey("ArKuemtzjpqP5H3P4S21nzhtLZtsq7nMCN6ecA9yvMX9"),
  deprecated: false,
  name : "SCUM/USDC",
  quoteLabel: "USDC",
  baseLabel: "SCUM",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SHIBAUSDCMarketsInfo = {
  address: new PublicKey("3M8uZhLZMxFUedsEgPzywZr9qbGTv3kKNMCEfAmg8iyK"),
  deprecated: false,
  name : "SHIBA/USDC",
  quoteLabel: "USDC",
  baseLabel: "SHIBA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SCHADUSDCMarketsInfo = {
  address: new PublicKey("7oTiNcYoQiS4u4fYU6y7VDE8eCKWcdxa1qccwJgVwn8q"),
  deprecated: false,
  name : "SCHAD/USDC",
  quoteLabel: "USDC",
  baseLabel: "SCHAD",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const INUUSDCMarketsInfo = {
  address: new PublicKey("G3Bss3a2tif6eHNzWCh14g5k2H4rwBAmE42tbckUWG5T"),
  deprecated: false,
  name : "INU/USDC",
  quoteLabel: "USDC",
  baseLabel: "INU",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const NRAUSDCMarketsInfo = {
  address: new PublicKey("5JC2kckdehvq8k2JMZE9gJzdiyhGyg5CH4HN8gxwWSyo"),
  deprecated: false,
  name : "NRA/USDC",
  quoteLabel: "USDC",
  baseLabel: "NRA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const HIMAUSDCMarketsInfo = {
  address: new PublicKey("HCE4wQXApNyFBTK7gYa98QCYbshCz7EkH8axNz3ahvKc"),
  deprecated: false,
  name : "HIMA/USDC",
  quoteLabel: "USDC",
  baseLabel: "HIMA",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const OINKUSDCMarketsInfo = {
  address: new PublicKey("BRBWfj1JGNBngCbgcrUbRsGSwa4VsvY73FJGHiyssgbo"),
  deprecated: false,
  name : "OINK/USDC",
  quoteLabel: "USDC",
  baseLabel: "OINK",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const BSAMOUSDCMarketsInfo = {
  address: new PublicKey("AohqcP9t8y9ttheks7PWWf41ny3Zahy3WLF7mNLBuUHJ"),
  deprecated: false,
  name : "BSAMO/USDC",
  quoteLabel: "USDC",
  baseLabel: "BSAMO",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const CCATUSDCMarketsInfo = {
  address: new PublicKey("BLVk4aeGVEfeZgNKEQECuuwhKx4eGaZgnWrnjazDSHqn"),
  deprecated: false,
  name : "CCAT/USDC",
  quoteLabel: "USDC",
  baseLabel: "CCAT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const INUSDCMarketsInfo = {
  address: new PublicKey("49vwM54DX3JPXpey2daePZPmimxA4CrkXLZ6E1fGxx2Z"),
  deprecated: false,
  name : "IN/USDC",
  quoteLabel: "USDC",
  baseLabel: "IN",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const WAGMIUSDCMarketsInfo = {
  address: new PublicKey("eju5JDyaf29jYNfq7VrVAocVxGayDEHVHHiM7MYc331"),
  deprecated: false,
  name : "WAGMI/USDC",
  quoteLabel: "USDC",
  baseLabel: "WAGMI",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SHIBTUSDCMarketsInfo = {
  address: new PublicKey("3muYjVPCnunGhXAq87oYBWWdAPWJvEKbbg1fqKZLLkni"),
  deprecated: false,
  name : "SHIBT/USDC",
  quoteLabel: "USDC",
  baseLabel: "SHIBT",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const DIBUUSDCMarketsInfo = {
  address: new PublicKey("TCLvUMwd9XBz3qp2oFTQ9L6SHNoQETJ1f7wEV6QCt2Y"),
  deprecated: false,
  name : "DIBU/USDC",
  quoteLabel: "USDC",
  baseLabel: "DIBU",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SWOLEUSDCMarketsInfo = {
  address: new PublicKey("3SGeuz8EXsyFo4HHWXQsoo8r4r5RdZkt7TuuTZiVbKc8"),
  deprecated: false,
  name : "SWOLE/USDC",
  quoteLabel: "USDC",
  baseLabel: "SWOLE",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const PIXLUSDCMarketsInfo = {
  address: new PublicKey("ESd3PskTov69tkW5MmfdV8K7hXR35EXRYorWMNn61dD3"),
  deprecated: false,
  name : "PIXL/USDC",
  quoteLabel: "USDC",
  baseLabel: "PIXL",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const VINURAYMarketsInfo = {
  address: new PublicKey("7W9pEftZmMvq9wm9tf5fLfMGMAY3bSa362ve1LzGDZq9"),
  deprecated: false,
  name : "VINU/RAY",
  quoteLabel: "RAY",
  baseLabel: "VINU",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const QBUSDCMarketsInfo = {
  address: new PublicKey("2ba5V4hkKxmGtnHft5DNMt8NPARZKHcBaK9Lu21iGTeg"),
  deprecated: false,
  name : "QB/USDC",
  quoteLabel: "USDC",
  baseLabel: "QB",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const LQQBMarketsInfo = {
  address: new PublicKey("GXKPm6k6NaEt517iW51ysCLuGgugkQ7FqZPG2Jbg75qK"),
  deprecated: false,
  name : "LQ/QB",
  quoteLabel: "QB",
  baseLabel: "LQ",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const SWEETUSDCMarketsInfo = {
  address: new PublicKey("ER3t6N44WsFFsCUMqXF2oTE6ag6tb3YZBFCqw5hdgiYK"),
  deprecated: false,
  name : "SWEET/USDC",
  quoteLabel: "USDC",
  baseLabel: "SWEET",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};
const PHNXSOLMarketsInfo = {
  address: new PublicKey("GNNSrmixw6XFjEQyMJYronwZe3TvjAaMKZdT5eQoyR6o"),
  deprecated: false,
  name : "PHNX/SOL",
  quoteLabel: "SOL",
  baseLabel: "PHNX",
  programId: new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
};

export const USE_MARKETS: MarketInfo[] = _IGNORE_DEPRECATED
  ? Array<{
  address: PublicKey;
  name: string;
  programId: PublicKey;
  deprecated: boolean;
     }>(0)
    .concat(solUSDTMarketsInfo)
    .concat(solUSDCMarketsInfo)
    .concat(srmUSDTMarketsInfo)
    .concat(srmUSDCMarketsInfo)
    .concat(rayUSDCMarketsInfo)
    .concat(rayUSDTMarketsInfo)
    .concat(CATOUSDCMarketsInfo)
    .concat( BOPUSDCMarketsInfo )
.concat( CHEEMSUSDCMarketsInfo )
.concat( COPEUSDCMarketsInfo )
.concat( CREAMUSDCMarketsInfo )
.concat( DGENUSDCMarketsInfo )
.concat( DOGAUSDCMarketsInfo )
.concat( FABoldUSDCMarketsInfo )
.concat( FEFEUSDCMarketsInfo )
.concat( FIDAUSDCMarketsInfo )
.concat( FRENCHUSDCMarketsInfo )
.concat( FROGUSDCMarketsInfo )
.concat( FRONTUSDCMarketsInfo )
.concat( FTRUSDCMarketsInfo )
.concat( FTTUSDCMarketsInfo )
.concat( HGETUSDCMarketsInfo )
.concat( HHHUSDCMarketsInfo )
.concat( HNTUSDCMarketsInfo )
.concat( HOLDUSDCMarketsInfo )
.concat( HXROUSDCMarketsInfo )
.concat( KEEPUSDCMarketsInfo )
.concat( KEKWUSDCMarketsInfo )
.concat( KINUSDCMarketsInfo )
.concat( LINKUSDCMarketsInfo )
.concat( LUAUSDCMarketsInfo )
.concat( MAPSUSDCMarketsInfo )
.concat( MATHUSDCMarketsInfo )
.concat( mBRZUSDCMarketsInfo )
.concat( MERUSDCMarketsInfo )
.concat( MOLAUSDCMarketsInfo )
.concat( MSRMUSDCMarketsInfo )
.concat( NINJAUSDCMarketsInfo )
.concat( NOPEUSDCMarketsInfo )
.concat( OXYUSDCMarketsInfo )
.concat( PGNUSDCMarketsInfo )
.concat( POTATOUSDCMarketsInfo )
.concat( ROPEUSDCMarketsInfo )
.concat( SAILUSDCMarketsInfo )
.concat( SAMOUSDCMarketsInfo )
.concat( MEOWUSDCMarketsInfo )
.concat( SDOGEUSDCMarketsInfo )
.concat( STNKUSDCMarketsInfo )
.concat( SLNDNUSDCMarketsInfo )
.concat( SOLANADONUSDCMarketsInfo )
.concat( SOLAPEUSDCMarketsInfo )
.concat( SUSHIUSDCMarketsInfo )
.concat( TULIPUSDCMarketsInfo )
.concat( WOOFUSDCMarketsInfo )
.concat( xCOPEUSDCMarketsInfo )
.concat( USDCUSDTMarketsInfo )
.concat( JOKEUSDCMarketsInfo )
.concat( MEDIAUSDCMarketsInfo )
.concat(PARTIUSDCMarketsInfo)
.concat(BOLEUSDCMarketsInfo)
.concat(ASHUSDCMarketsInfo)
.concat(LIQUSDCMarketsInfo)
.concat(TUTLSOLMarketsInfo)
.concat(CAPEUSDCMarketsInfo)
.concat(SHBLUSDCMarketsInfo)
.concat(LIQSOLMarketsInfo)
.concat(APEXUSDCMarketsInfo)
.concat(GUUSDCMarketsInfo)
.concat(DGXUSDCMarketsInfo)
.concat(TGTUSDCMarketsInfo)
.concat(FABUSDCMarketsInfo)
.concat(BOPRAYMarketsInfo)
.concat(LIQRAYMarketsInfo)
.concat(CRCUSDCMarketsInfo)
.concat(CHADUSDCMarketsInfo)
.concat(MNGOUSDCMarketsInfo)
.concat(SBRUSDCMarketsInfo)
.concat(LIKEUSDCMarketsInfo)
.concat(GSAILUSDCMarketsInfo)
.concat(ORCAUSDCMarketsInfo)
.concat(STEPUSDCMarketsInfo)
.concat(CRPUSDCMarketsInfo)
.concat(newCRPUSDCMarketsInfo)
.concat(ATLASUSDCMarketsInfo)
.concat(POLISUSDCMarketsInfo)
.concat(PORTUSDCMarketsInfo)
.concat(SUNNYUSDCMarketsInfo)
.concat(SLRSUSDCMarketsInfo)
.concat(SOLBERRYUSDCMarketsInfo)
.concat(DATEUSDCMarketsInfo)
.concat(LARIXUSDCMarketsInfo)
.concat(GRAPEUSDCMarketsInfo)
.concat(CYSUSDCMarketsInfo)
.concat(HAMSUSDCMarketsInfo)
.concat(BDEUSDCMarketsInfo)
.concat(SWANUSDCMarketsInfo)
.concat(FOSSILUSDCMarketsInfo)
.concat(SOLMOUSDCMarketsInfo)
.concat(MIMUSDCMarketsInfo)
.concat(CHIHUSDCMarketsInfo)
.concat(ALMUSDCMarketsInfo)
.concat(BSTUSDCMarketsInfo)
.concat(NAXARUSDCMarketsInfo)
.concat(SAILGSAILMarketsInfo)
.concat(SPWNUSDCMarketsInfo)
.concat(BMBOUSDCMarketsInfo)
.concat(FLOOFUSDCMarketsInfo)
.concat(SCUMUSDCMarketsInfo)
.concat(SHIBAUSDCMarketsInfo)
.concat(SCHADUSDCMarketsInfo)
.concat(INUUSDCMarketsInfo)
.concat(NRAUSDCMarketsInfo)
.concat(HIMAUSDCMarketsInfo)
.concat(OINKUSDCMarketsInfo)
.concat(BSAMOUSDCMarketsInfo)
.concat(CCATUSDCMarketsInfo)
.concat(INUSDCMarketsInfo)
.concat(WAGMIUSDCMarketsInfo)
.concat(SHIBTUSDCMarketsInfo)
.concat(DIBUUSDCMarketsInfo)
.concat(PIXLUSDCMarketsInfo)
.concat(SWOLEUSDCMarketsInfo)
.concat(VINURAYMarketsInfo)
.concat(QBUSDCMarketsInfo)
.concat(LQQBMarketsInfo)
.concat(SWEETUSDCMarketsInfo)
.concat(PHNXSOLMarketsInfo)

  : MARKETS;

export function useMarketsList() {
  return USE_MARKETS.filter(({ name, deprecated }) => !deprecated && !process.env.REACT_APP_EXCLUDE_MARKETS?.includes(name));
}

export function useAllMarkets() {
  const connection = useConnection();
  const { customMarkets } = useCustomMarkets();

  const getAllMarkets = async () => {
    const markets: Array<{
      market: Market;
      marketName: string;
      programId: PublicKey;
    } | null> = await Promise.all(
      getMarketInfos(customMarkets).map(async (marketInfo) => {
        try {
          const market = await Market.load(
            connection,
            marketInfo.address,
            {},
            marketInfo.programId,
          );
          return {
            market,
            marketName: marketInfo.name,
            programId: marketInfo.programId,
          };
        } catch (e) {
          notify({
            message: 'Error loading all market',
            description: e.message,
            type: 'error',
          });
          return null;
        }
      }),
    );
    return markets.filter(
      (m): m is { market: Market; marketName: string; programId: PublicKey } =>
        !!m,
    );
  };
  return useAsyncData(
    getAllMarkets,
    tuple('getAllMarkets', customMarkets.length, connection),
    { refreshInterval: _VERY_SLOW_REFRESH_INTERVAL },
  );
}

export function useUnmigratedOpenOrdersAccounts() {
  const connection = useConnection();
  const { wallet } = useWallet();

  async function getUnmigratedOpenOrdersAccounts(): Promise<OpenOrders[]> {
    if (!wallet || !connection || !wallet.publicKey) {
      return [];
    }
    console.log('refreshing useUnmigratedOpenOrdersAccounts');
    let deprecatedOpenOrdersAccounts: OpenOrders[] = [];
    const deprecatedProgramIds = Array.from(
      new Set(
        USE_MARKETS.filter(
          ({ deprecated }) => deprecated,
        ).map(({ programId }) => programId.toBase58()),
      ),
    ).map((publicKeyStr) => new PublicKey(publicKeyStr));
    let programId: PublicKey;
    for (programId of deprecatedProgramIds) {
      try {
        const openOrdersAccounts = await OpenOrders.findForOwner(
          connection,
          wallet.publicKey,
          programId,
        );
        deprecatedOpenOrdersAccounts = deprecatedOpenOrdersAccounts.concat(
          openOrdersAccounts
            .filter(
              (openOrders) =>
                openOrders.baseTokenTotal.toNumber() ||
                openOrders.quoteTokenTotal.toNumber(),
            )
            .filter((openOrders) =>
              USE_MARKETS.some(
                (market) =>
                  market.deprecated && market.address.equals(openOrders.market),
              ),
            ),
        );
      } catch (e) {
        console.log(
          'Error loading deprecated markets',
          programId?.toBase58(),
          e.message,
        );
      }
    }
    // Maybe sort
    return deprecatedOpenOrdersAccounts;
  }

  const cacheKey = tuple(
    'getUnmigratedOpenOrdersAccounts',
    connection,
    wallet?.publicKey?.toBase58(),
  );
  const [accounts] = useAsyncData(getUnmigratedOpenOrdersAccounts, cacheKey, {
    refreshInterval: _VERY_SLOW_REFRESH_INTERVAL,
  });

  return {
    accounts,
    refresh: (clearCache: boolean) => refreshCache(cacheKey, clearCache),
  };
}

const MarketContext: React.Context<null | MarketContextValues> = React.createContext<null | MarketContextValues>(
  null,
);

const _VERY_SLOW_REFRESH_INTERVAL = 5000 * 1000;

// For things that don't really change
const _SLOW_REFRESH_INTERVAL = 5 * 1000;

// For things that change frequently
const _FAST_REFRESH_INTERVAL = 1000;

export const DEFAULT_MARKET = USE_MARKETS.find(
  ({ name, deprecated }) => name === 'CATO/USDC' && !deprecated,
);

export function getMarketDetails(
  market: Market | undefined | null,
  customMarkets: CustomMarketInfo[],
): FullMarketInfo {
  if (!market) {
    return {};
  }
  const marketInfos = getMarketInfos(customMarkets);
  const marketInfo = marketInfos.find((otherMarket) =>
    otherMarket.address.equals(market.address),
  );
  const baseCurrency =
    (market?.baseMintAddress &&
      TOKEN_MINTS.find((token) => token.address.equals(market.baseMintAddress))
        ?.name) ||
    (marketInfo?.baseLabel && `${marketInfo?.baseLabel}*`) ||
    'UNKNOWN';
  const quoteCurrency =
    (market?.quoteMintAddress &&
      TOKEN_MINTS.find((token) => token.address.equals(market.quoteMintAddress))
        ?.name) ||
    (marketInfo?.quoteLabel && `${marketInfo?.quoteLabel}*`) ||
    'UNKNOWN';

  return {
    ...marketInfo,
    marketName: marketInfo?.name,
    baseCurrency,
    quoteCurrency,
    marketInfo,
  };
}

export function useCustomMarkets() {
  const [customMarkets, setCustomMarkets] = useLocalStorageState<
    CustomMarketInfo[]
  >('customMarkets', []);
  return { customMarkets, setCustomMarkets };
}

export function MarketProvider({ marketAddress, setMarketAddress, children }) {
  const { customMarkets, setCustomMarkets } = useCustomMarkets();

  const address = marketAddress && new PublicKey(marketAddress);
  const connection = useConnection();
  const marketInfos = getMarketInfos(customMarkets);
  const marketInfo =
    address && marketInfos.find((market) => market.address.equals(address));

  // Replace existing market with a non-deprecated one on first load
  useEffect(() => {
    if (marketInfo && marketInfo.deprecated) {
      console.log('Switching markets from deprecated', marketInfo);
      if (DEFAULT_MARKET) {
        setMarketAddress(DEFAULT_MARKET.address.toBase58());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [market, setMarket] = useState<Market | null>();
  useEffect(() => {
    if (
      market &&
      marketInfo &&
      // @ts-ignore
      market._decoded.ownAddress?.equals(marketInfo?.address)
    ) {
      return;
    }
    setMarket(null);
    if (!marketInfo || !marketInfo.address) {
      notify({
        message: 'Error loading market',
        description: 'Please select a market from the dropdown',
        type: 'error',
      });
      return;
    }
    Market.load(connection, marketInfo.address, {}, marketInfo.programId)
      .then(setMarket)
      .catch((e) =>
        notify({
          message: 'Error loading market',
          description: e.message,
          type: 'error',
        }),
      );
    // eslint-disable-next-line
  }, [connection, marketInfo]);

  return (
    <MarketContext.Provider
      value={{
        market,
        ...getMarketDetails(market, customMarkets),
        setMarketAddress,
        customMarkets,
        setCustomMarkets,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function getTradePageUrl(marketAddress?: string) {
  if (!marketAddress) {
    const saved = localStorage.getItem('marketAddress');
    if (saved) {
      marketAddress = JSON.parse(saved);
    }
    marketAddress = marketAddress || DEFAULT_MARKET?.address.toBase58() || '';
  }
  return `/market/${marketAddress}`;
}

export function useSelectedTokenAccounts(): [
  SelectedTokenAccounts,
  (newSelectedTokenAccounts: SelectedTokenAccounts) => void,
] {
  const [
    selectedTokenAccounts,
    setSelectedTokenAccounts,
  ] = useLocalStorageState<SelectedTokenAccounts>('selectedTokenAccounts', {});
  return [selectedTokenAccounts, setSelectedTokenAccounts];
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('Missing market context');
  }
  return context;
}

export function useMarkPrice() {
  const [markPrice, setMarkPrice] = useState<null | number>(null);

  const [orderbook] = useOrderbook();
  const trades = useTrades();

  useEffect(() => {
    let bb = orderbook?.bids?.length > 0 && Number(orderbook.bids[0][0]);
    let ba = orderbook?.asks?.length > 0 && Number(orderbook.asks[0][0]);
    let last = trades && trades.length > 0 && trades[0].price;

    let markPrice =
      bb && ba
        ? last
          ? [bb, ba, last].sort((a, b) => a - b)[1]
          : (bb + ba) / 2
        : null;

    setMarkPrice(markPrice);
  }, [orderbook, trades]);

  return markPrice;
}

export function _useUnfilteredTrades(limit = 10000) {
  const { market } = useMarket();
  const connection = useConnection();
  async function getUnfilteredTrades(): Promise<any[] | null> {
    if (!market || !connection) {
      return null;
    }
    return await market.loadFills(connection, limit);
  }
  const [trades] = useAsyncData(
    getUnfilteredTrades,
    tuple('getUnfilteredTrades', market, connection),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
  );
  return trades;
  // NOTE: For now, websocket is too expensive since the event queue is large
  // and updates very frequently

  // let data = useAccountData(market && market._decoded.eventQueue);
  // if (!data) {
  //   return null;
  // }
  // const events = decodeEventQueue(data, limit);
  // return events
  //   .filter((event) => event.eventFlags.fill && event.nativeQuantityPaid.gtn(0))
  //   .map(market.parseFillEvent.bind(market));
}

export function useBonfidaTrades() {
  const { market } = useMarket();
  const marketAddress = market?.address.toBase58();

  async function getBonfidaTrades() {
    if (!marketAddress) {
      return null;
    }
    return await BonfidaApi.getRecentTrades(marketAddress);
  }

  return useAsyncData(
    getBonfidaTrades,
    tuple('getBonfidaTrades', marketAddress),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
    false,
  );
}

export function useOrderbookAccounts() {
  const { market } = useMarket();
  // @ts-ignore
  let bidData = useAccountData(market && market._decoded.bids);
  // @ts-ignore
  let askData = useAccountData(market && market._decoded.asks);
  return {
    bidOrderbook: market && bidData ? Orderbook.decode(market, bidData) : null,
    askOrderbook: market && askData ? Orderbook.decode(market, askData) : null,
  };
}

export function useOrderbook(
  depth = 20,
): [{ bids: number[][]; asks: number[][] }, boolean] {
  const { bidOrderbook, askOrderbook } = useOrderbookAccounts();
  const { market } = useMarket();
  const bids =
    !bidOrderbook || !market
      ? []
      : bidOrderbook.getL2(depth).map(([price, size]) => [price, size]);
  const asks =
    !askOrderbook || !market
      ? []
      : askOrderbook.getL2(depth).map(([price, size]) => [price, size]);
  return [{ bids, asks }, !!bids || !!asks];
}

// Want the balances table to be fast-updating, dont want open orders to flicker
// TODO: Update to use websocket
export function useOpenOrdersAccounts(fast = false) {
  const { market } = useMarket();
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  async function getOpenOrdersAccounts() {
    if (!connected || !wallet) {
      return null;
    }
    if (!market) {
      return null;
    }
    return await market.findOpenOrdersAccountsForOwner(
      connection,
      wallet.publicKey,
    );
  }
  return useAsyncData<OpenOrders[] | null>(
    getOpenOrdersAccounts,
    tuple('getOpenOrdersAccounts', wallet, market, connected),
    { refreshInterval: fast ? _FAST_REFRESH_INTERVAL : _SLOW_REFRESH_INTERVAL },
  );
}

export function useSelectedOpenOrdersAccount(fast = false) {
  const [accounts] = useOpenOrdersAccounts(fast);
  if (!accounts) {
    return null;
  }
  return accounts[0];
}

export function useTokenAccounts(): [
  TokenAccount[] | null | undefined,
  boolean,
] {
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  async function getTokenAccounts() {
    if (!connected || !wallet) {
      return null;
    }
    return await getTokenAccountInfo(connection, wallet.publicKey);
  }
  return useAsyncData(
    getTokenAccounts,
    tuple('getTokenAccounts', wallet, connected),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
  );
}

export function getSelectedTokenAccountForMint(
  accounts: TokenAccount[] | undefined | null,
  mint: PublicKey | undefined,
  selectedPubKey?: string | PublicKey | null,
) {
  if (!accounts || !mint) {
    return null;
  }
  const filtered = accounts.filter(
    ({ effectiveMint, pubkey }) =>
      mint.equals(effectiveMint) &&
      (!selectedPubKey ||
        (typeof selectedPubKey === 'string'
          ? selectedPubKey
          : selectedPubKey.toBase58()) === pubkey.toBase58()),
  );
  return filtered && filtered[0];
}

export function useSelectedQuoteCurrencyAccount() {
  const [accounts] = useTokenAccounts();
  const { market } = useMarket();
  const [selectedTokenAccounts] = useSelectedTokenAccounts();
  const mintAddress = market?.quoteMintAddress;
  return getSelectedTokenAccountForMint(
    accounts,
    mintAddress,
    mintAddress && selectedTokenAccounts[mintAddress.toBase58()],
  );
}

export function useSelectedBaseCurrencyAccount() {
  const [accounts] = useTokenAccounts();
  const { market } = useMarket();
  const [selectedTokenAccounts] = useSelectedTokenAccounts();
  const mintAddress = market?.baseMintAddress;
  return getSelectedTokenAccountForMint(
    accounts,
    mintAddress,
    mintAddress && selectedTokenAccounts[mintAddress.toBase58()],
  );
}

// TODO: Update to use websocket
export function useSelectedQuoteCurrencyBalances() {
  const quoteCurrencyAccount = useSelectedQuoteCurrencyAccount();
  const { market } = useMarket();
  const [accountInfo, loaded] = useAccountInfo(quoteCurrencyAccount?.pubkey);
  if (!market || !quoteCurrencyAccount || !loaded || !accountInfo) {
    return null;
  }
  if (market.quoteMintAddress.equals(TokenInstructions.WRAPPED_SOL_MINT)) {
    return accountInfo?.lamports / 1e9 ?? 0;
  }
  return market.quoteSplSizeToNumber(
    new BN(accountInfo.data.slice(64, 72), 10, 'le'),
  );
}

// TODO: Update to use websocket
export function useSelectedBaseCurrencyBalances() {
  const baseCurrencyAccount = useSelectedBaseCurrencyAccount();
  const { market } = useMarket();
  const [accountInfo, loaded] = useAccountInfo(baseCurrencyAccount?.pubkey);
  if (!market || !baseCurrencyAccount || !loaded || !accountInfo) {
    return null;
  }
  if (market.baseMintAddress.equals(TokenInstructions.WRAPPED_SOL_MINT)) {
    return accountInfo?.lamports / 1e9 ?? 0;
  }
  return market.baseSplSizeToNumber(
    new BN(accountInfo.data.slice(64, 72), 10, 'le'),
  );
}

export function useOpenOrders() {
  const { market, marketName } = useMarket();
  const openOrdersAccount = useSelectedOpenOrdersAccount();
  const { bidOrderbook, askOrderbook } = useOrderbookAccounts();
  if (!market || !openOrdersAccount || !bidOrderbook || !askOrderbook) {
    return null;
  }
  return market
    .filterForOpenOrders(bidOrderbook, askOrderbook, [openOrdersAccount])
    .map((order) => ({ ...order, marketName, market }));
}

export function useTrades(limit = 100) {
  const trades = _useUnfilteredTrades(limit);
  if (!trades) {
    return null;
  }
  // Until partial fills are each given their own fill, use maker fills
  return trades
    .filter(({ eventFlags }) => eventFlags.maker)
    .map((trade) => ({
      ...trade,
      side: trade.side === 'buy' ? 'sell' : 'buy',
    }));
}

export function useLocallyStoredFeeDiscountKey(): {
  storedFeeDiscountKey: PublicKey | undefined;
  setStoredFeeDiscountKey: (key: string) => void;
} {
  const [
    storedFeeDiscountKey,
    setStoredFeeDiscountKey,
  ] = useLocalStorageState<string>(`feeDiscountKey`, undefined);
  return {
    storedFeeDiscountKey: storedFeeDiscountKey
      ? new PublicKey(storedFeeDiscountKey)
      : undefined,
    setStoredFeeDiscountKey,
  };
}

export function useFeeDiscountKeys(): [
  (
    | {
        pubkey: PublicKey;
        feeTier: number;
        balance: number;
        mint: PublicKey;
      }[]
    | null
    | undefined
  ),
  boolean,
] {
  const { market } = useMarket();
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  const { setStoredFeeDiscountKey } = useLocallyStoredFeeDiscountKey();
  let getFeeDiscountKeys = async () => {
    if (!connected || !wallet) {
      return null;
    }
    if (!market) {
      return null;
    }
    const feeDiscountKey = await market.findFeeDiscountKeys(
      connection,
      wallet.publicKey,
    );
    if (feeDiscountKey) {
      setStoredFeeDiscountKey(feeDiscountKey[0].pubkey.toBase58());
    }
    return feeDiscountKey;
  };
  return useAsyncData(
    getFeeDiscountKeys,
    tuple('getFeeDiscountKeys', wallet, market, connected),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
  );
}

export function useFills(limit = 100) {
  const { marketName } = useMarket();
  const fills = _useUnfilteredTrades(limit);
  const [openOrdersAccounts] = useOpenOrdersAccounts();
  if (!openOrdersAccounts || openOrdersAccounts.length === 0) {
    return null;
  }
  if (!fills) {
    return null;
  }
  return fills
    .filter((fill) =>
      openOrdersAccounts.some((openOrdersAccount) =>
        fill.openOrders.equals(openOrdersAccount.publicKey),
      ),
    )
    .map((fill) => ({ ...fill, marketName }));
}

export function useAllOpenOrdersAccounts() {
  const { wallet, connected } = useWallet();
  const connection = useConnection();
  const marketInfos = useMarketInfos();
  const programIds = [
    ...new Set(marketInfos.map((info) => info.programId.toBase58())),
  ].map((stringProgramId) => new PublicKey(stringProgramId));

  const getAllOpenOrdersAccounts = async () => {
    if (!connected || !wallet) {
      return [];
    }
    return (
      await Promise.all(
        programIds.map((programId) =>
          OpenOrders.findForOwner(connection, wallet.publicKey, programId),
        ),
      )
    ).flat();
  };
  return useAsyncData(
    getAllOpenOrdersAccounts,
    tuple(
      'getAllOpenOrdersAccounts',
      connection,
      connected,
      wallet?.publicKey?.toBase58(),
      marketInfos.length,
      (programIds || []).length,
    ),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
  );
}

export function useAllOpenOrdersBalances() {
  const [
    openOrdersAccounts,
    loadedOpenOrdersAccounts,
  ] = useAllOpenOrdersAccounts();
  const [mintInfos, mintInfosConnected] = useMintInfos();
  const [allMarkets] = useAllMarkets();
  if (!loadedOpenOrdersAccounts || !mintInfosConnected) {
    return {};
  }

  const marketsByAddress = Object.fromEntries(
    (allMarkets || []).map((m) => [m.market.address.toBase58(), m]),
  );
  const openOrdersBalances: {
    [mint: string]: { market: PublicKey; free: number; total: number }[];
  } = {};
  for (let account of openOrdersAccounts || []) {
    const marketInfo = marketsByAddress[account.market.toBase58()];
    const baseMint = marketInfo?.market.baseMintAddress.toBase58();
    const quoteMint = marketInfo?.market.quoteMintAddress.toBase58();
    if (!(baseMint in openOrdersBalances)) {
      openOrdersBalances[baseMint] = [];
    }
    if (!(quoteMint in openOrdersBalances)) {
      openOrdersBalances[quoteMint] = [];
    }

    const baseMintInfo = mintInfos && mintInfos[baseMint];
    const baseFree = divideBnToNumber(
      new BN(account.baseTokenFree),
      getTokenMultiplierFromDecimals(baseMintInfo?.decimals || 0),
    );
    const baseTotal = divideBnToNumber(
      new BN(account.baseTokenTotal),
      getTokenMultiplierFromDecimals(baseMintInfo?.decimals || 0),
    );
    const quoteMintInfo = mintInfos && mintInfos[quoteMint];
    const quoteFree = divideBnToNumber(
      new BN(account.quoteTokenFree),
      getTokenMultiplierFromDecimals(quoteMintInfo?.decimals || 0),
    );
    const quoteTotal = divideBnToNumber(
      new BN(account.quoteTokenTotal),
      getTokenMultiplierFromDecimals(quoteMintInfo?.decimals || 0),
    );

    openOrdersBalances[baseMint].push({
      market: account.market,
      free: baseFree,
      total: baseTotal,
    });
    openOrdersBalances[quoteMint].push({
      market: account.market,
      free: quoteFree,
      total: quoteTotal,
    });
  }
  return openOrdersBalances;
}

export const useAllOpenOrders = (): {
  openOrders: { orders: Order[]; marketAddress: string }[] | null | undefined;
  loaded: boolean;
  refreshOpenOrders: () => void;
} => {
  const connection = useConnection();
  const { connected, wallet } = useWallet();
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [openOrders, setOpenOrders] = useState<
    { orders: Order[]; marketAddress: string }[] | null | undefined
  >(null);
  const [lastRefresh, setLastRefresh] = useState(0);

  const refreshOpenOrders = () => {
    if (new Date().getTime() - lastRefresh > 10 * 1000) {
      setRefresh((prev) => prev + 1);
    } else {
      console.log('not refreshing');
    }
  };

  useEffect(() => {
    if (connected && wallet) {
      const getAllOpenOrders = async () => {
        setLoaded(false);
        const _openOrders: { orders: Order[]; marketAddress: string }[] = [];
        const getOpenOrdersForMarket = async (marketInfo: MarketInfo) => {
          await sleep(1000 * Math.random()); // Try not to hit rate limit
          try {
            const market = await Market.load(
              connection,
              marketInfo.address,
              undefined,
              marketInfo.programId,
            );
            const orders = await market.loadOrdersForOwner(
              connection,
              wallet?.publicKey,
              30000,
            );
            _openOrders.push({
              orders: orders,
              marketAddress: marketInfo.address.toBase58(),
            });
          } catch (e) {
            console.warn(`Error loading open order ${marketInfo.name} - ${e}`);
          }
        };
        await Promise.all(USE_MARKETS.map((m) => getOpenOrdersForMarket(m)));
        setOpenOrders(_openOrders);
        setLastRefresh(new Date().getTime());
        setLoaded(true);
      };
      getAllOpenOrders();
    }
  }, [connection, connected, wallet, refresh]);
  return {
    openOrders: openOrders,
    loaded: loaded,
    refreshOpenOrders: refreshOpenOrders,
  };
};

export function useBalances(): Balances[] {
  const baseCurrencyBalances = useSelectedBaseCurrencyBalances();
  const quoteCurrencyBalances = useSelectedQuoteCurrencyBalances();
  const openOrders = useSelectedOpenOrdersAccount(true);
  const { baseCurrency, quoteCurrency, market } = useMarket();
  const baseExists =
    openOrders && openOrders.baseTokenTotal && openOrders.baseTokenFree;
  const quoteExists =
    openOrders && openOrders.quoteTokenTotal && openOrders.quoteTokenFree;
  if (
    baseCurrency === 'UNKNOWN' ||
    quoteCurrency === 'UNKNOWN' ||
    !baseCurrency ||
    !quoteCurrency
  ) {
    return [];
  }
  return [
    {
      market,
      key: `${baseCurrency}${quoteCurrency}${baseCurrency}`,
      coin: baseCurrency,
      wallet: baseCurrencyBalances,
      orders:
        baseExists && market && openOrders
          ? market.baseSplSizeToNumber(
              openOrders.baseTokenTotal.sub(openOrders.baseTokenFree),
            )
          : null,
      openOrders,
      unsettled:
        baseExists && market && openOrders
          ? market.baseSplSizeToNumber(openOrders.baseTokenFree)
          : null,
    },
    {
      market,
      key: `${quoteCurrency}${baseCurrency}${quoteCurrency}`,
      coin: quoteCurrency,
      wallet: quoteCurrencyBalances,
      openOrders,
      orders:
        quoteExists && market && openOrders
          ? market.quoteSplSizeToNumber(
              openOrders.quoteTokenTotal.sub(openOrders.quoteTokenFree),
            )
          : null,
      unsettled:
        quoteExists && market && openOrders
          ? market.quoteSplSizeToNumber(openOrders.quoteTokenFree)
          : null,
    },
  ];
}

export function useWalletBalancesForAllMarkets(): {
  mint: string;
  balance: number;
}[] {
  const [tokenAccounts] = useTokenAccounts();
  const { connected } = useWallet();
  const [mintInfos, mintInfosConnected] = useMintInfos();

  if (!connected || !mintInfosConnected) {
    return [];
  }

  let balances: { [mint: string]: number } = {};
  for (let account of tokenAccounts || []) {
    if (!account.account) {
      continue;
    }
    let parsedAccount;
    if (account.effectiveMint.equals(WRAPPED_SOL_MINT)) {
      parsedAccount = {
        mint: WRAPPED_SOL_MINT,
        owner: account.pubkey,
        amount: account.account.lamports,
      };
    } else {
      parsedAccount = parseTokenAccountData(account.account.data);
    }
    if (!(parsedAccount.mint.toBase58() in balances)) {
      balances[parsedAccount.mint.toBase58()] = 0;
    }
    const mintInfo = mintInfos && mintInfos[parsedAccount.mint.toBase58()];
    const additionalAmount = divideBnToNumber(
      new BN(parsedAccount.amount),
      getTokenMultiplierFromDecimals(mintInfo?.decimals || 0),
    );
    balances[parsedAccount.mint.toBase58()] += additionalAmount;
  }
  return Object.entries(balances).map(([mint, balance]) => {
    return { mint, balance };
  });
}

export function useUnmigratedDeprecatedMarkets() {
  const connection = useConnection();
  const { accounts } = useUnmigratedOpenOrdersAccounts();
  const marketsList =
    accounts &&
    Array.from(new Set(accounts.map((openOrders) => openOrders.market)));
  const deps = marketsList && marketsList.map((m) => m.toBase58());

  const useUnmigratedDeprecatedMarketsInner = async () => {
    if (!marketsList) {
      return null;
    }
    const getMarket = async (address) => {
      const marketInfo = USE_MARKETS.find((market) =>
        market.address.equals(address),
      );
      if (!marketInfo) {
        console.log('Failed loading market');
        notify({
          message: 'Error loading market',
          type: 'error',
        });
        return null;
      }
      try {
        console.log('Loading market', marketInfo.name);
        // NOTE: Should this just be cached by (connection, marketInfo.address, marketInfo.programId)?
        return await Market.load(
          connection,
          marketInfo.address,
          {},
          marketInfo.programId,
        );
      } catch (e) {
        console.log('Failed loading market', marketInfo.name, e);
        notify({
          message: 'Error loading market',
          description: e.message,
          type: 'error',
        });
        return null;
      }
    };
    return (await Promise.all(marketsList.map(getMarket))).filter((x) => x);
  };
  const [markets] = useAsyncData(
    useUnmigratedDeprecatedMarketsInner,
    tuple(
      'useUnmigratedDeprecatedMarketsInner',
      connection,
      deps && deps.toString(),
    ),
    { refreshInterval: _VERY_SLOW_REFRESH_INTERVAL },
  );
  if (!markets) {
    return null;
  }
  return markets.map((market) => ({
    market,
    openOrdersList: accounts?.filter(
      (openOrders) => market && openOrders.market.equals(market.address),
    ),
  }));
}

export function useGetOpenOrdersForDeprecatedMarkets(): {
  openOrders: OrderWithMarketAndMarketName[] | null | undefined;
  loaded: boolean;
  refreshOpenOrders: () => void;
} {
  const { connected, wallet } = useWallet();
  const { customMarkets } = useCustomMarkets();
  const connection = useConnection();
  const marketsAndOrders = useUnmigratedDeprecatedMarkets();
  const marketsList =
    marketsAndOrders && marketsAndOrders.map(({ market }) => market);

  // This isn't quite right: open order balances could change
  const deps =
    marketsList &&
    marketsList
      .filter((market): market is Market => !!market)
      .map((market) => market.address.toBase58());

  async function getOpenOrdersForDeprecatedMarkets() {
    if (!connected || !wallet) {
      return null;
    }
    if (!marketsList) {
      return null;
    }
    console.log('refreshing getOpenOrdersForDeprecatedMarkets');
    const getOrders = async (market: Market | null) => {
      if (!market) {
        return null;
      }
      const { marketName } = getMarketDetails(market, customMarkets);
      try {
        console.log('Fetching open orders for', marketName);
        // Can do better than this, we have the open orders accounts already
        return (
          await market.loadOrdersForOwner(connection, wallet.publicKey)
        ).map((order) => ({ marketName, market, ...order }));
      } catch (e) {
        console.log('Failed loading open orders', market.address.toBase58(), e);
        notify({
          message: `Error loading open orders for deprecated ${marketName}`,
          description: e.message,
          type: 'error',
        });
        return null;
      }
    };
    return (await Promise.all(marketsList.map(getOrders)))
      .filter((x): x is OrderWithMarketAndMarketName[] => !!x)
      .flat();
  }

  const cacheKey = tuple(
    'getOpenOrdersForDeprecatedMarkets',
    connected,
    connection,
    wallet,
    deps && deps.toString(),
  );
  const [openOrders, loaded] = useAsyncData(
    getOpenOrdersForDeprecatedMarkets,
    cacheKey,
    {
      refreshInterval: _VERY_SLOW_REFRESH_INTERVAL,
    },
  );
  console.log('openOrders', openOrders);
  return {
    openOrders,
    loaded,
    refreshOpenOrders: () => refreshCache(cacheKey),
  };
}

export function useBalancesForDeprecatedMarkets() {
  const markets = useUnmigratedDeprecatedMarkets();
  const [customMarkets] = useLocalStorageState<CustomMarketInfo[]>(
    'customMarkets',
    [],
  );
  if (!markets) {
    return null;
  }

  const openOrderAccountBalances: DeprecatedOpenOrdersBalances[] = [];
  markets.forEach(({ market, openOrdersList }) => {
    const { baseCurrency, quoteCurrency, marketName } = getMarketDetails(
      market,
      customMarkets,
    );
    if (!baseCurrency || !quoteCurrency || !market) {
      return;
    }
    (openOrdersList || []).forEach((openOrders) => {
      const inOrdersBase =
        openOrders?.baseTokenTotal &&
        openOrders?.baseTokenFree &&
        market.baseSplSizeToNumber(
          openOrders.baseTokenTotal.sub(openOrders.baseTokenFree),
        );
      const inOrdersQuote =
        openOrders?.quoteTokenTotal &&
        openOrders?.quoteTokenFree &&
        market.baseSplSizeToNumber(
          openOrders.quoteTokenTotal.sub(openOrders.quoteTokenFree),
        );
      const unsettledBase =
        openOrders?.baseTokenFree &&
        market.baseSplSizeToNumber(openOrders.baseTokenFree);
      const unsettledQuote =
        openOrders?.quoteTokenFree &&
        market.baseSplSizeToNumber(openOrders.quoteTokenFree);

      openOrderAccountBalances.push({
        marketName,
        market,
        coin: baseCurrency,
        key: `${marketName}${baseCurrency}`,
        orders: inOrdersBase,
        unsettled: unsettledBase,
        openOrders,
      });
      openOrderAccountBalances.push({
        marketName,
        market,
        coin: quoteCurrency,
        key: `${marketName}${quoteCurrency}`,
        orders: inOrdersQuote,
        unsettled: unsettledQuote,
        openOrders,
      });
    });
  });
  return openOrderAccountBalances;
}

export function getMarketInfos(
  customMarkets: CustomMarketInfo[],
): MarketInfo[] {
  const customMarketsInfo = customMarkets.map((m) => ({
    ...m,
    address: new PublicKey(m.address),
    programId: new PublicKey(m.programId),
    deprecated: false,
  }));

  return [...customMarketsInfo, ...USE_MARKETS];
}

export function useMarketInfos() {
  const { customMarkets } = useCustomMarkets();
  return getMarketInfos(customMarkets);
}

/**
 * If selling, choose min tick size. If buying choose a price
 * s.t. given the state of the orderbook, the order will spend
 * `cost` cost currency.
 *
 * @param orderbook serum Orderbook object
 * @param cost quantity to spend. Base currency if selling,
 *  quote currency if buying.
 * @param tickSizeDecimals size of price increment of the market
 */
export function getMarketOrderPrice(
  orderbook: Orderbook,
  cost: number,
  tickSizeDecimals?: number,
) {
  if (orderbook.isBids) {
    return orderbook.market.tickSize;
  }
  let spentCost = 0;
  let price, sizeAtLevel, costAtLevel: number;
  const asks = orderbook.getL2(1000);
  for ([price, sizeAtLevel] of asks) {
    costAtLevel = price * sizeAtLevel;
    if (spentCost + costAtLevel > cost) {
      break;
    }
    spentCost += costAtLevel;
  }
  const sendPrice = Math.min(price * 1.02, asks[0][0] * 1.05);
  let formattedPrice;
  if (tickSizeDecimals) {
    formattedPrice = floorToDecimal(sendPrice, tickSizeDecimals);
  } else {
    formattedPrice = sendPrice;
  }
  return formattedPrice;
}

export function getExpectedFillPrice(
  orderbook: Orderbook,
  cost: number,
  tickSizeDecimals?: number,
) {
  let spentCost = 0;
  let avgPrice = 0;
  let price, sizeAtLevel, costAtLevel: number;
  for ([price, sizeAtLevel] of orderbook.getL2(1000)) {
    costAtLevel = (orderbook.isBids ? 1 : price) * sizeAtLevel;
    if (spentCost + costAtLevel > cost) {
      avgPrice += (cost - spentCost) * price;
      spentCost = cost;
      break;
    }
    avgPrice += costAtLevel * price;
    spentCost += costAtLevel;
  }
  const totalAvgPrice = avgPrice / Math.min(cost, spentCost);
  let formattedPrice;
  if (tickSizeDecimals) {
    formattedPrice = floorToDecimal(totalAvgPrice, tickSizeDecimals);
  } else {
    formattedPrice = totalAvgPrice;
  }
  return formattedPrice;
}

export function useCurrentlyAutoSettling(): [boolean, (currentlyAutoSettling: boolean) => void] {
  const [currentlyAutoSettling, setCurrentlyAutosettling] = useState<boolean>(false);
  return [currentlyAutoSettling, setCurrentlyAutosettling];
}
