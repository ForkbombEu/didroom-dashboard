// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { String as S, pipe, Array as A, Option as O } from 'effect';
import _ from 'lodash/fp';

import type { VerificationFlowsResponse, TemplatesResponse, RelyingPartiesResponse } from '$lib/pocketbase/types';
import type { DownloadMicroservicesRequestBody } from '.';

import {
	add_microservice_dockerfile,
	add_microservice_env,
	delete_tests,
	delete_unused_folders
} from './shared-operations';
import { update_zip_entry } from './utils/zip';
import { config } from './config';

/* Main */

export function create_verifier_zip(
	zip_buffer: Buffer,
	verifier: RelyingPartiesResponse,
	request_body: DownloadMicroservicesRequestBody
) {
	const zip = new AdmZip(zip_buffer);
	const verifier_related_data = get_verifier_related_data_from_request_body(
		request_body,
		verifier
	);
	edit_html(zip, verifier_related_data);
	add_microservice_env(zip, verifier);
	add_microservice_dockerfile(zip, verifier, config.folder_names.microservices.verifier);
	delete_unused_folders(zip, config.folder_names.microservices.verifier);
	delete_tests(zip);
	return zip;
}

/* Data setup */

type VerifierRelatedData = {
	verifications: Array<{
		verification_flow: VerificationFlowsResponse;
		verification_template: TemplatesResponse;
	}>;
};

function get_verifier_related_data_from_request_body(
	body: DownloadMicroservicesRequestBody,
	verifier: RelyingPartiesResponse
): VerifierRelatedData {
	return {
		verifications: pipe(
			body.verification_flows,
			A.filter((verification_flow) => verification_flow.relying_party == verifier.id),
			A.map((verification_flow) => ({
				verification_flow,
				verification_template: pipe(
					body.templates,
					A.findFirst((t) => t.id == verification_flow.template),
					O.getOrThrow
				)
			}))
		)
	};
}

/* Zip editing */

function edit_html(
	zip: AdmZip,
	verifier_related_data: VerifierRelatedData
) {
	update_zip_entry(zip, get_verifier_well_known_path(), (default_html: string) => {
		return default_html.replace(
			/^\s*const defaultQuery = .*$/m,
			`    const defaultQuery = \`${verifier_related_data.verifications[0].verification_template.dcql_query}\`;`
		);
	});
}

function get_verifier_well_known_path() {
	return [
		config.folder_names.public,
		config.folder_names.microservices.verifier,
		config.file_names.index_html,
	].join('/');
}
