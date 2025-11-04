// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ObjectSchema } from '$lib/jsonSchema/types';
import type { TemplatesRecord } from '$lib/pocketbase/types';
import { String, Number as Num, Array } from 'effect';
import { z } from 'zod';

//

const claimTypeSchema = z.enum(['string', 'number', 'boolean']);

const claimInputSchema = z.object({
	id: z.string(),
	name: z.string(),
	values: z.string(),
	selected: z.boolean(),
	type: claimTypeSchema
});

export type ClaimInput = z.infer<typeof claimInputSchema>;

export type Claim = {
	path: string[];
	values?: string[] | number[] | boolean[] | undefined;
};

export function getClaimInputsFromTemplate(data: Partial<TemplatesRecord>): ClaimInput[] {
	const parseResult = z.array(claimInputSchema).safeParse(data.claims);
	if (parseResult.success) return parseResult.data;
	return [];
}

export function getClaimInputsFromObjectSchema(schema: ObjectSchema): ClaimInput[] {
	const inputs: ClaimInput[] = [];
	for (const [propertyName, property] of Object.entries(schema.properties)) {
		const parsedType = claimTypeSchema.safeParse(property.type);
		inputs.push({
			id: propertyName,
			name: property.title ?? propertyName,
			values: '',
			selected: true,
			type: parsedType.data ?? 'string'
		});
	}
	return inputs;
}

export function inputToClaim(
	claim: ClaimInput,
	editPath: (id: string) => string[] = (id) => [id]
): Claim {
	const rawValues = claim.values.split(',').map(String.trim).filter(String.isNonEmpty) as Claim['values'];
	const path = editPath(claim.id);
	if (!rawValues || rawValues.length === 0) return {path};
	let values: Claim['values'] = [];
	switch (claim.type) {
		case 'string':
			values = rawValues;
			break;
		case 'number':
			values = rawValues.map(Number).filter(Num.isNumber);
			break;
		case 'boolean':
			rawValues.forEach((value) => {
				if (value === 'true') (values as boolean[]).push(true);
				if (value === 'false') (values as boolean[]).push(false);
			});
			values = Array.dedupe(values);
			break;
	}
	return {
		path: editPath(claim.id),
		values
	};
}
