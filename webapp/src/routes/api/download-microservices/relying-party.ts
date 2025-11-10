// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { String as S, pipe, Array as A, Option as O } from 'effect';
import _ from 'lodash/fp';

import type { VerificationFlowsResponse, TemplatesResponse, RelyingPartiesResponse } from '$lib/pocketbase/types';
import { formatMicroserviceUrl } from '$lib/microservices';
import type { DownloadMicroservicesRequestBody } from '.';

import {
	add_credential_custom_code,
	add_microservice_dockerfile,
	add_microservice_env,
	delete_tests,
	delete_unused_folders,
	add_qrcode_pages,
} from './shared-operations';
import { copy_and_modify_zip_entry, update_zip_entry } from './utils/zip';
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
	add_discover_pages(zip, verifier, verifier_related_data);
	add_credentials_custom_code(zip, verifier_related_data);
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


/* Custom code editing */

function add_credentials_custom_code(
	zip: AdmZip,
	verifier_related_data: VerifierRelatedData
) {
	verifier_related_data.verifications.forEach(
		({ verification_template }) => {
			const meta = JSON.parse(verification_template.dcql_query).credentials[0].meta;
			let type;
			if (meta.vct_values) type = meta.vct_values[0];
			else if (meta.type_values) type = meta.type_values[0][0];
			add_credential_custom_code(
				zip,
				config.folder_names.microservices.verifier,
				type,
				verification_template
			);
		}
	);
}

/* Zip editing */

type VerifierKeys = {
	verifier_endpoint: string;
	object: {
		response_mode: string;
		response_type: string;
		dcql_query: Record<string, unknown>;
		url: string;
	};
	deeplink_path?: string;
	qrcode_path?: string;
	command?: string;
}

function add_discover_pages(
	zip: AdmZip,
	verifier: RelyingPartiesResponse,
	verifier_related_data: VerifierRelatedData
) {
	const base_verifier_endpoint = formatMicroserviceUrl(
		verifier.endpoint,
		config.folder_names.microservices.verifier
	);
	const verifierList: { name: string, description: string, url: string }[] = [];
	verifier_related_data.verifications.forEach(
		({ verification_flow, verification_template }) => {
			// details page
			const details_page = `${verification_flow.id}/${config.file_names.details}`;
			copy_and_modify_zip_entry(
				zip,
				get_verifier_public_path_to(config.file_names.index),
				get_verifier_public_path_to(details_page),
				(default_html: string) => {
					// Replace "Verify with Didroom" line with title
					const verifyRegex = /^(\s*.*Verify with Didroom)(.*)$/m;
					let updatedHtml = default_html.replace(verifyRegex, `$1: ${verification_flow.name}$2`);

					// Replace description paragraph
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
				get_verifier_public_path_to(config.file_names.index, true),
				get_verifier_public_path_to(details_page, true),
				(default_metadata: string) => default_metadata
			);
			verifierList.push({
				name: verification_flow.name,
				description: verification_flow.description,
				url: `./${details_page}`
			});
			// deeplink and qrcode page
			const deeplink_page = `${verification_flow.id}/${config.file_names.deeplink}`;
			const qrcode_page = `${verification_flow.id}/${config.file_names.qrcode}`;
			const public_path = `${config.folder_names.public}/${config.folder_names.microservices.verifier}`;
			const keys: VerifierKeys = {
				verifier_endpoint: `${base_verifier_endpoint}/generate_authorization_request`,
				object: {
					response_mode: "direct_post",
					response_type: "vp_token",
					dcql_query: JSON.parse(verification_template.dcql_query),
					url: `${base_verifier_endpoint}/`
				},
				deeplink_path: get_verifier_public_path_to(deeplink_page)
			};
			add_qrcode_pages(zip, public_path, verification_flow.id, keys, config.file_names.deeplink);
			delete keys.deeplink_path;
			keys.qrcode_path = get_verifier_public_path_to(qrcode_page);
			keys.command = `./scripts/qrcode.sh ${keys.qrcode_path}`;
			add_qrcode_pages(zip, public_path, verification_flow.id, keys, config.file_names.qrcode);
		}
	);
	update_zip_entry(
		zip,
		get_verifier_list_path(),
		(content: string) => {
			const listRegex = /^\s*const flows = '';/m;
			return content.replace(listRegex, `        const flows = ${JSON.stringify(verifierList)};`);
		}
	);
}

function get_verifier_public_path_to(
	verification_flow_name: string,
	metadata: boolean = false,
) {
	const m = metadata ? '.metadata.json' : '';
	return [
		config.folder_names.public,
		config.folder_names.microservices.verifier,
		verification_flow_name + m,
	].join('/');
}

function get_verifier_list_path() {
	return [
		config.folder_names.public,
		config.folder_names.microservices.verifier,
		config.file_names.list,
	].join('/');
}
