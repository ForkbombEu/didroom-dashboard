<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import UserData from './_partials/userData.svelte';
	import UserKeys from './_partials/userKeys.svelte';
	import UserWebauthn from './_partials/userWebauthn.svelte';

	import { featureFlags } from '$lib/features';
	import PageCard from '$lib/components/pageCard.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import { m } from '$lib/i18n';
	import { Button } from 'flowbite-svelte';
	import { createDidUrl } from '$lib/did';
	import Icon from '$lib/components/icon.svelte';
	import { ArrowUpRight } from 'svelte-heros-v2';

	export let data;
	$: ({ publicKeys } = data);
</script>

<div class="mx-auto max-w-xl space-y-8 p-8">
	<PageCard>
		<UserData />
	</PageCard>

	{#if $featureFlags.KEYPAIROOM}
		<PageCard>
			<div class="space-y-3">
				{#if $featureFlags.DID && publicKeys}
					<SectionTitle tag="h5" title={m.Your_did()}></SectionTitle>
					<Button
						target="_blank"
						class="w-full"
						outline
						href={createDidUrl(publicKeys.eddsa_public_key)}
					>
						{m.View_did()}
						<Icon src={ArrowUpRight} ml />
					</Button>
				{/if}
			</div>
			<UserKeys keys={publicKeys} />
		</PageCard>
	{/if}

	{#if $featureFlags.WEBAUTHN}
		<PageCard>
			<UserWebauthn />
		</PageCard>
	{/if}
</div>
