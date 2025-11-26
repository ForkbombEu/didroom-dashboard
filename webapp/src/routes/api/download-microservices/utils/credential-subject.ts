// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ObjectSchema } from '$lib/jsonSchema/types';
import { z } from 'zod';
import { DEFAULT_LOCALE } from './locale';
import _ from 'lodash';

//

export function mergeObjectSchemas(schemas: ObjectSchema[]): ObjectSchema {
	return {
		type: 'object',
		properties: _.merge({}, ...schemas.map((s) => s.properties)),
		required: _.concat(...schemas.map((s) => s.required ?? []))
	};
}

export function mergeObjectSchemasIntoClaims(
	schemas: ObjectSchema[],
	locale = DEFAULT_LOCALE
): Claims {
	const claims = schemas.map((s) => objectSchemaToClaims(s, locale));
	return _.merge({}, ...claims);
}

/* JSON Schema to Claims conversion */

export function objectSchemaToClaims(
	schema: ObjectSchema,
	locale = DEFAULT_LOCALE,
	path: string[] = []
): Claims {
	const claims: Claims = [];

	function recursive(
		node: ObjectSchema,
		path: (string | null)[] = []
	) : void {
		for (const [key, value] of Object.entries(node.properties)) {
			const newPath = [...path, key];
			const isMandatory = node.required?.includes(key) ?? false;
			if (value.type === 'object') {
				recursive(value, newPath);
			} else if (value.type === 'array') {
				if (value.items.type === 'object')
					recursive(value.items, [...newPath, null])
				else if (value.items.type === 'array')
					console.log(`Property not handled: ${JSON.stringify(value.items, null, 2)}`)
				else
					claims.push({
						mandatory: isMandatory,
						display: [{ locale, name: value.title ?? key }],
						path: newPath
					});
			} else {
				const prop: ClaimsProperty = {
					mandatory: isMandatory,
					display: [{ locale, name: value.title ?? key }],
					path: newPath
				};
				claims.push(prop);
			}
		}
	}

	recursive(schema, path);
	return claims;
}

// https://openid.github.io/OpenID4VCI/openid-4-verifiable-credential-issuance-wg-draft.html#name-credential-issuer-metadata-2

export type Claims = ClaimsProperty[];

const DisplayPropertiesSchema = z.object({
	name: z.string(),
	locale: z.string()
});

type DisplayProperties = {
	name: string;
	locale: string;
};

const ClaimsPropertySchema = z.object({
	mandatory: z.boolean(),
	display: z.array(DisplayPropertiesSchema).optional(),
	path: z.array(z.string().nullable())
});

export type ClaimsProperty = {
	mandatory?: boolean;
	display?: DisplayProperties[];
	path: (string | null)[];
	// TODO - Handle "type" property if necessary
};

//

function checkClaimsProperty(data: unknown): data is ClaimsProperty {
	return ClaimsPropertySchema.safeParse(data).success;
}

export function flattenClaimsProperties(
	claims: Claims
): [string, ClaimsProperty][] {
	let propertyList: [string, ClaimsProperty][] = [];

	claims.forEach((property) => {
		const propertyName = property.path.join('.');
		if (checkClaimsProperty(property)) {
			propertyList.push([propertyName, property]);
		}
		//
		else {
			const nestedProperties = flattenClaimsProperties(property).map(
				([nestedPropertyName, nestedProperty]) =>
					[`${propertyName}.${nestedPropertyName}`, nestedProperty] as [
						string,
						ClaimsProperty
					]
			);
			propertyList = [...propertyList, ...nestedProperties];
		}
	});

	return propertyList;
}

/* */

const credential_configuration_template = {
	'sd-jwt': {
		format: 'dc+sd-jwt',
		cryptographic_binding_methods_supported: ['jwk'],
		credential_signing_alg_values_supported: ['ES256'],
		proof_types_supported: {
			jwt: {
				proof_signing_alg_values_supported: ['ES256']
			}
		},
		display: [
			{
				name: '',
				locale: '',
				logo: {
					url: '',
					alt_text: '',
					uri: ''
				},
				background_color: '',
				text_color: '',
				description: ''
			}
		],
		vct: '',
		claims: []
	},
	'W3C-VC': {
		format: 'ldp_vc',
		cryptographic_binding_methods_supported: ['jwk'],
		credential_signing_alg_values_supported: ['Ed25519Signature2018'],
		proof_types_supported: {
			jwt: {
				proof_signing_alg_values_supported: ['ES256']
			}
		},
		display: [
			{
				name: '',
				locale: '',
				logo: {
					url: '',
					alt_text: '',
					uri: ''
				},
				background_color: '',
				text_color: '',
				description: ''
			}
		],
		claims: [],
		credential_definition: {
			'@context': [
				'https://www.w3.org/ns/credentials/v2',
				'https://www.w3.org/ns/credentials/examples/v2'
			],
			type: [
				'VerifiableCredential'
			]
		}
	}
} as const;

type SupportedCryptographyOptions = keyof typeof credential_configuration_template;

export function get_credential_configuration_template(cryptography: SupportedCryptographyOptions) {
	return _.cloneDeep(credential_configuration_template[cryptography]);
}
