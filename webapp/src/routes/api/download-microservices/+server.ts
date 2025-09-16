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

//

const DIDROOM_MICROSERVICES_URL =
	`https://github.com/ForkbombEu/DIDroom_microservices/archive/refs/heads/${PUBLIC_DIDROOM_MICROSERVICES_BRANCH}.zip`;

export const POST: RequestHandler = async ({ fetch, request }) => {
	try {
		const didroom_microservices_zip = await fetchZipFileAsBuffer(DIDROOM_MICROSERVICES_URL, fetch);
		const data = await parseRequestBody(request);
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

function parseRequestBody(request: Request): Promise<DownloadMicroservicesRequestBody> {
	return request.json();
}

async function fetchZipFileAsBuffer(url: string, fetchFn = fetch): Promise<Buffer> {
	const zipResponse = await fetchFn(url);
	return Buffer.from(await zipResponse.arrayBuffer());
}

function zipResponse(zip: AdmZip) {
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
