// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { pipe, Array as A, Effect } from 'effect';

import { objectSchemaValidator } from '$lib/jsonSchema/types';
import {
	objectSchemaToClaims,
	flattenClaimsProperties
} from '@api/download-microservices/utils/credential-subject';

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
