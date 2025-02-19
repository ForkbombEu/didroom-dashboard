<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { assets } from '$app/paths';
	import Icon from '$lib/components/icon.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import PageContent from '$lib/components/pageContent.svelte';
	import PageTop from '$lib/components/pageTop.svelte';
	import ReviewField from '$lib/components/reviewField.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import SideCard from '$lib/components/sideCard.svelte';
	import { MultisignatureSealsStatusOptions } from '$lib/pocketbase/types.js';
	import { getUserDisplayName } from '$lib/utils/pb.js';
	import { Button } from 'flowbite-svelte';
	import { ArrowLeft } from 'svelte-heros-v2';
	import { addSignaturesToReflowSeal, verifySignedReflowSeal } from './logic.js';

	export let data;
	$: ({ multisignature, seals } = data);

	$: participants = seals.map((s) => s.expand?.owner.name);
	$: issuer = multisignature.expand?.coconut_credential_issuer;
	$: owner = multisignature.expand?.owner!;

	$: missingSeals = seals.some((s) => s.status == MultisignatureSealsStatusOptions.pending);
	$: allGood = seals.every((s) => s.status == MultisignatureSealsStatusOptions.signed);
	let verified = false;

	async function completeMultisignature() {
		// TODO: check if all have signed
		const signedReflowSeal = await addSignaturesToReflowSeal(issuer!, multisignature, seals);
		console.log(signedReflowSeal);
		// TODO - store success result in backend
		const verification = await verifySignedReflowSeal(
			signedReflowSeal,
			multisignature.content_json as Record<string, unknown>
		);
		console.log(verification);
	}
</script>

<PageTop>
	<Button outline href="/my/multisignatures">
		<Icon src={ArrowLeft} mr />
		Multisignatures
	</Button>

	<SectionTitle
		title="Multi-Signature Status Overview"
		description="Access and review the status of the multi-signature, and all the details submitted during the multi-signature process."
	/>
</PageTop>

<PageContent layout="horizontal">
	<PageCard class="grow">
		<SectionTitle tag="h5" title="Review multisignature" />

		<ReviewField label="Signature name">
			<p>{multisignature.name}</p>
		</ReviewField>

		<ReviewField label="Organizer">
			<p>{getUserDisplayName(owner)}</p>
		</ReviewField>

		<ReviewField label="Participants">
			<p>(You)</p>
			{#each participants as p}
				<p>{p}</p>
			{/each}
		</ReviewField>

		<ReviewField label="Credential issuer">
			<p>{issuer?.name} – {issuer?.endpoint}</p>
		</ReviewField>

		<ReviewField label="Content">
			<pre>{JSON.stringify(multisignature.content_json, null, 2)}</pre>
		</ReviewField>

		<ReviewField label="Deadline for signature">
			{seals[0].signature_deadline}
		</ReviewField>
	</PageCard>

	<SideCard
		title="Multi-Signature Status"
		description="Stay updated on the progress and status of your multi-signature."
		image={`${assets}/multisignatures/multisignature-review.svg`}
	>
		<svelte:fragment slot="bottom">
			<ul class="space-y-1">
				<li>
					<span class="mr-2">✅</span>
					Sent to participants
				</li>
				{#if missingSeals}
					<li>
						<span class="mr-2">⚠️</span>
						Missing signatures
					</li>
				{/if}
				{#if allGood}
					<li>
						<span class="mr-2">✅</span>
						All participants have signed
					</li>
				{/if}
			</ul>

			{#if allGood}
				<Button on:click={completeMultisignature}>Complete multisignature</Button>
			{/if}
		</svelte:fragment>
	</SideCard>
</PageContent>
