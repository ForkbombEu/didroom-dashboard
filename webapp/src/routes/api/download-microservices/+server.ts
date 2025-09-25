// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { RequestHandler } from '@sveltejs/kit';
import AdmZip from 'adm-zip';
import { type DownloadMicroservicesRequestBody } from '.';
import { create_credential_issuer_zip } from './credential-issuer';
import { createAuthorizationServerZip } from './authorization-server';
import { create_verifier_zip } from './relying-party';
import { addZipAsSubfolder } from './utils/zip';
import { createSlug } from './utils/strings';
import { startDockerCompose, endDockerCompose, setupDockerCompose } from './utils/dockercompose';
import { PUBLIC_DIDROOM_MICROSERVICES_BRANCH } from '$env/static/public';
import type { ServicesResponse, TypedPocketBase } from '$lib/pocketbase/types';
import type { RecordFullListOptions } from 'pocketbase';
import type { Expiration } from '$lib/issuanceFlows/expiration';
import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

//

export type DownloadMicroservicesPostBody = {
	organizationId: string;
};

const DIDROOM_MICROSERVICES_URL = `https://github.com/ForkbombEu/DIDroom_microservices/archive/refs/heads/${PUBLIC_DIDROOM_MICROSERVICES_BRANCH}.zip`;

export const POST: RequestHandler = async ({ fetch, request }) => {
	const token = request.headers.get('Authorization');
	if (!token) return errorResponse('missing_token');
	try {
		const body = await parseRequestBody(request);
		const didroom_microservices_zip = await fetchZipFileAsBuffer(DIDROOM_MICROSERVICES_URL, fetch);
		const data = await fetchOrganizationData(token, body.organizationId, fetch);
		const zip = createMicroservicesZip(didroom_microservices_zip, data);
		return zipResponse(zip);
	} catch (e) {
		console.log(e);
		return errorResponse(e);
	}
};

//

function createMicroservicesZip(
	didroom_microservices_zip_buffer: Buffer,
	data: DownloadMicroservicesRequestBody
): AdmZip {
	const zip = new AdmZip();

	const dockerComposeFiles = startDockerCompose();

	data.authorization_servers.forEach((a) => {
		setupDockerCompose(dockerComposeFiles, a, 'authz_server');
		const az = createAuthorizationServerZip(didroom_microservices_zip_buffer, a, data);
		addZipAsSubfolder(zip, az, `as_${createSlug(a.name)}`);
	});
	data.relying_parties.forEach((v) => {
		setupDockerCompose(dockerComposeFiles, v, 'verifier');
		const rz = create_verifier_zip(didroom_microservices_zip_buffer, v, data);
		addZipAsSubfolder(zip, rz, `v_${createSlug(v.name)}`);
	});
	data.credential_issuers.forEach((c) => {
		setupDockerCompose(dockerComposeFiles, c, 'credential_issuer');
		const cz = create_credential_issuer_zip(didroom_microservices_zip_buffer, c, data);
		addZipAsSubfolder(zip, cz, `ci_${createSlug(c.name)}`);
	});

	endDockerCompose(zip, dockerComposeFiles);
	return zip;
}

//

function parseRequestBody(request: Request): Promise<DownloadMicroservicesPostBody> {
	return request.json();
}

async function fetchZipFileAsBuffer(url: string, fetchFn = fetch): Promise<Buffer> {
	const zipResponse = await fetchFn(url);
	return Buffer.from(await zipResponse.arrayBuffer());
}

function zipResponse(zip: AdmZip) {
	// @ts-expect-error - Dunno
	return new Response(zip.toBuffer(), {
		status: 200,
		headers: {
			'Content-Type': 'application/octet-stream'
		}
	});
}

function errorResponse(e: unknown) {
	return new Response(e instanceof Error ? e.message : 'Internal Server Error', {
		status: 500
	});
}

/* */

async function fetchOrganizationData(
	token: string,
	organizationId: string,
	fetchFn = fetch
): Promise<DownloadMicroservicesRequestBody> {
	const pb = new PocketBase(PUBLIC_POCKETBASE_URL) as TypedPocketBase;
	pb.authStore.save(token, null);

	const pbOptions: RecordFullListOptions = {
		filter: `organization.id = '${organizationId}'`,
		fetch: fetchFn
	};

	const organization = await pb.collection('organizations').getOne(organizationId);
	const issuance_flows = await pb
		.collection('services')
		.getFullList<ServicesResponse<Expiration>>(pbOptions);

	const verification_flows = await pb.collection('verification_flows').getFullList(pbOptions);
	const templates = await pb.collection('templates').getFullList(pbOptions);

	const relying_parties = (await pb.collection('relying_parties').getFullList(pbOptions)).filter(
		(rp) => verification_flows.map((vf) => vf.relying_party).includes(rp.id)
	);
	const credential_issuers = (await pb.collection('issuers').getFullList(pbOptions)).filter((ci) =>
		issuance_flows.map((flow) => flow.credential_issuer).includes(ci.id)
	);
	const authorization_servers = (
		await pb.collection('authorization_servers').getFullList(pbOptions)
	).filter((as) => issuance_flows.map((flow) => flow.authorization_server).includes(as.id));

	return {
		organization,
		issuance_flows,
		verification_flows,
		templates,
		relying_parties,
		credential_issuers,
		authorization_servers
	};
}
