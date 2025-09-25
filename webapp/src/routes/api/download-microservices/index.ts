// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Expiration } from '$lib/issuanceFlows/expiration';
import { pb } from '$lib/pocketbase';
import type {
	AuthorizationServersResponse,
	IssuersResponse,
	OrganizationsResponse,
	RelyingPartiesResponse,
	ServicesResponse,
	TemplatesResponse,
	VerificationFlowsResponse
} from '$lib/pocketbase/types';

//

export async function requestDownloadMicroservices(organizationId: string, fetchFn = fetch) {
	return await fetchFn('/api/download-microservices', {
		method: 'POST',
		body: organizationId,
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`
		}
	});
}

//

export type DownloadMicroservicesRequestBody = {
	authorization_servers: AuthorizationServersResponse[];
	credential_issuers: IssuersResponse[];
	relying_parties: RelyingPartiesResponse[];
	templates: TemplatesResponse[];
	issuance_flows: ServicesResponse<Expiration>[];
	verification_flows: VerificationFlowsResponse[];
	organization: OrganizationsResponse;
};
