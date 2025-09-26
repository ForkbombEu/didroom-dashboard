// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { pipe, Array as A, Effect } from 'effect';

import { objectSchemaValidator } from '$lib/jsonSchema/types';
import {
	objectSchemaToClaims,
	flattenClaimsProperties
} from '@api/download-microservices/utils/credential-subject';

type Claim = {
	id: string
	name: string
	selected: boolean
	type: string
	values: string
}

//

export function getTemplatePropertyList(schemas: Array<unknown | undefined>) {
	return pipe(
		schemas,
		A.map((schema) =>
			pipe(
				Effect.try(() =>
					pipe(
						objectSchemaValidator.parse(schema),
						objectSchemaToClaims,
						flattenClaimsProperties,
						A.map(([credentialName, _]) => credentialName)
					)
				),
				Effect.orElseSucceed(() => [] as string[]),
				Effect.runSync
			)
		),
		A.flatten,
		A.join(', ')
	);
}

export function getVerificationTemplatePropertyList(claims: Array<unknown | undefined>) {
	return pipe(
		claims,
		A.filter((c): c is Claim[] => c !== undefined),
		A.flatten,
		A.filter((c) => c.selected),
		A.map((c) => c.name),
		A.join(', ')
	)
}