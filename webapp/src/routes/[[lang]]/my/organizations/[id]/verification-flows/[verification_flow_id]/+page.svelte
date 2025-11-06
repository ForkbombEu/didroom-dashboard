<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Heading } from 'flowbite-svelte';
	import { QuestionMarkCircle, Pencil, ArrowTopRightOnSquare } from 'svelte-heros-v2';
	import { m } from '$lib/i18n';
	import PageTop from '$lib/components/pageTop.svelte';
	import PageContent from '$lib/components/pageContent.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import OrganizationBreadcrumbs from '$lib/components/organizationBreadcrumbs.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { page } from '$app/stores';
	import { ProtectedOrgUI } from '$lib/organizations';
	import TemplateSchemaDisplay from '$lib/components/templateSchemaDisplay.svelte';
	import { formatMicroserviceUrl } from '$lib/microservices';
	import { assets } from '$app/paths';

	//

	export let data;

	$: ({ verificationFlow, organization, verification_flow_id } = data);
	$: ({ template, relying_party } = verificationFlow.expand!);

	let verificationFlowQr: string | null = null;
	let error: string | null = null;
	onMount(async () => {
		try {
			const deeplinkUrl = `${formatMicroserviceUrl(relying_party.endpoint, 'verifier')}/${verification_flow_id}/qrcode`;
			const res = await fetch(deeplinkUrl);
			if (!res.ok) {
				error = m.no_qr_code_verifier_not_yet_deployed();
				return;
			}
			const response = await res.json();
			verificationFlowQr = response.qrcode;
		} catch (e) {
			console.error('Error generating QR code:', e);
			error = m.no_qr_code_verifier_not_yet_deployed();
		}
	});

</script>

<PageTop>
	<OrganizationBreadcrumbs />
	<SectionTitle title={verificationFlow.name} description={verificationFlow.description} />
</PageTop>

<PageContent>
	<div class="flex items-start gap-8">
		<PageCard class="grow">
			<SectionTitle tag="h5" title={m.Verification_flow_details()}>
				<ProtectedOrgUI slot="right" orgId={organization.id} roles={['admin', 'owner']}>
					<Button href={`${$page.url.pathname}/edit`}>
						{m.Make_changes()}
						<Icon src={Pencil} ml />
					</Button>
				</ProtectedOrgUI>
			</SectionTitle>

			<div class="space-y-8 font-medium">
				<!-- <div class="flex gap-3 items-center pb-1">
					<p>Logo:</p>
					<Avatar class="object-cover border" size="lg" src={verificationFlow.logo}></Avatar>
				</div> -->

				<p>
					{m.Verifier()}:
					<span class="text-primary-700">{relying_party.endpoint}</span>
				</p>

				<div class="space-y-2">
					<p>
						{m.Verification_template()}:
						<span class="text-primary-700">{template.name}</span>
					</p>
					<TemplateSchemaDisplay {template} />
				</div>
			</div>
		</PageCard>

		<PageCard class="w-[300px] shrink-0 !space-y-4 !p-4">
			<div class="flex flex-col items-center gap-2 self-stretch rounded-lg border bg-gray-50 p-4">
				{#if error}
					<p class="text-gray-500">{error}</p>
				{:else}
					<img src={verificationFlowQr} alt={m.Service_Qr_Code()} class="w-40 rounded-lg" />
					<Button outline class="mt-4" size="sm" disabled>
						<span class="whitespace-nowrap">
							{m.Open_qr_code_in_new_page()}
						</span>
						<Icon src={ArrowTopRightOnSquare} ml></Icon>
					</Button>
				{/if}
			</div>

			<div class="mt-6 space-y-2">
				<Heading tag="h5">{m.verification_flow_qr_code_title()}</Heading>
				<p class="text-gray-500">{m.verification_flow_qr_code_description()}</p>
			</div>

			<div class="flex gap-4">
				<img
					alt="Didroom Wallet app logo"
					class="h-[100px] w-[100px] rounded-lg"
					src={`${assets}/app-didroom.svg`}
				/>
				<div class="space-y-2">
					<Button outline target="_blank" href="https://didroom.com/guides/Verifier/web-verifier.html">
						{m.Github()}
						<Icon src={ArrowTopRightOnSquare} ml></Icon>
					</Button>
					<Button
						outline
						target="_blank"
						href="https://didroom.com/guides/Verifier/web-verifier.html"
					>
						{m.Help()}
						<Icon src={QuestionMarkCircle} ml></Icon>
					</Button>
				</div>
			</div>
		</PageCard>
	</div>
</PageContent>
