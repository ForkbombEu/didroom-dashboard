// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { pipe, Option as O, Array as A, String as S } from 'effect';
import _ from 'lodash/fp';

import type {
	AuthorizationServersResponse,
	IssuersResponse,
	ServicesResponse,
	TemplatesResponse
} from '$lib/pocketbase/types';
import type { ObjectSchema } from '$lib/jsonSchema/types';
import { formatMicroserviceUrl } from '$lib/microservices';
import type { DownloadMicroservicesRequestBody } from '.';

import {
	add_credential_custom_code,
	add_microservice_dockerfile,
	add_microservice_env,
	add_qrcode_pages,
	delete_tests,
	delete_unused_folders,
	get_credential_custom_code_path,
	type WellKnown
} from './shared-operations';
import {
	get_credential_configuration_template,
	objectSchemaToClaims
} from './utils/credential-subject';
import { update_zip_json_entry, copy_and_modify_zip_entry } from './utils/zip';
import { DEFAULT_LOCALE } from './utils/locale';
import { config } from './config';
import type { Expiration, ExpirationDate } from '$lib/issuanceFlows/expiration';

/* Main */

export function create_credential_issuer_zip(
	didroom_microservices_zip_buffer: Buffer,
	credential_issuer: IssuersResponse,
	request_body: DownloadMicroservicesRequestBody
) {
	const zip = new AdmZip(didroom_microservices_zip_buffer);

	const credential_issuer_related_data = get_credential_issuer_related_data_from_request_body(
		credential_issuer,
		request_body
	);

	edit_credential_issuer_well_known(zip, credential_issuer, credential_issuer_related_data);
	add_credentials_custom_code(zip, credential_issuer_related_data.issuance_flows);
	add_discover_pages(zip, credential_issuer, credential_issuer_related_data)
	add_microservice_env(zip, credential_issuer);
	add_microservice_dockerfile(zip, credential_issuer, config.folder_names.microservices.credential_issuer);
	delete_unused_folders(zip, config.folder_names.microservices.credential_issuer);
	delete_tests(zip);

	return zip;
}

/* Get related data */

type CredentialIssuerRelatedData = {
	authorization_servers: Array<AuthorizationServersResponse>;
	issuance_flows: Array<IssuanceFlow>;
};

type IssuanceFlow = ServicesResponse<Expiration> & { template: TemplatesResponse };

function get_credential_issuer_related_data_from_request_body(
	credential_issuer: IssuersResponse,
	body: DownloadMicroservicesRequestBody
): CredentialIssuerRelatedData {
	const {
		authorization_servers: org_authorization_servers,
		issuance_flows: org_issuance_flows,
		templates: org_templates
	} = body;

	const related_issuance_flows = org_issuance_flows.filter(
		(flow) => flow.credential_issuer == credential_issuer.id
	);

	return {
		authorization_servers: pipe(
			related_issuance_flows,
			A.map((issuance_flow) => issuance_flow.authorization_server),
			(authorization_server_ids) =>
				org_authorization_servers.filter((a) => authorization_server_ids.includes(a.id))
		),

		issuance_flows: related_issuance_flows.map((issuance_flow) => ({
			...issuance_flow,
			template: pipe(
				org_templates,
				A.findFirst((t) => t.id == issuance_flow.credential_template),
				O.getOrThrow
			)
		}))
	};
}

/* Well known editing */

function create_credential_issuer_well_known(
	credential_issuer: IssuersResponse,
	credential_issuer_related_data: CredentialIssuerRelatedData,
	default_well_known: WellKnown
): WellKnown {
	const { authorization_servers, issuance_flows } = credential_issuer_related_data;
	const credential_issuer_url = formatMicroserviceUrl(
		credential_issuer.endpoint,
		config.folder_names.microservices.credential_issuer
	);
	const authorization_servers_urls = authorization_servers.map((a) =>
		formatMicroserviceUrl(a.endpoint, config.folder_names.microservices.authz_server)
	);
	const credentialConfigurationsSupported = _.flow(
		_.map((flow: IssuanceFlow) => {
			const item = convert_issuance_flow_to_credential_configuration(flow);
			const { id, ...credential_configuration } = item;
			return [id, credential_configuration];
		}),
		_.fromPairs
	);

	return pipe(
		default_well_known,

		JSON.stringify,
		S.replaceAll('{{ ci_url }}', credential_issuer_url),
		JSON.parse,

		_.set('authorization_servers', authorization_servers_urls),
		_.set('display[0]', {
			name: credential_issuer.name,
			locale: DEFAULT_LOCALE
		}),
		_.set(
			'credential_configurations_supported',
			credentialConfigurationsSupported(issuance_flows)
		)
	) as WellKnown;
}

function conditional_set(
	condition: boolean,
	path: string,
	value: any
): (obj: object) => object {
	return condition ? _.set(path, value) : _.identity
};

function convert_issuance_flow_to_credential_configuration(
	issuance_flow: IssuanceFlow
): CredentialConfiguration & { id: string } {
	return pipe(
		get_credential_configuration_template(issuance_flow.cryptography as 'sd-jwt' | 'W3C-VC'),

		_.set('display[0]', {
			name: issuance_flow.display_name,
			locale: DEFAULT_LOCALE,
			logo: {
				url: issuance_flow.logo,
				alt_text: `${issuance_flow.display_name} logo`,
				uri: issuance_flow.logo
			},
			background_color: '#12107c',
			text_color: '#FFFFFF',
			description: issuance_flow.description
		}),

		conditional_set(issuance_flow.cryptography === 'sd-jwt', 'vct', issuance_flow.type_name),
		conditional_set(issuance_flow.cryptography === 'W3C-VC', 'credentials_definition.type[1]', issuance_flow.type_name),

		_.set(
			'claims',
			objectSchemaToClaims(issuance_flow.template.schema as ObjectSchema, DEFAULT_LOCALE)
		),
		_.set(
			'id',
			issuance_flow.type_name
		)
	) as CredentialConfiguration & { id: string };
}

type CredentialConfiguration = Record<string, unknown> & { readonly brand: unique symbol };

/* Zip editing */

function edit_credential_issuer_well_known(
	zip: AdmZip,
	credential_issuer: IssuersResponse,
	credential_issuer_related_data: CredentialIssuerRelatedData
) {
	update_zip_json_entry(
		zip,
		get_credential_issuer_well_known_path(),
		(default_well_known) =>
			create_credential_issuer_well_known(
				credential_issuer,
				credential_issuer_related_data,
				default_well_known as WellKnown
			),
		config.json.tab_size
	);
}

function get_credential_issuer_well_known_path() {
	return [
		config.folder_names.public,
		config.folder_names.microservices.credential_issuer,
		config.folder_names.well_known,
		config.file_names.well_known.credential_issuer
	].join('/');
}

/* Custom code editing */

function add_credentials_custom_code(zip: AdmZip, issuance_flows: IssuanceFlow[]) {
	pipe(
		issuance_flows,
		A.forEach((issuance_flow) => {
			add_credential_custom_code(
				zip,
				config.folder_names.microservices.credential_issuer,
				issuance_flow.type_name,
				issuance_flow.template
			);
			add_credential_time(zip, issuance_flow);
		})
	);
}

function add_credential_time(zip: AdmZip, issuance_flow: ServicesResponse<Expiration>) {
	if (!issuance_flow.expiration) return;
	const base_path = get_credential_custom_code_path(
		zip,
		config.folder_names.microservices.credential_issuer,
		issuance_flow.type_name
	);
	const path = `${base_path}.${config.file_extensions.time}`;
	const content = pipe(issuance_flow.expiration, format_expiration, (exp) =>
		JSON.stringify(exp, null, config.json.tab_size)
	);
	zip.addFile(path, Buffer.from(content));
}

function format_expiration(expiration: Expiration): LuaExpiration | ExpirationDate {
	if (expiration.mode == 'duration') {
		return {
			mode: 'duration',
			duration: {
				day: expiration.duration.days,
				year: expiration.duration.years,
				month: expiration.duration.months
			}
		};
	} else return expiration;
}

type LuaExpiration = {
	mode: 'duration';
	duration: {
		month: number;
		year: number;
		day: number;
	};
};

/* add_qrcode_pages */

type IssuerKeys = {
	offer: {
		credential_configuration_ids: string[];
		credential_issuer: string;
		grants?: {
			authorization_code: {
				authorization_server: string;
			};
		};
	};
	deeplink_path?: string;
	qrcode_path?: string;
	command?: string;
}

function add_discover_pages(zip: AdmZip, credential_issuer: IssuersResponse, credential_issuer_related_data: CredentialIssuerRelatedData) {
	const { authorization_servers, issuance_flows } = credential_issuer_related_data;
	let useGrant = authorization_servers.length > 1;
	const ci = formatMicroserviceUrl(
		credential_issuer.endpoint,
		config.folder_names.microservices.credential_issuer
	);
	issuance_flows.map((issuance_flow) => {
		const public_path = `${config.folder_names.public}/${config.folder_names.microservices.credential_issuer}`;
		const issuance_path = `${public_path}/${issuance_flow.id}`;
		const as = authorization_servers.find((a) => a.id === issuance_flow.authorization_server);
		const keys: IssuerKeys = {
			offer: {
				credential_configuration_ids: [issuance_flow.type_name],
				credential_issuer: ci
			},
			deeplink_path: `${issuance_path}/${config.file_names.deeplink}`
		};
		if (useGrant) {
			keys.offer.grants = {
				authorization_code: {
					authorization_server: `${as}`
				}
			}
		};
		add_qrcode_pages(zip, public_path, issuance_flow.id, keys, config.file_names.deeplink);
		delete keys.deeplink_path;
		keys.qrcode_path = `${issuance_path}/${config.file_names.qrcode}`;
		keys.command = `./scripts/qrcode.sh ${keys.qrcode_path}`;
		add_qrcode_pages(zip, public_path, issuance_flow.id, keys, config.file_names.qrcode);
	});
}
