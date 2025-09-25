<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Collections } from '$lib/pocketbase/types';
	import { Alert, Button, Modal, Spinner } from 'flowbite-svelte';
	import { m } from '$lib/i18n';
	import OrganizationLayout from '$lib/components/organizationLayout.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import { ArrowDownTray, QuestionMarkCircle } from 'svelte-heros-v2';
	import Icon from '$lib/components/icon.svelte';
	import { ProtectedOrgUI } from '$lib/organizations';
	import PortalWrapper from '$lib/components/portalWrapper.svelte';
	import { getErrorMessage } from '$lib/errorHandling.js';
	import {
		generateCurlDownloadMicroservices,
		requestDownloadMicroservices
	} from '@api/download-microservices/index.js';
	import { dowloadResponseAsZip } from '$lib/utils/clientFileDownload.js';
	import MicroserviceCollectionManager from './_partials/microserviceCollectionManager.svelte';
	import IconButton from '$lib/components/iconButton.svelte';
	import CopyButton from '$lib/components/copyButton-2.svelte';

	//

	export let data;
	$: organization = data.organization;

	//

	let loading = false;
	let error: string | undefined = undefined;

	async function handleDownloadMicroservices() {
		error = undefined;
		loading = true;
		try {
			const response = await requestDownloadMicroservices(organization.id);
			if (!response.ok) throw new Error(response.statusText);
			dowloadResponseAsZip(response, 'microservices.zip');
		} catch (e) {
			error = getErrorMessage(e);
		}
		loading = false;
	}
</script>

<OrganizationLayout org={data.organization}>
	<div class="space-y-10">
		<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
			<PageCard class="flex flex-wrap items-center justify-between gap-4 !space-y-0 py-5">
				<p class="max-w-lg text-sm text-gray-500">{m.download_microservices_description()}</p>
				<div class="flex items-center gap-4">
					{#if error}
						<Alert title="Error" color="red" class="py-2" dismissable>{error}</Alert>
					{/if}
					<div class="flex items-center gap-1">
						<Button on:click={handleDownloadMicroservices}>
							<span class="flex flex-nowrap items-center gap-1">
								<span class="text-nowrap">{m.Download_microservices()}</span>
								<Icon src={ArrowDownTray} ml />
							</span>
						</Button>
						<CopyButton
							textToCopy={generateCurlDownloadMicroservices(organization.id)}
							buttonProps={{ outline: true, color: 'primary' }}
							iconSize={16}
						>
							{m.Download_via_curl()}
						</CopyButton>
						<IconButton
							icon={QuestionMarkCircle}
							href="https://didroom.com/guides/Sysadmin/deploy_microservices.html"
							target="_blank"
						/>
					</div>
				</div>
			</PageCard>
		</ProtectedOrgUI>

		<PageCard>
			<MicroserviceCollectionManager
				microserviceType={Collections.Issuers}
				organizationId={organization.id}
			/>
		</PageCard>

		<PageCard>
			<MicroserviceCollectionManager
				microserviceType={Collections.AuthorizationServers}
				organizationId={organization.id}
			/>
		</PageCard>

		<PageCard>
			<MicroserviceCollectionManager
				microserviceType={Collections.RelyingParties}
				organizationId={organization.id}
			/>
		</PageCard>
	</div>
</OrganizationLayout>

<PortalWrapper>
	<Modal open={loading} dismissable={false} class="w-fit">
		<div class="flex flex-col items-center justify-center text-sm">
			<Spinner />
			<p class="mt-4 font-bold">{m.Downloading_microservices()}</p>
			<p>{m.Please_wait()}</p>
		</div>
	</Modal>
</PortalWrapper>
