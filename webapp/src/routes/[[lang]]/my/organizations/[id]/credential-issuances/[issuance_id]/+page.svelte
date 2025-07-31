<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Button, Heading } from 'flowbite-svelte';
	import { ArrowTopRightOnSquare, Pencil, QuestionMarkCircle } from 'svelte-heros-v2';
	import { createIntentUrl, generateQr } from '$lib/qrcode';
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
	$: ({ service, organization } = data);
	$: ({ credential_issuer, credential_template, authorization_server, authorization_template } =
		service.expand!);

	//

	$: issuanceFlowQr = generateQr(
		createIntentUrl({
			credential_configuration_ids: [service.type_name],
			credential_issuer: formatMicroserviceUrl(credential_issuer.endpoint, 'credential_issuer'),
			grants: {
				authorization_code: {
					authorization_server: formatMicroserviceUrl(authorization_server.endpoint, 'authz_server'),
				}
			}
		})
	);

	//

	// async function downloadCredentialIssuanceQr(src: string) {
	// 	const imgBlob = await imageSrcToBlob(src);
	// 	downloadBlob(imgBlob, `credential-issuance-qr.png`);
	// }

	$: microservicesTemplates = [
		{
			label: m.Credential_template(),
			name: credential_template?.name,
			template: credential_template
		},
		{
			label: m.Authorization_template(),
			name: authorization_template.name,
			template: authorization_template
		}
	];
</script>

<PageTop>
	<OrganizationBreadcrumbs />

	<SectionTitle title={service.display_name} description={service.description} />
</PageTop>

<PageContent>
	<div class="flex items-start gap-8">
		<PageCard class="grow">
			<SectionTitle tag="h5" title={m.Credential_details()}>
				<div slot="right" class="flex items-center gap-2">
					<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
						<Button href={`${$page.url.pathname}/edit`}>
							{m.Make_changes()}
							<Icon src={Pencil} ml></Icon>
						</Button>
					</ProtectedOrgUI>
				</div>
			</SectionTitle>

			<div class="space-y-8 font-medium">
				<div class="flex items-center gap-3 pb-1">
					<p>Logo:</p>
					<d-avatar name={service.display_name} src={service.logo} size="xl" shape="square" />
				</div>

				<p>
					{m.Credential_issuer()}:
					<span class="text-primary-700">{credential_issuer.endpoint}</span>
				</p>

				<p>
					{m.Authorization_server()}:
					<span class="text-primary-700">{authorization_server.endpoint}</span>
				</p>

				{#each microservicesTemplates as t}
					<div class="space-y-2">
						<p>
							{t.label}:
							<span class="text-primary-700">{t.name}</span>
						</p>
						<TemplateSchemaDisplay template={t.template}></TemplateSchemaDisplay>
					</div>
				{/each}
			</div>
		</PageCard>

		<PageCard class="w-[300px] shrink-0 !space-y-4 !p-4">
			<div class="flex flex-col items-center gap-2 self-stretch rounded-lg border bg-gray-50 p-4">
				<img src={issuanceFlowQr} alt={m.Service_Qr_Code()} class="w-40 rounded-lg" />
				<Button outline class="mt-4" size="sm" disabled>
					<span class="whitespace-nowrap">
						{m.Open_qr_code_in_new_page()}
					</span>
					<Icon src={ArrowTopRightOnSquare} ml></Icon>
				</Button>
			</div>

			<div class="mt-6 space-y-2">
				<Heading tag="h5">{m.issuance_flow_qr_code_title()}</Heading>
				<p class="text-gray-500">{m.issuance_flow_qr_code_description()}</p>
			</div>

			<div class="flex gap-4">
				<img
					alt="Didroom Wallet app logo"
					class="h-[100px] w-[100px] rounded-lg"
					src={`${assets}/app-didroom.svg`}
				/>
				<div class="space-y-2">
					<Button outline target="_blank" href="https://github.com/ForkbombEu/wallet/">
						{m.Github()}
						<Icon src={ArrowTopRightOnSquare} ml></Icon>
					</Button>
					<Button
						outline
						target="_blank"
						href="https://didroom.com/guides/Wallet/wallet.html"
					>
						{m.Help()}
						<Icon src={QuestionMarkCircle} ml></Icon>
					</Button>
				</div>
			</div>
		</PageCard>
	</div>
</PageContent>
