// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { String as S, pipe, Array as A } from 'effect';
import _ from 'lodash/fp';

import type { IssuersResponse, RelyingPartiesResponse } from '$lib/pocketbase/types';
import type { DownloadMicroservicesRequestBody } from '.';

import {
	add_microservice_dockerfile,
	add_microservice_env,
	delete_tests,
	delete_unused_folders,
	formatMicroserviceUrl,
	type WellKnown
} from './shared-operations';
import { DEFAULT_LOCALE } from './utils/locale';
import { update_zip_json_entry } from './utils/zip';
import { config } from './config';

/* Main */

export function create_relying_party_zip(
	zip_buffer: Buffer,
	relying_party: RelyingPartiesResponse,
	request_body: DownloadMicroservicesRequestBody
) {
	const zip = new AdmZip(zip_buffer);
	edit_relying_party_well_known(zip, relying_party, request_body.credential_issuers);
	add_microservice_env(zip, relying_party);
	add_microservice_dockerfile(zip, relying_party, config.folder_names.microservices.relying_party);
	delete_unused_folders(zip, config.folder_names.microservices.relying_party);
	delete_tests(zip);
	return zip;
}

/* Well known editing */

function create_relying_party_well_known(
	relying_party: RelyingPartiesResponse,
	trusted_credential_issuers: IssuersResponse[],
	default_well_known: WellKnown
): WellKnown {
	const relying_party_url = formatMicroserviceUrl(relying_party.endpoint, config.folder_names.microservices.relying_party);
	const trusted_credential_issuers_urls = pipe(
		trusted_credential_issuers,
		A.map((issuer) => issuer.endpoint),
		A.map((url) => formatMicroserviceUrl(url, config.folder_names.microservices.credential_issuer))
	);

	return pipe(
		default_well_known,

		JSON.stringify,
		S.replaceAll('{{ rp_url }}', relying_party_url),
		JSON.parse,

		_.set('display[0]', {
			name: relying_party.name,
			locale: DEFAULT_LOCALE
		}),
		_.set('trusted_credential_issuers', trusted_credential_issuers_urls)
	) as WellKnown;
}

/* Zip editing */

function edit_relying_party_well_known(
	zip: AdmZip,
	relying_party: RelyingPartiesResponse,
	trusted_credential_issuers: IssuersResponse[]
) {
	update_zip_json_entry(zip, get_relying_party_well_known_path(), (default_well_known) =>
		create_relying_party_well_known(
			relying_party,
			trusted_credential_issuers,
			default_well_known as WellKnown
		)
	);
}

function get_relying_party_well_known_path() {
	return [
		config.folder_names.public,
		config.folder_names.microservices.relying_party,
		config.folder_names.well_known,
		config.file_names.well_known.relying_party
	].join('/');
}
