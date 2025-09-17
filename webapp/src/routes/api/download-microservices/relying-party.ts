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
import { copy_and_modify_zip_entry } from './utils/zip';
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
	verifier_related_data.verifications.forEach(
		({ verification_flow, verification_template }) => {
			copy_and_modify_zip_entry(
				zip,
				get_verifier_index_path(),
				get_verifier_index_path(verification_flow.id),
				(default_html: string) => {
					// Replace "Verify with Didroom" line with title
					const verifyRegex = /^(\s*.*Verify with Didroom)(.*)$/m;
					let updatedHtml = default_html.replace(verifyRegex, `$1: ${verification_flow.name}$2`);

					// Replace description paragraph
					console.log(verification_flow)
					if (verification_flow.description) {
						const qrRegex = /(Scan the QR code below with your preferred digital‑wallet app to begin a\n\s*secure credential verification in Didroom\.)/s;
						updatedHtml = updatedHtml.replace(qrRegex, `    ${verification_flow.description}`);
					}

					// Replace DCQL query
					const queryRegex = /^\s*const defaultQuery = .*$/m;
					updatedHtml = updatedHtml.replace(queryRegex, `    const defaultQuery = \`${verification_template.dcql_query}\`;`);
					return updatedHtml;
				}
			);
			copy_and_modify_zip_entry(
				zip,
				get_verifier_index_path(undefined, true),
				get_verifier_index_path(verification_flow.id, true),
				(default_metadata: string) => default_metadata
			);
		}
	);
}

function get_verifier_index_path(
	verification_flow_name?: string,
	metadata: boolean = false,
) {
	const m = metadata ? '.metadata.json' : '';
	return [
		config.folder_names.public,
		config.folder_names.microservices.verifier,
		(verification_flow_name ?? config.file_names.index) + m,
	].join('/');
}
