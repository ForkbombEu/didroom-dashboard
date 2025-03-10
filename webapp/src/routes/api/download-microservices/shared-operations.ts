// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type AdmZip from 'adm-zip';
import { pipe, Array as A, Record as R } from 'effect';

import type {
	AuthorizationServersRecord,
	IssuersRecord,
	RelyingPartiesRecord,
	TemplatesResponse
} from '$lib/pocketbase/types';
import type { ValueOf } from '$lib/utils/types';
import { cleanUrl } from '$lib/microservices';

import { config } from './config';
import { get_zip_root_folder, prepend_zip_root_folder, update_zip_entry } from './utils/zip';
import { createSlug } from './utils/strings';

/* Types */

export type WellKnown = Record<string, unknown> & { readonly brand: unique symbol };

export type MicroserviceFolder = ValueOf<(typeof config)['folder_names']['microservices']>;

/* Delete unused folders */

export function delete_unused_folders(zip: AdmZip, microservice_to_keep: MicroserviceFolder) {
	pipe(
		get_folders_paths_to_delete(microservice_to_keep),
		A.map((folder_path) => prepend_zip_root_folder(zip, folder_path)),
		A.map((folder_path) => zip.getEntry(folder_path)),
		A.forEach((folder_entry) => {
			if (folder_entry) zip.deleteFile(folder_entry);
		})
	);
}

export function get_folders_paths_to_delete(microservice_to_keep: MicroserviceFolder): string[] {
	return pipe(
		config.folder_names.microservices,
		R.filter((folder_name) => folder_name != microservice_to_keep),
		R.map((folder_name) => [`${folder_name}/`, `${config.folder_names.public}/${folder_name}/`]),
		R.toEntries,
		A.map((entry) => entry[1]),
		A.flatten
	);
}

/* Add custom code */

export function add_credential_custom_code(
	zip: AdmZip,
	microservice: MicroserviceFolder,
	credential_type_name: string,
	template: TemplatesResponse
) {
	const { zencode_data, zencode_script } = template;
	const base_path = get_credential_custom_code_path(zip, microservice, credential_type_name);
	const custom_code = {
		[config.file_extensions.zen]: zencode_script,
		[config.file_extensions.keys]: zencode_data,
		[config.file_extensions.metadata]: JSON.stringify({ hidden: true })
	};
	pipe(
		custom_code,
		R.mapKeys((extension) => `${base_path}.${extension}`),
		R.map((value) => Buffer.from(value)),
		R.toEntries,
		A.forEach(([path, buffer]) => zip.addFile(path, buffer))
	);
}

export function get_credential_custom_code_path(
	zip: AdmZip,
	microservice: MicroserviceFolder,
	credential_type_name: string
) {
	const zipRoot = get_zip_root_folder(zip);
	return [zipRoot, microservice, config.folder_names.custom_code, credential_type_name].join('/');
}

/* .env.example management */

export function add_microservice_env(zip: AdmZip, microservice: Microservice) {
	update_zip_entry(zip, config.file_names.env_example, () => create_microservice_env(microservice));
}

function create_microservice_env(microservice: Microservice): string {
	return microservice_env_template(
		microservice.port,
		createSlug(microservice.name),
		cleanUrl(microservice.endpoint)
	);
}

function microservice_env_template(port: string | number, MS_NAME: string, MS_URL: string) {
	return `# Don't change, never ever!
FILES_DIR=.

# Don't change, unless you have something else running on port 8000
ANN_PORT=8000

# The microservice will run on this port 
UP_PORT=${port}

# This is the microservice folder, populated by the DIDroom dashboard, from the microservice name 
MS_NAME=${MS_NAME}

# This is the microservice endpoiny, populated by by the DIDroom dashboard
MS_URL=${MS_URL}
`;
}

type Microservice = IssuersRecord | RelyingPartiesRecord | AuthorizationServersRecord;

//

export function delete_tests(zip: AdmZip) {
	const tests_path = prepend_zip_root_folder(zip, 'tests/');
	zip.deleteFile(tests_path);
}

//

export function add_microservice_dockerfile(zip: AdmZip, microservice: Microservice, microservice_folder: MicroserviceFolder) {
	update_zip_entry(zip, config.file_names.dockerfile, () => create_microservice_dockerfile(microservice_folder, microservice));
}

function create_microservice_dockerfile(microservice_folder: MicroserviceFolder, microservice: Microservice): string {
	return microservice_dockerfile_template(
		microservice_folder,
		cleanUrl(microservice.endpoint),
		createSlug(microservice.name)
	);
}

function microservice_dockerfile_template(microservice: MicroserviceFolder, msUrl: string, msName: string) {
	const serviceNamePrefix = {
		authz_server: 'as',
		credential_issuer: 'ci',
		relying_party: 'rp'
	};
	const fullName = serviceNamePrefix[microservice] + '_' + msName;
	const dockerfile = `FROM ghcr.io/forkbombeu/didroom_microservices:stable

ENV ZENCODE_DIR=/app/${microservice}
ENV PUBLIC_DIR=/app/public/${microservice}
ENV BASEPATH=/${microservice}
ENV MS_URL=${msUrl}
ENV MS_NAME=${fullName}

COPY ${microservice} /app/${microservice}
COPY public/${microservice} /app/public/${microservice}
`;
	if (microservice == config.folder_names.microservices.authz_server) {
		return dockerfile + '\nRUN make -C /app authorize\n';
	}
	return dockerfile;
}