import ElectrumClient from 'electrum-client';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { randomBytes } from 'react-native-randombytes';
import { Platform } from 'react-native';
import {
	IAddress,
	TAccount,
	TAvailableNetworks,
	THeader,
	TLdkStart,
	TTransactionData,
	TTransactionPosition,
} from '@synonymdev/react-native-ldk';

import {
	getAddressFromScriptPubKey,
	getNetwork,
	ldkNetwork,
} from '../../utils/helpers';
import { TGetAddressHistory } from '../../utils/types';

type TElectrumHeader = {
	height: number;
	hex: string;
};

export default class TestProfile {
	name: string;
	electrum: ElectrumClient;
	seed: string;
	network: TAvailableNetworks;
	tip: TElectrumHeader = { height: 0, hex: '' };
	public headerCallback?: (params: TElectrumHeader) => void;

	constructor(opts: any = {}) {
		this.name = opts?.name ?? 'Test' + Math.floor(Math.random() * 1000);
		this.seed = opts?.seed ?? randomBytes(32).toString('hex');
		this.network = opts?.network ?? 'bitcoinRegtest';
		this.headerCallback = opts?.headerCallback;
		this.electrum = new ElectrumClient(
			global.net,
			global.tls,
			opts?.electrum?.port || 60001,
			opts?.electrum?.host || 'localhost',
			'tcp',
		);
	}

	public init = async (): Promise<void> => {
		this.electrum.subscribe.on(
			'blockchain.headers.subscribe',
			(params: Array<TElectrumHeader>) => {
				const tip = params.sort((a, b) => a.height - b.height).reverse()[0];
				this.tip = tip;
				this.headerCallback?.(tip);
			},
		);
		await this.electrum.initElectrum({ client: 'profile', version: '1.4' });
		this.tip = await this.electrum.blockchainHeaders_subscribe();
		console.log('Created profile', this.name);
	};

	public getStartParams = (): TLdkStart => {
		const account = this.getAccount();

		return {
			getBestBlock: this.getBestBlock,
			account: account,
			getAddress: this.getAddress,
			getScriptPubKeyHistory: this.getScriptPubKeyHistory,
			getFees: () =>
				Promise.resolve({
					onChainSweep: 4,
					maxAllowedNonAnchorChannelRemoteFee: Math.max(25, 4 * 10),
					minAllowedAnchorChannelRemoteFee: 1,
					minAllowedNonAnchorChannelRemoteFee: Math.max(1 - 1, 0),
					anchorChannelFee: 2,
					nonAnchorChannelFee: 3,
					channelCloseMinimum: 1,
				}),
			getTransactionData: this.getTransactionData,
			getTransactionPosition: this.getTransactionPosition,
			broadcastTransaction: this.broadcastTransaction,
			network: ldkNetwork(this.network),
			// forceCloseOnStartup: { forceClose: true, broadcastLatestTx: false },
			forceCloseOnStartup: undefined,
			// trustedZeroConfPeers: [],
			// backupServerDetails: {
			// 	host: 'https://blocktank.synonym.to/staging-backups-ldk',
			// 	serverPubKey:
			// 		'02c03b8b8c1b5500b622646867d99bf91676fac0f38e2182c91a9ff0d053a21d6d',
			// },
			backupServerDetails: {
				host: 'http://127.0.0.1:3003',
				serverPubKey:
					'0319c4ff23820afec0c79ce3a42031d7fef1dff78b7bdd69b5560684f3e1827675',
			},
		};
	};

	public cleanup = async (): Promise<void> => {
		if (Platform.OS === 'android') {
			// FIXME: for some reason electrum?.close() on android causes a crash
			return;
		}
		this.electrum?.close();
	};

	public getBestBlock = async (): Promise<THeader> => {
		const tip = this.tip;
		const block = bitcoin.Block.fromHex(tip.hex);
		const hash = block.getId();
		return { height: tip.height, hex: tip.hex, hash };
	};

	public getAccount = (): TAccount => {
		return { name: this.name, seed: this.seed };
	};

	public getAddress = async (): Promise<IAddress> => {
		const network = getNetwork(this.network);
		const mnemonic = bip39.entropyToMnemonic(this.seed);
		const mnemonicSeed = await bip39.mnemonicToSeed(mnemonic);
		const root = bip32.fromSeed(mnemonicSeed, network);
		const keyPair = root.derivePath("m/84'/1'/0'/0/0");
		const address = bitcoin.payments.p2wpkh({
			pubkey: keyPair.publicKey,
			network,
		}).address;
		if (!address) {
			throw new Error('Failed to generate address');
		}
		return {
			address: address,
			publicKey: keyPair.publicKey.toString('hex'),
		};
	};

	public getScriptPubKeyHistory = async (
		scriptPubkey: string,
	): Promise<TGetAddressHistory[]> => {
		const address = getAddressFromScriptPubKey(scriptPubkey);
		const network = getNetwork(this.network);
		const script = bitcoin.address.toOutputScript(address, network);
		const hash = bitcoin.crypto.sha256(script);
		const reversedHash = Buffer.from(hash).reverse();
		const scriptHash = reversedHash.toString('hex');

		const history = await this.electrum.blockchainScripthash_getHistory(
			scriptHash,
		);

		if (!history) {
			return [];
		}

		return history.map((h) => ({
			txid: h.tx_hash,
			height: h.height,
		}));
	};

	public getTransactionData = async (
		txid: string,
	): Promise<TTransactionData | undefined> => {
		const tx = await this.electrum.blockchainTransaction_get(txid, true);
		const { height: currentHeight } = await this.getBestBlock();
		const height = currentHeight - tx.confirmations + 1;
		if (!this.electrum.blockchainBlock_header) {
			throw new Error('this.electrum.blockchainBlock_header is undefined');
		}
		const header = await this.electrum.blockchainBlock_header(height);
		const vout = tx.vout.map(({ n, value, scriptPubKey: { hex } }) => {
			return { n, hex, value };
		});

		const res = {
			header,
			height,
			transaction: tx.hex,
			vout,
		};

		return res;
	};

	public getTransactionPosition = async ({
		tx_hash,
		height,
	}: {
		tx_hash: string;
		height: number;
	}): Promise<TTransactionPosition> => {
		try {
			const res = await this.electrum.blockchainTransaction_getMerkle(
				tx_hash,
				height,
			);
			return res.pos;
		} catch (err) {
			return -1;
		}
	};

	public broadcastTransaction = async (tx: string): Promise<string> => {
		const res = await this.electrum.blockchainTransaction_broadcast(tx);
		return res;
	};
}
