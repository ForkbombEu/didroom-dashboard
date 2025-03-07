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
			relying_party: 'relying_party',
		},
		well_known: '.well-known',
	},
	file_names: {
		well_known: {
			authz_server: 'oauth-authorization-server',
			credential_issuer: 'openid-credential-issuer',
			relying_party: 'openid-relying-party',
		},
		env_example: '.env.example',
		dockerfile: 'Dockerfile',
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
