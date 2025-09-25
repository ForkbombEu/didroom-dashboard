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
import type { DownloadMicroservicesPostBody } from './+server';

//

export async function requestDownloadMicroservices(organizationId: string, fetchFn = fetch) {
	const body: DownloadMicroservicesPostBody = {
		organizationId
	};
	return await sendAuthenticatedPostRequest('/api/download-microservices', body, fetchFn);
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

//

function sendAuthenticatedPostRequest<T extends Record<string, unknown>>(
	url: string,
	body: T,
	fetchFn = fetch
) {
	return fetchFn(url, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			'content-type': 'application/json',
			Authorization: `Bearer ${pb.authStore.token}`
		}
	});
}
