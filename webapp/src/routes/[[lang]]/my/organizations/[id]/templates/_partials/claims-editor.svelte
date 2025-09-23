<script lang="ts" context="module">
</script>

<script lang="ts">
	import { Checkbox, Input, Label, Select, type SelectOptionType } from 'flowbite-svelte';

	import { m } from '$lib/i18n';
	import type { ClaimInput } from './claims';

	//

	export let claims: ClaimInput[];

	const items: SelectOptionType<ClaimInput['type']>[] = [
		{ name: m.string_type(), value: 'string' },
		{ name: m.number_type(), value: 'number' },
		{ name: m.boolean_type(), value: 'boolean' }
	];

	$: console.log('claims', claims);
</script>

{#if claims.length > 0}
	<div class="grid">
		<Label>{m.Claim()}</Label>
		<Label>{m.Data_Type()}</Label>
		<Label>
			{m.Values()} <span class="text-gray-400">({m.Separate_values_with_commas()})</span>
		</Label>

		{#each claims as claim (claim.id)}
			<label
				for={claim.id}
				class="flex h-[42px] items-center justify-start gap-3 rounded-lg border border-gray-300 bg-gray-50 px-3"
			>
				<Checkbox bind:checked={claim.selected} id={claim.id} />
				<span>{claim.name}</span>
			</label>
			<Select bind:value={claim.type} {items} disabled={!claim.selected} />
			<Input bind:value={claim.values} disabled={!claim.selected} placeholder="e.g. A, B, C" />
		{/each}
	</div>
{/if}

<style>
	.grid {
		grid-template-columns: auto auto 1fr;
		gap: 0.6rem 0.4rem;
	}
</style>
