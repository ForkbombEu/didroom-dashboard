// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const config = {
	folder_names: {
		custom_code: 'custom_code',
		public: 'public',
		microservices: {
			authz_server: 'authz_server',
			credential_issuer: 'credential_issuer',
			verifier: 'verifier',
		},
		well_known: '.well-known',
	},
	file_names: {
		well_known: {
			authz_server: 'oauth-authorization-server',
			credential_issuer: 'openid-credential-issuer',
		},
		env_example: '.env.example',
		dockerfile: 'Dockerfile',
		index: 'index',
		list: 'list',
		details: 'details',
		qrcode: 'qrcode',
		deeplink: 'deeplink',
	},
	file_extensions: {
		zen: 'zen',
		keys: 'keys.json',
		metadata: 'metadata.json',
		time: 'time.json',
	},
	json: {
		tab_size: 4,
	}
} as const;
