// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as x509 from '@peculiar/x509';
import type { AlgorithmName, Certificate, CertificateData, CertificateKey } from './types';
import { BEGIN_EC, END_EC, BEGIN_CERTIFICATE, END_CERTIFICATE } from './strings';
import { pb } from '$lib/pocketbase';

//

const ALGORITHM: EcKeyGenParams = {
	name: 'ECDSA',
	namedCurve: 'P-256'
};

//

export async function createAutosignedCertificateData(
	username: string,
	did: string
): Promise<CertificateData> {
	const keyPair = await generateKeyPair();
	return {
		certificate: await createCACertificate(keyPair, username, did),
		key: await createCertificateKey(keyPair)
	};
}

async function createCertificateKey(keyPair: CryptoKeyPair): Promise<CertificateKey> {
	// storing the sk in local storage
	const sk = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
	const sk_b64 = btoa(String.fromCharCode(...new Uint8Array(sk))).replace(/.{64}/g, '$&\n');
	const completeKey = [BEGIN_EC, sk_b64, END_EC].join('\n');

	// raw key to be used in zenroom
	const sk_jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
	if (!sk_jwk.d) throw new Error('Undefined sk_jwk.d');

	return {
		value: completeKey,
		zenroomValue: url64ToBase64(sk_jwk.d)
	};
}

/**
 * Create a certificate signed by the installation CA.
 * 1. Generate a CSR (PKCS#10) client-side
 * 2. Send it to the backend CA signing endpoint
 * 3. Receive the CA-signed certificate
 */
async function createCACertificate(
	keyPair: CryptoKeyPair,
	username: string,
	did: string
): Promise<Certificate> {
	// Create a Certificate Signing Request (CSR)
	const csr = await x509.Pkcs10CertificateRequestGenerator.create({
		name: 'CN=Didroom - ' + username,
		signingAlgorithm: ALGORITHM,
		keys: keyPair,
		extensions: [new x509.SubjectAlternativeNameExtension([{ type: 'url', value: did }])]
	});

	// Get the CSR in DER format, then base64 encode it
	const csrDER = csr.rawData;
	const csrBase64 = btoa(String.fromCharCode(...new Uint8Array(csrDER)));

	// Send CSR to the backend CA for signing
	const response = await fetch(`${pb.baseURL}/api/ca/sign`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${pb.authStore.token}`
		},
		body: JSON.stringify({ csr: csrBase64 })
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(`CA signing failed: ${err.error || response.statusText}`);
	}

	const result = await response.json();
	const certPEM: string = result.certificate;

	// Extract the base64 certificate value (strip PEM headers)
	const parsedCert = certPEM
		.replace(BEGIN_CERTIFICATE, '')
		.replace(END_CERTIFICATE, '')
		.replace(/\n/g, '')
		.trim();

	return {
		value: parsedCert,
		algorithm: ALGORITHM.name as AlgorithmName
	};
}

//

function generateKeyPair() {
	return crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
}

function url64ToBase64(input: string): string {
	// Replace non-url compatible chars with base64 standard chars
	input = input.replace(/-/g, '+').replace(/_/g, '/');

	// Pad out with standard base64 required padding characters
	const pad = input.length % 4;
	if (pad) {
		if (pad === 1) {
			throw new Error(
				'InvalidLengthError: Input base64url string is the wrong length to determine padding'
			);
		}
		input += new Array(5 - pad).join('=');
	}
	return input;
}
