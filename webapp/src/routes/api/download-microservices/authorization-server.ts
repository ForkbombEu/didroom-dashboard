// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
	AuthorizationServersResponse,
	ServicesResponse,
	TemplatesResponse
} from '$lib/pocketbase/types';
import { pipe, String as S, Array as A, Option as O } from 'effect';
import type { DownloadMicroservicesRequestBody } from '.';
import {
	add_credential_custom_code,
	add_microservice_env,
	delete_unused_folders,
	get_credential_custom_code_path,
	get_folders_paths_to_delete,
	type WellKnown
} from './shared-operations';
import { cleanUrl } from './utils/strings';
import _ from 'lodash/fp';
import AdmZip from 'adm-zip';
import { delete_zip_folder, update_zip_json_entry } from './utils/zip';
import { mergeObjectSchemas } from './utils/credential-subject';
import type { ObjectSchema } from '$lib/jsonSchema/types';

/* Main */

export function createAuthorizationServerZip(
	zip_buffer: Buffer,
	authorization_server: AuthorizationServersResponse,
	request_body: DownloadMicroservicesRequestBody
) {
	const zip = new AdmZip(zip_buffer);

	const authorization_server_related_data = getAuthorizationServerRelatedDataFromRequestBody(
		request_body,
		authorization_server
	);

	editAuthorizationServerWellKnown(zip, authorization_server, authorization_server_related_data);
	delete_unused_folders(zip, 'authz_server');
	addCredentialsCustomCode(zip, authorization_server_related_data);
	add_microservice_env(zip, authorization_server);

	return zip;
}

/* Data setup */

type AuthorizationServerRelatedData = {
	credentials: Array<{
		issuance_flow: ServicesResponse;
		authorization_template: TemplatesResponse;
	}>;
};

function getAuthorizationServerRelatedDataFromRequestBody(
	body: DownloadMicroservicesRequestBody,
	authorization_server: AuthorizationServersResponse
): AuthorizationServerRelatedData {
	return {
		credentials: pipe(
			body.issuance_flows,
			A.filter((issuance_flow) => issuance_flow.authorization_server == authorization_server.id),
			A.map((issuance_flow) => ({
				issuance_flow,
				authorization_template: pipe(
					body.templates,
					A.findFirst((t) => t.id == issuance_flow.authorization_template),
					O.getOrThrow
				)
			}))
		)
	};
}

/* Well known editing */

function createAuthorizationServerWellKnown(
	authorization_server: AuthorizationServersResponse,
	authorization_server_related_data: AuthorizationServerRelatedData,
	default_well_known: WellKnown
): WellKnown {
	const authorization_server_url = cleanUrl(authorization_server.endpoint);
	const scopes_supported = authorization_server_related_data.credentials.map(
		({ issuance_flow }) => issuance_flow.type_name
	);

	return pipe(
		default_well_known,

		JSON.stringify,
		S.replaceAll(
			'https://authz-server1.zenswarm.forkbomb.eu/authz_server',
			authorization_server_url
		),
		JSON.parse,

		_.set('jwks.keys[0].kid', ''),
		_.set('scopes_supported', scopes_supported)
	) as WellKnown;
}

/* Custom code editing */

function addAuthorizationTemplateSchema(
	zip: AdmZip,
	credential_type_name: string,
	template: TemplatesResponse
) {
	const basePath = get_credential_custom_code_path(zip, 'authz_server', credential_type_name);
	const user_attributes_schema = template.schema as ObjectSchema;
	const form_fields_schema = template.schema_secondary as ObjectSchema;
	const schema = pipe(
		[form_fields_schema, user_attributes_schema],
		mergeObjectSchemas,
		_.set('form_fields', Object.keys(form_fields_schema.properties)),
		_.set('user_attributes', Object.keys(user_attributes_schema.properties))
	);
	zip.addFile(`${basePath}.schema.json`, Buffer.from(JSON.stringify(schema, null, 4)));
}

function addCredentialsCustomCode(
	zip: AdmZip,
	credential_issuer_related_data: AuthorizationServerRelatedData
) {
	credential_issuer_related_data.credentials.forEach(
		({ issuance_flow, authorization_template }) => {
			add_credential_custom_code(
				zip,
				'authz_server',
				issuance_flow.type_name,
				authorization_template
			);
			addAuthorizationTemplateSchema(zip, issuance_flow.type_name, authorization_template);
		}
	);
}

/* Zip editing */

const AUTHORIZATION_SERVER_WELL_KNOWN_PATH =
	'public/authz_server/.well-known/oauth-authorization-server';

function editAuthorizationServerWellKnown(
	zip: AdmZip,
	authorization_server: AuthorizationServersResponse,
	authorization_server_related_data: AuthorizationServerRelatedData
) {
	update_zip_json_entry(zip, AUTHORIZATION_SERVER_WELL_KNOWN_PATH, (default_well_known) =>
		createAuthorizationServerWellKnown(
			authorization_server,
			authorization_server_related_data,
			default_well_known as WellKnown
		)
	);
}
