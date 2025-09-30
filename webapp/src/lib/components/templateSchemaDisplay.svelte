<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { m } from '$lib/i18n';
	import type { ObjectSchema } from '$lib/jsonSchema/types';
	import type { TemplatesResponse } from '$lib/pocketbase/types';
	import {
		objectSchemaToClaims,
		flattenClaimsProperties,
		type ClaimsProperty
	} from '@api/download-microservices/utils/credential-subject';
	import { DEFAULT_LOCALE } from '@api/download-microservices/utils/locale';
	import { Effect, pipe, Either, Array as A } from 'effect';
	import EmptyState from './emptyState.svelte';
	import { ExclamationTriangle } from 'svelte-heros-v2';

	//

	type Claim = {
		id: string
		name: string
		selected: boolean
		type: string
		values: string
	}

	type ClaimsPropertyValues = ClaimsProperty & { values?: string }

	//

	export let template: TemplatesResponse;

	//

	function getTemplatePropertyList(template: TemplatesResponse) {
		return pipe(
			Effect.try(() =>
				pipe(
					template.schema as ObjectSchema,
					objectSchemaToClaims,
					flattenClaimsProperties
				) as [string, ClaimsPropertyValues][]
			),
			Effect.either,
			Effect.runSync
		);
	}
	function getTemplatePropertyListFromClaims(template: TemplatesResponse) {
		return pipe(
			Effect.try(() =>
				pipe(
					template.claims as Claim[],
					A.filter((claim): claim is Claim => claim !== undefined && claim.selected),
					A.map((claim) => [
						claim.id,
							{
								display: [{ name: claim.name, locale: 'en-US', id: '' }],
								mandatory: false,
								values: claim.values,
								path: [],
							}
						]
					)
				) as [string, ClaimsPropertyValues][]
			),
			Effect.either,
			Effect.runSync
		);
	}

	// Usage:
	let propertyListEither;
	if (template.schema !== "") {
		propertyListEither = getTemplatePropertyList(template);
	} else {
		propertyListEither = getTemplatePropertyListFromClaims(template);
	}

</script>

<div class="divide-y rounded-lg border bg-gray-50">
	{#if Either.isLeft(propertyListEither)}
		<EmptyState title={m.Template_parsing_error()} icon={ExclamationTriangle} />
	{:else}
		{@const propertyList = propertyListEither.pipe(Either.getOrThrow)}

		{#each propertyList as [propertyId, property]}
			{@const displayName = property.display?.at(0)?.name}
			{@const values = property.values}
			<div class="p-4">
				<p>
					{m.Property_ID()}: <span class="font-mono text-primary-700">{propertyId}</span>
				</p>
				{#if displayName}
					<p>
						{m.Display_name()}:
						<span class="text-primary-700">{displayName} ({DEFAULT_LOCALE})</span>
					</p>
				{/if}
				{#if values}
					<p>
						{m.Values()}:
						<span class="text-primary-700">{values}</span>
					</p>
				{/if}

				{#if property.mandatory}
					<p class="text-primary-700">{m.Required()}</p>
				{/if}
			</div>
		{/each}
	{/if}
</div>
