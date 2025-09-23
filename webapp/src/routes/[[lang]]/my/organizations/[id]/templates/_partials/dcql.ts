import type { ServicesResponse } from '$lib/pocketbase/types';
import { type ClaimInput, inputToClaim } from './claims';

export function makeFromIssuanceFlowAndClaims(
	issuanceFlow: ServicesResponse,
	claims: ClaimInput[]
) {
	return {
		credentials: [
			{
				id: 'my_credential',
				format: issuanceFlow.cryptography === 'W3C-VC' ? 'ldp_vc' : 'dc+sd-jwt',

				meta:
					issuanceFlow.cryptography === 'W3C-VC'
						? { type_values: [[issuanceFlow.type_name]] }
						: { vct_values: [issuanceFlow.type_name] },

				claims: claims
					.filter((c) => c.selected)
					.map((c) =>
						inputToClaim(c, (id) =>
							issuanceFlow.cryptography === 'W3C-VC' ? ['credentialSubject', id] : [id]
						)
					)
			}
		]
	};
}

export function getExample() {
	return {
		credentials: [
			{
				id: 'my_credential',
				format: 'dc+sd-jwt',
				meta: {
					vct_values: ['https://credentials.example.com/identity_credential']
				}
			}
		]
	};
}
