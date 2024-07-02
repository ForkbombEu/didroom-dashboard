import { getErrorMessage } from '$lib/errorHandling';
import { error, json, type RequestEvent } from '@sveltejs/kit';

const SHA256 = 'SHA256';
const SHA512 = 'SHA512';
const ECDSA = 'ECDSA';
const EdDSA = 'EdDSA';
const RSA = 'RSA';

export const POST = async (evt: RequestEvent) => {
	const req = await evt.request.json();
	const { fetch } = evt;

	const params: Record<string, any> = {
		parameters: {
			signingCertificate: {
				encodedCertificate: req.certPem
			},
			certificateChain: [],
			detachedContents: null,
			asicContainerType: null,
			digestAlgorithm: 'SHA256',
			contentTimestampParameters: {
				digestAlgorithm: 'SHA256',
				canonicalizationMethod: 'http://www.w3.org/2001/10/xml-exc-c14n#',
				timestampContainerForm: null
			},
			signatureTimestampParameters: {
				digestAlgorithm: 'SHA256',
				canonicalizationMethod: 'http://www.w3.org/2001/10/xml-exc-c14n#',
				timestampContainerForm: null
			},
			archiveTimestampParameters: {
				digestAlgorithm: 'SHA256',
				canonicalizationMethod: 'http://www.w3.org/2001/10/xml-exc-c14n#',
				timestampContainerForm: null
			},
			signWithExpiredCertificate: false,
			generateTBSWithoutCertificate: false,
			blevelParams: {
				trustAnchorBPPolicy: true,
				signingDate: req.ts_now,
				claimedSignerRoles: null,
				policyId: null,
				policyQualifier: null,
				policyDescription: null,
				policyDigestAlgorithm: null,
				policyDigestValue: null,
				policySpuri: null,
				commitmentTypeIndications: null,
				signerLocationPostalAddress: [],
				signerLocationPostalCode: null,
				signerLocationLocality: null,
				signerLocationStateOrProvince: null,
				signerLocationCountry: null,
				signerLocationStreet: null
			}
		},
		toSignDocument: {
			bytes: req.doc,
			digestAlgorithm: null,
			name: 'RemoteDocument'
		},
		signatureValue: {
			value: req.signedDigest
		}
	};

	switch (req.algo) {
		case 'xades':
			params.parameters.signaturePackaging = 'ENVELOPING';
			params.parameters.signatureLevel = 'XAdES_BASELINE_B';
			break;
		case 'pades':
			params.parameters.signatureLevel = 'PAdES_BASELINE_B';
			break;
		case 'jades':
			params.parameters.signaturePackaging = 'ENVELOPING';
			params.parameters.signatureLevel = 'JAdES_BASELINE_B';
			break;
		case 'cades':
			params.parameters.signatureLevel = 'CAdES_BASELINE_B';
			params.parameters.signaturePackaging = 'ENVELOPING';
			break;
	}
	switch (req.signatureAlgorithmName) {
		case ECDSA:
			params.parameters.signatureAlgorithm = ECDSA + '_SHA256';
			params.parameters.encryptionAlgorithm = ECDSA;
			params.signatureValue.algorithm = ECDSA + '_SHA256';
			break;
		case EdDSA:
			params.parameters.signatureAlgorithm = 'ED25519';
			params.parameters.digestAlgorithm = SHA512;
			params.parameters.encryptionAlgorithm = 'EDDSA';
			params.parameters.contentTimestampParameters.digestAlgorithm = SHA512;
			params.parameters.signatureTimestampParameters.digestAlgorithm = SHA512;
			params.parameters.archiveTimestampParameters.digestAlgorithm = SHA512;
			params.signatureValue.algorithm = 'ED25519';
			break;
		case 'RSASSA-PKCS1-v1_5':
			params.parameters.signatureAlgorithm = RSA + '_SHA256';
			params.parameters.encryptionAlgorithm = RSA;
			params.signatureValue.algorithm = RSA + '_SHA256';
			break;
		case '1.2.840.113549.1.1.10':
			params.parameters.signatureAlgorithm = 'RSA_SSA_PSS_SHA256_MGF1';
			params.parameters.encryptionAlgorithm = RSA;
			params.signatureValue.algorithm = 'RSA_SSA_PSS_SHA256_MGF1';
			break;
	}

	const signedDocument = await fetch(
		`http://dss.forkbomb.eu:8080/services/rest/signature/one-document/signDocument`,
		{
			method: 'POST',
			body: JSON.stringify(params),
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			}
		}
	);

	try {
		return json(await signedDocument.json());
	} catch (e) {
		return error(500, getErrorMessage(e));
	}
};
